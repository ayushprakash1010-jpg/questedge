import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

export const dynamic = "force-dynamic";

// GET /api/analytics?type=overview|funnel|time-to-hire|cost|interviewers|progress|sources
export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const type = req.nextUrl.searchParams.get("type") || "overview";
    const params = new URLSearchParams();

    // Forward query params
    const hiringPlanId = req.nextUrl.searchParams.get("hiringPlanId");
    const groupBy = req.nextUrl.searchParams.get("groupBy");
    if (hiringPlanId) params.set("hiringPlanId", hiringPlanId);
    if (groupBy) params.set("groupBy", groupBy);

    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/v1/analytics/${type}${params.toString() ? `?${params}` : ""}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Backend analytics error (${res.status})`, endpoint, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to connect to backend analytics", apiUrl: getApiUrl(), details: err?.message },
      { status: 500 }
    );
  }
}

// POST /api/analytics — generate and persist AI insights
export async function POST() {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/analytics/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate insights: " + err?.message },
      { status: 500 }
    );
  }
}
