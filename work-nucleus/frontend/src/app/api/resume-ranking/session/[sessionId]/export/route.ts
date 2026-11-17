import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${API_URL}/api/v1/resume-ranking/session/${params.sessionId}/export/csv`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to export CSV" }, { status: res.status });
    }

    const csv = await res.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ranking-${params.sessionId.substring(0, 8)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
