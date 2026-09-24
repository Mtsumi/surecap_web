import { NextRequest, NextResponse } from "next/server";

/**
 * Returns an error response if the request is not from a verified superadmin;
 * otherwise null (caller may proceed).
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return null;
}
