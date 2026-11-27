import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getDemoRoleHeader,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

const ALLOWED_ANALYTICS_TYPES = new Set([
  "overview",
  "funnel",
  "time-to-hire",
  "cost",
  "interviewers",
  "progress",
  "sources",
  "insights",
]);

// GET /api/analytics?type=overview|funnel|time-to-hire|cost|interviewers|progress|sources
export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const type = req.nextUrl.searchParams.get("type") || "overview";
    if (!ALLOWED_ANALYTICS_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid analytics type" }, { status: 400 });
    }

    const params = new URLSearchParams();

    // Forward query params
    const hiringPlanId = req.nextUrl.searchParams.get("hiringPlanId");
    const groupBy = req.nextUrl.searchParams.get("groupBy");
    if (hiringPlanId) params.set("hiringPlanId", hiringPlanId);
    if (groupBy) params.set("groupBy", groupBy);

    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/v1/analytics/${type}${params.toString() ? `?${params}` : ""}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}`, ...getDemoRoleHeader(req) },
      cache: "no-store",
    });

    return forwardUpstreamResponse(res, "Failed to load analytics");
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to backend analytics" },
      { status: 500 },
    );
  }
}

// POST /api/analytics — generate and persist AI insights
export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/analytics/insights`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...getDemoRoleHeader(req),
      },
    });
    return forwardUpstreamResponse(res, "Failed to generate insights");
  } catch {
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
}
