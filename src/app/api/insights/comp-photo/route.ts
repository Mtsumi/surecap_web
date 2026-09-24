import { NextRequest, NextResponse } from "next/server";
import { isAllowedCompPhotoUrl } from "@/lib/compPhotoHosts";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

const MAX_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const UPSTREAM_HEADERS = {
  Accept: "image/*,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (compatible; MontrealLivingInsights/1.0; +https://montrealliving.info)",
};

/**
 * Superadmin-only proxy for comp listing photos (Kijiji / Facebook CDN).
 * Same deployment as /api/insights — not a separate service.
 */
export async function GET(request: NextRequest) {
  const denied = await requireSuperAdmin(request);
  if (denied) return denied;

  const raw = request.nextUrl.searchParams.get("url")?.trim();
  if (!raw || !isAllowedCompPhotoUrl(raw)) {
    return NextResponse.json({ error: "Invalid or disallowed URL." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(raw, {
      headers: UPSTREAM_HEADERS,
      redirect: "follow",
      signal: controller.signal,
      cache: "force-cache",
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const len = upstream.headers.get("content-length");
    if (len && Number(len) > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large." }, { status: 413 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large." }, { status: 413 });
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not fetch image from listing CDN." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
