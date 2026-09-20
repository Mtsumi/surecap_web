import { NextRequest, NextResponse } from "next/server";

/**
 * Triggers an on-demand scrape for all buildings via the scraper's
 * /api/listings/run_all_buildings/ endpoint.
 * Requires a valid superadmin Bearer token (same check as /api/insights).
 */
export async function POST(request: NextRequest) {
  // Verify superadmin
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const meRes = await fetch(`${apiUrl}/admin/auth/me`, {
      headers: { Authorization: auth },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const me = await meRes.json();
    const user = me?.data ?? me;
    if (!user?.is_super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Could not verify credentials." }, { status: 502 });
  }

  // Forward to scraper
  const scraperUrl = process.env.SCRAPER_URL;
  if (!scraperUrl) {
    return NextResponse.json({ error: "SCRAPER_URL not configured." }, { status: 500 });
  }
  try {
    const res = await fetch(`${scraperUrl}/api/listings/run_all_buildings/`, {
      method: "POST",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the scraper server." },
      { status: 502 }
    );
  }
}
