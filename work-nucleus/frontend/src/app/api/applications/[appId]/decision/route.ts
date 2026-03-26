import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(`${API_URL}/api/v1/applications/${params.appId}/decision`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: make decision, approve, or mark sent
export async function POST(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const action = req.nextUrl.searchParams.get("action");
    let endpoint = `${API_URL}/api/v1/applications/${params.appId}/decision`;
    let body: string | undefined;

    if (action === "approve") {
      endpoint += "/approve";
    } else if (action === "send") {
      endpoint += "/send";
    } else {
      body = JSON.stringify(await req.json());
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      ...(body ? { body } : {}),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: update communication draft
export async function PATCH(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();

    const res = await fetch(`${API_URL}/api/v1/applications/${params.appId}/decision/communication`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
