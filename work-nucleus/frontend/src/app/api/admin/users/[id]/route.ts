import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getDemoRoleHeader,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(
      `${getApiUrl()}/api/v1/admin/users/${encodeURIComponent(params.id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...getDemoRoleHeader(req),
        },
        body: JSON.stringify(body),
      },
    );

    return forwardUpstreamResponse(res, "Failed to update user");
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/admin/users/${encodeURIComponent(params.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, ...getDemoRoleHeader(req) },
      },
    );

    return forwardUpstreamResponse(res, "Failed to delete user");
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
