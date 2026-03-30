import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const formData = await req.formData();

    const res = await fetch(
      `${API_URL}/api/v1/public/jobs/${params.slug}/apply`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
