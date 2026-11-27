import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl, getProxyHeaders } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(`${API_URL}/api/v1/resume-ranking/rank`, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken, "application/json"),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to rank resumes" }, { status: 500 });
  }
}
