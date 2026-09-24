import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

/**
 * Server-side proxy to the scraper's /api/listings/insights/ endpoint.
 *
 * Auth: requires a valid superadmin Bearer token (same token used by the
 * admin UI). The token is verified against the main API before forwarding.
 * This prevents unauthenticated callers from fetching insights by hitting
 * the route directly, even though the data is low-sensitivity market info.
 */
export async function GET(request: NextRequest) {
  const denied = await requireSuperAdmin(request);
  if (denied) return denied;

  // Forward to the scraper
  const scraperUrl = process.env.SCRAPER_URL;
  if (!scraperUrl) {
    return NextResponse.json(
      { error: "SCRAPER_URL not configured on this deployment." },
      { status: 500 }
    );
  }

  try {
    const upstream = new URL(`${scraperUrl}/api/listings/insights/`);
    const building = request.nextUrl.searchParams.get("building");
    if (building) upstream.searchParams.set("building", building);
    const res = await fetch(upstream.toString(), {
      next: { revalidate: building ? 0 : 300 },
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
