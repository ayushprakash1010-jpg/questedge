import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

export const dynamic = "force-dynamic";

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
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[API /profile] Backend returned ${res.status} from ${apiUrl}/api/v1/auth/me:`, text);
      return NextResponse.json(
        { error: "Backend error", status: res.status, apiUrl, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    const apiUrl = getApiUrl();
    console.error(`[API /profile] Failed to connect to backend at ${apiUrl}:`, err);
    return NextResponse.json(
      { error: "Failed to connect to backend", apiUrl, details: err?.message },
      { status: 500 }
    );
  }
}
