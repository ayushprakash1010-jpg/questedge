import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token } = await auth0.getAccessToken();
    const url = new URL(req.url);
    const res = await fetch(`${API_URL}/api/v1/support/users/export${url.search}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || "Export failed" }, { status: res.status });
    }
    const csv = await res.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": res.headers.get("Content-Disposition") || 'attachment; filename="users-export.csv"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
