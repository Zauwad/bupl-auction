import { NextResponse } from "next/server";

const DB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  "https://bupl-2027-auction-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function GET() {
  try {
    const [settingsRes, clubsRes, playersRes, segmentsRes, historyRes] =
      await Promise.all([
        fetch(`${DB_URL}/settings.json`, { next: { revalidate: 2 } }),
        fetch(`${DB_URL}/clubs.json`, { next: { revalidate: 2 } }),
        fetch(`${DB_URL}/players.json`, { next: { revalidate: 2 } }),
        fetch(`${DB_URL}/segments.json`, { next: { revalidate: 2 } }),
        fetch(`${DB_URL}/history.json`, { next: { revalidate: 2 } }),
      ]);

    const [settingsRaw, clubsRaw, playersRaw, segmentsRaw, historyRaw] =
      await Promise.all([
        settingsRes.json(),
        clubsRes.json(),
        playersRes.json(),
        segmentsRes.json(),
        historyRes.json(),
      ]);

    const payload = {
      settings: settingsRaw,
      clubs: clubsRaw,
      players: playersRaw,
      segments: segmentsRaw,
      history: historyRaw,
      timestamp: Date.now(),
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=2, stale-while-revalidate=4",
        "CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=4",
        "Vercel-CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=4",
      },
    });
  } catch (error) {
    console.error("Failed to fetch auction state from Firebase REST:", error);
    return NextResponse.json(
      { error: "Failed to fetch live auction state" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
