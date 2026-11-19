/**
 * CSV import parsing + row validation for the players bulk import.
 * Pure functions — no Firebase imports — so they are trivially testable.
 *
 * Expected header (case-insensitive, extra columns ignored):
 *   name,basePrice,segment,department,academicYear,category,photoUrl
 * Only name, basePrice and segment are required.
 */
import Papa from "papaparse";
import { SEGMENT_COUNT } from "@/lib/constants";
import { PLAYER_IMAGES } from "@/lib/images";

export interface CsvPlayerRow {
  name: string;
  basePrice: number;
  segment: number;
  department?: string;
  academicYear?: string;
  category?: string;
  photoUrl?: string;
}

export interface CsvRowError {
  /** 1-based row number among data rows (header excluded). */
  row: number;
  column?: string;
  message: string;
}

export interface CsvParseResult {
  rows: CsvPlayerRow[];
  errors: CsvRowError[];
  /** Non-blocking notes shown to the admin (e.g. duplicate names). */
  warnings: string[];
  totalDataRows: number;
}

const MAX_NAME = 120;
const MAX_DEPARTMENT = 120;
const MAX_YEAR = 40;
const MAX_CATEGORY = 80;
const MAX_PRICE = 10_000_000;
const STATIC_PHOTO_PREFIX = "/images/players/";
const KNOWN_COLUMNS = new Set([
  "name",
  "baseprice",
  "segment",
  "department",
  "academicyear",
  "category",
  "photourl",
]);

const staticPhotoSet = new Set(PLAYER_IMAGES);

function validatePhotoUrl(raw: string, row: number, errors: CsvRowError[]): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith(STATIC_PHOTO_PREFIX)) {
    if (!staticPhotoSet.has(value)) {
      errors.push({
        row,
        column: "photoUrl",
        message: `"${value}" is not in public/images/players/. Add the file and redeploy, or use a hosted URL.`,
      });
      return undefined;
    }
    return value;
  }
  if (/^https?:\/\/.+/i.test(value)) return value; // hosted escape hatch (e.g. emergency photo)
  errors.push({
    row,
    column: "photoUrl",
    message: "photoUrl must be /images/players/<file> or an https:// URL — or leave it empty.",
  });
  return undefined;
}

const bounded = (v: string) => v.trim().length <= MAX_DEPARTMENT;

/** Parse and validate a CSV file's text. Invalid rows are reported, never silently fixed. */
export function parsePlayersCsv(text: string): CsvParseResult {
  const errors: CsvRowError[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const fatal = parsed.errors.filter((e) => e.type === "Delimiter" || e.type === "Quotes");
  for (const error of fatal) {
    errors.push({ row: (error.row ?? 0) + 1, message: error.message });
  }

  const headers = (parsed.meta.fields ?? []).map((h) => h.trim().toLowerCase());
  if (!headers.includes("name") || !headers.includes("baseprice") || !headers.includes("segment")) {
    errors.push({
      row: 0,
      message: 'Missing required column(s). Expected header: name,basePrice,segment (optional: department,academicYear,category,photoUrl).',
    });
  }
  const unknownHeaders = headers.filter((h) => h && !KNOWN_COLUMNS.has(h));
  if (unknownHeaders.length > 0) {
    errors.push({
      row: 0,
      message: `Ignored unknown column(s): ${unknownHeaders.join(", ")}.`,
    });
  }

  const rows: CsvPlayerRow[] = [];
  parsed.data.forEach((raw, index) => {
    const row = index + 1;
    const before = errors.length;

    const name = (raw.name ?? "").trim();
    if (name.length < 2) {
      errors.push({ row, column: "name", message: "Name must be at least 2 characters." });
    } else if (name.length > MAX_NAME) {
      errors.push({ row, column: "name", message: `Name too long (max ${MAX_NAME}).` });
    }

    const priceRaw = (raw.baseprice ?? "").trim();
    const price = Number(priceRaw);
    if (priceRaw === "" || !Number.isFinite(price) || !Number.isInteger(price) || price < 0) {
      errors.push({ row, column: "basePrice", message: "basePrice must be a whole number ≥ 0." });
    } else if (price > MAX_PRICE) {
      errors.push({ row, column: "basePrice", message: `basePrice cannot exceed ${MAX_PRICE}.` });
    }

    const segmentRaw = (raw.segment ?? "").trim();
    const segment = Number(segmentRaw);
    if (segmentRaw === "" || !Number.isInteger(segment) || segment < 1 || segment > SEGMENT_COUNT) {
      errors.push({ row, column: "segment", message: `segment must be an integer between 1 and ${SEGMENT_COUNT}.` });
    }

    const department = (raw.department ?? "").trim() || undefined;
    if (department && !bounded(department)) {
      errors.push({ row, column: "department", message: `department too long (max ${MAX_DEPARTMENT}).` });
    }
    const academicYear = (raw.academicyear ?? "").trim() || undefined;
    if (academicYear && academicYear.length > MAX_YEAR) {
      errors.push({ row, column: "academicYear", message: `academicYear too long (max ${MAX_YEAR}).` });
    }
    const category = (raw.category ?? "").trim() || undefined;
    if (category && category.length > MAX_CATEGORY) {
      errors.push({ row, column: "category", message: `category too long (max ${MAX_CATEGORY}).` });
    }

    const photoUrl = validatePhotoUrl(raw.photourl ?? "", row, errors);

    // Row is only kept if it produced no *row-specific* errors.
    const rowErrors = errors.slice(before).filter((e) => e.row === row);
    if (rowErrors.length === 0) {
      rows.push({
        name,
        basePrice: price,
        segment,
        department,
        academicYear,
        category,
        photoUrl,
      });
    }
  });

  // Non-blocking duplicate detection (same normalized name within a segment)
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  rows.forEach((row, index) => {
    const key = `${row.segment}::${row.name.trim().toLowerCase()}`;
    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      warnings.push(`“${row.name}” appears more than once in segment ${row.segment} — all copies will be imported.`);
    } else {
      seen.set(key, index);
    }
  });

  return { rows, errors, warnings, totalDataRows: parsed.data.length };
}

export const CSV_TEMPLATE_HEADER =
  "name,basePrice,segment,department,academicYear,category,photoUrl";

export const CSV_TEMPLATE_BODY = [
  "Rakib Hasan,10000,1,CSE,3rd Year,Batsman,",
  "Nila Ahmed,8000,1,BBA,2nd Year,Bowler,",
  "Tanvir Islam,15000,2,EEE,Graduate,All-rounder,",
].join("\n");

export function buildCsvTemplate(): string {
  return `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_BODY}\n`;
}
