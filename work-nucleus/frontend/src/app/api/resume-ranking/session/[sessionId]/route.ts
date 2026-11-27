import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getProxyHeaders,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    if (!isValidId(params.sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/resume-ranking/session/${encodeURIComponent(params.sessionId)}`,
      { headers: getProxyHeaders(req, accessToken) }
    );
    return forwardUpstreamResponse(res, "Failed to fetch ranking results");
  } catch {
    return NextResponse.json({ error: "Failed to fetch ranking results" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    if (!isValidId(params.sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(
      `${getApiUrl()}/api/v1/resume-ranking/re-rank/${encodeURIComponent(params.sessionId)}`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );
    return forwardUpstreamResponse(res, "Failed to re-rank");
  } catch {
    return NextResponse.json({ error: "Failed to re-rank" }, { status: 500 });
  }
}
