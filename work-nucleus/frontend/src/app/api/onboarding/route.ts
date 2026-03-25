import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const body = await req.json();
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/auth/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Provisioning failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to provision organization" },
      { status: 500 }
    );
  }
}
