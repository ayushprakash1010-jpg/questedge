import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { token } = await auth0.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (session.user?.email) {
      headers["X-User-Email"] = session.user.email;
    }
    if (session.user?.name) {
      headers["X-User-Name"] = session.user.name;
    }

    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers,
    });
    const profile = await res.json();
    const email =
      !profile.email || profile.email.includes("@placeholder.com")
        ? session.user?.email || profile.email
        : profile.email;
    const name = profile.name || session.user?.name;

    return NextResponse.json({ ...profile, email, name }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
