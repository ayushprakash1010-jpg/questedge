import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const API_URL = getApiUrl();
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: "down", error: e?.message || "Health check failed" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }
}
