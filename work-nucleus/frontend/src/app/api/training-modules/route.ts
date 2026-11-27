import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  forwardUpstreamResponse,
  getApiUrl,
  getDemoRoleHeader,
  isValidId,
} from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(`${getApiUrl()}/api/v1/training-modules`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...getDemoRoleHeader(req) },
      cache: "no-store",
    });
    return forwardUpstreamResponse(res, "Failed to load training modules");
  } catch {
    return NextResponse.json({ error: "Failed to load training modules" }, { status: 500 });
  }
}

// POST: create module, seed defaults, or mark complete
export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const action = req.nextUrl.searchParams.get("action");
    let endpoint = `${getApiUrl()}/api/v1/training-modules`;
    let body: string | undefined;

    if (action === "seed") {
      endpoint += "/seed-defaults";
    } else if (action === "complete") {
      const moduleId = req.nextUrl.searchParams.get("moduleId");
      if (!isValidId(moduleId)) {
        return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
      }
      endpoint += `/${encodeURIComponent(moduleId)}/complete`;
    } else {
      body = JSON.stringify(await req.json());
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${accessToken}`,
        ...getDemoRoleHeader(req),
      },
      ...(body ? { body } : {}),
    });
    return forwardUpstreamResponse(res, "Training module action failed");
  } catch {
    return NextResponse.json({ error: "Training module action failed" }, { status: 500 });
  }
}
