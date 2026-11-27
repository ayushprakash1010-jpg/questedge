import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getProxyHeaders,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidId(params.id)) {
      return NextResponse.json({ error: "Invalid hiring plan ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(
      `${getApiUrl()}/api/v1/hiring-plans/${encodeURIComponent(params.id)}/clone`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken),
      }
    );

    return forwardUpstreamResponse(res, "Failed to clone hiring plan");
  } catch {
    return NextResponse.json({ error: "Failed to clone hiring plan" }, { status: 500 });
  }
}
