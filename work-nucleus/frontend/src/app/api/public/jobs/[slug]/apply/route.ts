import { NextRequest, NextResponse } from "next/server";
import { forwardUpstreamResponse, getApiUrl, isValidId } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    if (!isValidId(params.slug)) {
      return NextResponse.json({ error: "Invalid job slug" }, { status: 400 });
    }
    const formData = await req.formData();

    const res = await fetch(
      `${getApiUrl()}/api/v1/public/jobs/${encodeURIComponent(params.slug)}/apply`,
      {
        method: "POST",
        body: formData,
      }
    );

    return forwardUpstreamResponse(res, "Failed to submit application");
  } catch {
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
