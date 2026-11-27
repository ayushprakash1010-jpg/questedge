import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { forwardUpstreamResponse, getApiUrl, getProxyHeaders } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(`${getApiUrl()}/api/v1/candidates/trigger-scoring`, {
      method: "POST",
      headers: getProxyHeaders(req, accessToken),
    });
    return forwardUpstreamResponse(res, "Failed to trigger scoring");
  } catch {
    return NextResponse.json(
      { error: "Failed to trigger scoring" },
      { status: 500 }
    );
  }
}
