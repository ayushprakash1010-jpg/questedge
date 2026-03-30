import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/jobs/${params.slug}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
