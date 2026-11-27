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
  { params }: { params: { appId: string } }
) {
  try {
    if (!isValidId(params.appId)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}`,
      { headers: getProxyHeaders(req, accessToken) }
    );
    return forwardUpstreamResponse(res, "Failed to fetch application");
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    if (!isValidId(params.appId)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    // Move candidate
    const res = await fetch(
      `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}/move`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );
    return forwardUpstreamResponse(res, "Failed to move application");
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    if (!isValidId(params.appId)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    // Update status
    const res = await fetch(
      `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}/status`,
      {
        method: "PATCH",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );
    return forwardUpstreamResponse(res, "Failed to update application status");
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
