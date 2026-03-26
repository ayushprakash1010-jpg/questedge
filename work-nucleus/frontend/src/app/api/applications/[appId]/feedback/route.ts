import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

// GET /api/applications/:appId/feedback — get all feedback for application
// GET /api/applications/:appId/feedback?matrix=true — get skill matrix
export async function GET(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const isMatrix = req.nextUrl.searchParams.get("matrix") === "true";
    const endpoint = isMatrix
      ? `${API_URL}/api/v1/applications/${params.appId}/feedback/matrix`
      : `${API_URL}/api/v1/applications/${params.appId}/feedback`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
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
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const action = req.nextUrl.searchParams.get("action");

    let endpoint: string;
    let body: string | undefined;

    if (action === "summarize") {
      endpoint = `${API_URL}/api/v1/applications/${params.appId}/feedback/summarize`;
    } else if (action === "score") {
      endpoint = `${API_URL}/api/v1/applications/${params.appId}/score`;
    } else if (action === "submit") {
      const feedbackId = req.nextUrl.searchParams.get("feedbackId");
      endpoint = `${API_URL}/api/v1/feedback/${feedbackId}/submit`;
    } else {
      endpoint = `${API_URL}/api/v1/applications/${params.appId}/feedback`;
      body = JSON.stringify(await req.json());
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      ...(body ? { body } : {}),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
