import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { forwardUpstreamResponse, getApiUrl, getProxyHeaders } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(`${getApiUrl()}/api/v1/resume-ranking/quick-rank`, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken, "application/json"),
      body: JSON.stringify(body),
    });
    return forwardUpstreamResponse(res, "Failed to rank resumes");
  } catch {
    return NextResponse.json({ error: "Failed to rank resumes" }, { status: 500 });
  }
}
