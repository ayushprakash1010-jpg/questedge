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
      `${API_URL}/api/v1/resume-ranking/session/${params.sessionId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch ranking results" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(
      `${API_URL}/api/v1/resume-ranking/re-rank/${params.sessionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to re-rank" }, { status: 500 });
  }
}
