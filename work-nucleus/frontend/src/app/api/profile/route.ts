import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
