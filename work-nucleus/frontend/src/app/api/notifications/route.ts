import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const type = req.nextUrl.searchParams.get("type");
    let endpoint = `${API_URL}/api/v1/notifications`;

    if (type === "unread-count") {
      endpoint += "/unread-count";
    } else {
      const params = new URLSearchParams();
      const page = req.nextUrl.searchParams.get("page");
      const unreadOnly = req.nextUrl.searchParams.get("unreadOnly");
      if (page) params.set("page", page);
      if (unreadOnly) params.set("unreadOnly", unreadOnly);
      if (params.toString()) endpoint += `?${params}`;
    }

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { token: accessToken } = await auth0.getAccessToken();

    const action = req.nextUrl.searchParams.get("action");
    let endpoint = `${API_URL}/api/v1/notifications`;
    let body: string | undefined;

    if (action === "mark-all-read") {
      endpoint += "/mark-all-read";
    } else if (action === "mark-read") {
      endpoint += "/mark-read";
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
