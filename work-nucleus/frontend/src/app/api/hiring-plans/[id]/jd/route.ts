import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getProxyHeaders,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

// GET /api/hiring-plans/:id/jd — get latest JD
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const url = new URL(req.url);
    const versions = url.searchParams.get("versions");
    const planId = encodeURIComponent(params.id);

    const endpoint = versions === "true"
      ? `${getApiUrl()}/api/v1/hiring-plans/${planId}/jd/versions`
      : `${getApiUrl()}/api/v1/hiring-plans/${planId}/jd/latest`;

    const res = await fetch(endpoint, {
      headers: getProxyHeaders(req, accessToken),
      cache: "no-store",
    });

    if (res.status === 204) {
      return NextResponse.json(null, { status: 200 });
    }
    if (res.status === 404) {
      return NextResponse.json(null, { status: 200 });
    }

    return forwardUpstreamResponse(res, "Failed to fetch JD");
  } catch {
    return NextResponse.json({ error: "Failed to fetch JD" }, { status: 500 });
  }
}

// POST /api/hiring-plans/:id/jd — generate JD with AI
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/jd/generate`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );

    return forwardUpstreamResponse(res, "Failed to generate JD");
  } catch {
    return NextResponse.json({ error: "Failed to generate JD" }, { status: 500 });
  }
}

// PATCH /api/hiring-plans/:id/jd — update JD (uses jdId from body)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();
    const { jdId, ...updateData } = body;
    if (!isValidId(jdId)) {
      return NextResponse.json({ error: "Invalid jdId" }, { status: 400 });
    }

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/jd/${encodeURIComponent(jdId)}`,
      {
        method: "PATCH",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(updateData),
      }
    );

    return forwardUpstreamResponse(res, "Failed to update JD");
  } catch {
    return NextResponse.json({ error: "Failed to update JD" }, { status: 500 });
  }
}

// PUT /api/hiring-plans/:id/jd — approve JD (uses jdId from body)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();
    const { jdId } = body;
    if (!isValidId(jdId)) {
      return NextResponse.json({ error: "Invalid jdId" }, { status: 400 });
    }

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/jd/${encodeURIComponent(jdId)}/approve`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken),
      }
    );

    return forwardUpstreamResponse(res, "Failed to approve JD");
  } catch {
    return NextResponse.json({ error: "Failed to approve JD" }, { status: 500 });
  }
}
