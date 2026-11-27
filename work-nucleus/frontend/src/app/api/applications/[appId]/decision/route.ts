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
      `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}/decision`,
      { headers: getProxyHeaders(req, accessToken) }
    );
    return forwardUpstreamResponse(res, "Failed to fetch decision");
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: make decision, approve, or mark sent
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

    const action = req.nextUrl.searchParams.get("action");
    let endpoint = `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}/decision`;
    let body: string | undefined;

    if (action === "approve") {
      endpoint += "/approve";
    } else if (action === "send") {
      endpoint += "/send";
    } else {
      body = JSON.stringify(await req.json());
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: getProxyHeaders(
        req,
        accessToken,
        body ? "application/json" : undefined
      ),
      ...(body ? { body } : {}),
    });
    return forwardUpstreamResponse(res, "Failed to process decision");
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: update communication draft
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

    const res = await fetch(
      `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}/decision/communication`,
      {
        method: "PATCH",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );
    return forwardUpstreamResponse(res, "Failed to update communication draft");
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
