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
  { params }: { params: { mandateId: string } }
) {
  try {
    if (!isValidId(params.mandateId)) {
      return NextResponse.json({ error: "Invalid mandate ID" }, { status: 400 });
    }
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const url = new URL(req.url);
    const res = await fetch(
      `${getApiUrl()}/api/v1/resume-ranking/sessions/${encodeURIComponent(params.mandateId)}?${url.searchParams.toString()}`,
      {
        headers: getProxyHeaders(req, accessToken),
      }
    );
    return forwardUpstreamResponse(res, "Failed to fetch ranking sessions");
  } catch {
    return NextResponse.json({ error: "Failed to fetch ranking sessions" }, { status: 500 });
  }
}
