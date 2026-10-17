import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, {
      // No auth required for health check
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ status: "down", error: e.message }, { status: 503 });
  }
}
