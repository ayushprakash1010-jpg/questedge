import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

// GET /api/support/audit-log/export -> streams CSV from backend
export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token } = await auth0.getAccessToken();
    const url = new URL(req.url);
    const res = await fetch(`${API_URL}/api/v1/support/audit-log/export${url.search}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const csv = await res.text();
    return new NextResponse(csv, {
      status: res.status,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": res.headers.get("Content-Disposition") || 'attachment; filename="audit-log-export.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
