import { NextResponse } from "next/server";

/**
 * Server-side proxy to the scraper's /api/listings/insights/ endpoint.
 * Avoids CORS — the scraper URL is a server-only env var.
 * Responses are cached for 5 minutes (ISR-style revalidation).
 */
export async function GET() {
  const scraperUrl = process.env.SCRAPER_URL;
  if (!scraperUrl) {
    return NextResponse.json(
      { error: "SCRAPER_URL not configured on this deployment." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${scraperUrl}/api/listings/insights/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Scraper returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the scraper server. Is it running?" },
      { status: 502 }
    );
  }
}
