import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

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

    const endpoint = `${API_URL}/api/v1/analytics/${type}${params.toString() ? `?${params}` : ""}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/analytics — generate and persist AI insights
export async function POST() {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(`${API_URL}/api/v1/analytics/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    // Response shape: { insights, generatedAt, generatedBy }
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
