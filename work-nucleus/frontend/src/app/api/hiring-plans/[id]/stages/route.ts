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
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/stages`,
      { headers: getProxyHeaders(req, accessToken), cache: "no-store" },
    );
    return forwardUpstreamResponse(res, "Failed to fetch stages");
  } catch {
    return NextResponse.json({ error: "Failed to fetch stages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    // Check for special actions
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const apiUrl = getApiUrl();
    const planId = encodeURIComponent(params.id);

    let endpoint = `${apiUrl}/api/v1/hiring-plans/${planId}/stages`;
    if (action === "default-template") {
      endpoint = `${apiUrl}/api/v1/hiring-plans/${planId}/stages/default-template`;
    } else if (action === "reorder") {
      const res = await fetch(`${apiUrl}/api/v1/hiring-plans/${planId}/stages/reorder`, {
        method: "PATCH",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      });
      return forwardUpstreamResponse(res, "Failed to reorder stages");
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken, "application/json"),
      body: JSON.stringify(body),
    });
    return forwardUpstreamResponse(res, "Failed to update stages");
  } catch {
    return NextResponse.json({ error: "Failed to update stages" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();
    const { stageId, ...updateData } = body;
    if (!isValidId(stageId)) {
      return NextResponse.json({ error: "Invalid stageId" }, { status: 400 });
    }

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/stages/${encodeURIComponent(stageId)}`,
      {
        method: "PATCH",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(updateData),
      },
    );
    return forwardUpstreamResponse(res, "Failed to update stage");
  } catch {
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json().catch(() => ({}));
    const stageId = req.nextUrl.searchParams.get("stageId") || body?.stageId;
    if (!isValidId(stageId)) {
      return NextResponse.json({ error: "Invalid stageId" }, { status: 400 });
    }

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/stages/${encodeURIComponent(stageId)}`,
      {
        method: "DELETE",
        headers: getProxyHeaders(req, accessToken),
      },
    );
    return forwardUpstreamResponse(res, "Failed to delete stage");
  } catch {
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 });
  }
}
