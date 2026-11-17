import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: { mandateId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const url = new URL(req.url);
    const res = await fetch(
      `${API_URL}/api/v1/resume-ranking/sessions/${params.mandateId}?${url.searchParams.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch ranking sessions" }, { status: 500 });
  }
}
