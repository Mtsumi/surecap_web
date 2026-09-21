import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to the scraper's /api/listings/insights/ endpoint.
 *
 * Auth: requires a valid superadmin Bearer token (same token used by the
 * admin UI). The token is verified against the main API before forwarding.
 * This prevents unauthenticated callers from fetching insights by hitting
 * the route directly, even though the data is low-sensitivity market info.
 */
export async function GET(request: NextRequest) {
  // 1 — Require a Bearer token in the request
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2 — Verify token and superadmin role against the main API
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const meRes = await fetch(`${apiUrl}/admin/auth/me`, {
      headers: { Authorization: auth },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const me = await meRes.json();
    // Response is wrapped: { status, data: AdminUser } or plain AdminUser
    const user = me?.data ?? me;
    if (!user?.is_super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json(
      { error: "Could not verify credentials." },
      { status: 502 }
    );
  }

  // 3 — Forward to the scraper
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
      next: { revalidate: 0 },
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
