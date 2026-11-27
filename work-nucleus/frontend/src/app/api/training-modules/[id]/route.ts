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
      return NextResponse.json({ error: "Invalid training module ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/training-modules/${encodeURIComponent(params.id)}`,
      { headers: getProxyHeaders(req, accessToken) }
    );
    return forwardUpstreamResponse(res, "Failed to load training module");
  } catch {
    return NextResponse.json({ error: "Failed to load training module" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid training module ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(
      `${getApiUrl()}/api/v1/training-modules/${encodeURIComponent(params.id)}`,
      {
        method: "PATCH",
        headers: getProxyHeaders(req, accessToken, "application/json"),
        body: JSON.stringify(body),
      }
    );
    return forwardUpstreamResponse(res, "Failed to update training module");
  } catch {
    return NextResponse.json({ error: "Failed to update training module" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid training module ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/training-modules/${encodeURIComponent(params.id)}`,
      {
        method: "DELETE",
        headers: getProxyHeaders(req, accessToken),
      }
    );
    return forwardUpstreamResponse(res, "Failed to delete training module");
  } catch {
    return NextResponse.json({ error: "Failed to delete training module" }, { status: 500 });
  }
}
