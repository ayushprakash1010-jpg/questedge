import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getProxyHeaders,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

    const res = await fetch(
      `${getApiUrl()}/api/v1/applications/${encodeURIComponent(params.appId)}/generate-questions`,
      {
        method: "POST",
        headers: getProxyHeaders(req, accessToken),
        signal: AbortSignal.timeout(25_000),
      }
    );

    return forwardUpstreamResponse(res, "Failed to generate interview questions");
  } catch {
    return NextResponse.json(
      { error: "Failed to generate interview questions" },
      { status: 500 }
    );
  }
}
