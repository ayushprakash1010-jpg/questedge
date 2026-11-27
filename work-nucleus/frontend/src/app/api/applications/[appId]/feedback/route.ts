import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getProxyHeaders,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

// GET /api/applications/:appId/feedback — get all feedback for application
// GET /api/applications/:appId/feedback?matrix=true — get skill matrix
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

    const appId = encodeURIComponent(params.appId);
    const isMatrix = req.nextUrl.searchParams.get("matrix") === "true";
    const endpoint = isMatrix
      ? `${getApiUrl()}/api/v1/applications/${appId}/feedback/matrix`
      : `${getApiUrl()}/api/v1/applications/${appId}/feedback`;

    const res = await fetch(endpoint, {
      headers: getProxyHeaders(req, accessToken),
      cache: "no-store",
    });
    return forwardUpstreamResponse(res, "Failed to fetch feedback");
  } catch {
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

// POST /api/applications/:appId/feedback — create/update draft
// POST /api/applications/:appId/feedback?action=summarize — trigger AI summary
// POST /api/applications/:appId/feedback?action=score — trigger AI scoring
// POST /api/applications/:appId/feedback?action=submit&feedbackId=xxx — submit feedback
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

    const apiUrl = getApiUrl();
    const appId = encodeURIComponent(params.appId);
    const action = req.nextUrl.searchParams.get("action");

    let endpoint: string;
    let body: string | undefined;

    if (action === "summarize") {
      endpoint = `${apiUrl}/api/v1/applications/${appId}/feedback/summarize`;
    } else if (action === "score") {
      endpoint = `${apiUrl}/api/v1/applications/${appId}/score`;
    } else if (action === "submit") {
      const feedbackId = req.nextUrl.searchParams.get("feedbackId");
      if (!isValidId(feedbackId) || feedbackId === "null" || feedbackId === "undefined") {
        return NextResponse.json({ error: "Invalid feedbackId" }, { status: 400 });
      }
      endpoint = `${apiUrl}/api/v1/feedback/${encodeURIComponent(feedbackId)}/submit`;
    } else {
      endpoint = `${apiUrl}/api/v1/applications/${appId}/feedback`;
      body = JSON.stringify(await req.json());
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken, body ? "application/json" : undefined),
      ...(body ? { body } : {}),
    });
    return forwardUpstreamResponse(res, "Failed to process feedback");
  } catch {
    return NextResponse.json({ error: "Failed to process feedback" }, { status: 500 });
  }
}
