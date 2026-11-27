import { NextRequest, NextResponse } from "next/server";
import { forwardUpstreamResponse, getApiUrl, isValidId } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    if (!isValidId(params.slug)) {
      return NextResponse.json({ error: "Invalid job slug" }, { status: 400 });
    }
    const res = await fetch(
      `${getApiUrl()}/api/v1/public/jobs/${encodeURIComponent(params.slug)}`,
      { cache: "no-store" },
    );
    return forwardUpstreamResponse(res, "Failed to fetch job");
  } catch {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
