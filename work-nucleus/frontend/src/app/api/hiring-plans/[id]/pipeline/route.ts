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
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid hiring plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const url = new URL(req.url);
    const stats = url.searchParams.get("stats");
    const planId = encodeURIComponent(params.id);

    const endpoint = stats === "true"
      ? `${getApiUrl()}/api/v1/hiring-plans/${planId}/pipeline/stats`
      : `${getApiUrl()}/api/v1/hiring-plans/${planId}/pipeline`;

    const res = await fetch(endpoint, {
      headers: getProxyHeaders(req, accessToken),
    });
    return forwardUpstreamResponse(res, "Failed to fetch pipeline");
  } catch {
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid hiring plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/pipeline/add`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );
    return forwardUpstreamResponse(res, "Failed to add candidate");
  } catch {
    return NextResponse.json({ error: "Failed to add candidate" }, { status: 500 });
  }
}
