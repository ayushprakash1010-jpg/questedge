import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { forwardUpstreamResponse, getApiUrl, getProxyHeaders } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const url = new URL(req.url);
    const res = await fetch(
      `${getApiUrl()}/api/v1/candidates?${url.searchParams.toString()}`,
      { headers: getProxyHeaders(req, accessToken) }
    );
    return forwardUpstreamResponse(res, "Failed to fetch candidates");
  } catch {
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(`${getApiUrl()}/api/v1/candidates`, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken, "application/json"),
      body: JSON.stringify(body),
    });
    return forwardUpstreamResponse(res, "Failed to create candidate");
  } catch {
    return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}
