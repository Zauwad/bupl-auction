/** Deterministic per-club accent hue (no colors in the schema — derive from name). */
export function clubAccent(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360} 70% 55%)`;
}

/** Sorted list of clubs for consistent display order — by abbreviation then name. */
export function byAbbreviation(a: { abbreviation?: string; name: string }, b: { abbreviation?: string; name: string }): number {
  const left = (a.abbreviation ?? a.name).toUpperCase();
  const right = (b.abbreviation ?? b.name).toUpperCase();
  return left.localeCompare(right);
}
