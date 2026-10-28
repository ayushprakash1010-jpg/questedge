import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";
import { isMockMode, handleMockRequest } from "@/lib/mock/router";

const API_URL = getApiUrl();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();

  if (isMockMode()) {
    const mock = handleMockRequest(
      "PATCH",
      `/api/support/bypass-flags/${params.id}/resolve`,
      req.nextUrl.searchParams,
      body,
    );
    if (mock) return mock;
  }

  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token } = await auth0.getAccessToken();
    const res = await fetch(`${API_URL}/api/v1/support/bypass-flags/${params.id}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to resolve bypass flag" }, { status: 500 });
  }
}
