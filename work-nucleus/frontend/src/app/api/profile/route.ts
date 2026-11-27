import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl, getDemoRoleHeader } from "@/lib/api-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    const apiUrl = getApiUrl();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...getDemoRoleHeader(req, { inferReferer: false }),
    };
    if (session.user?.email) {
      headers["X-User-Email"] = session.user.email;
    }
    if (session.user?.name) {
      headers["X-User-Name"] = session.user.name;
    }

    const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[API /profile] Backend returned ${res.status} from ${apiUrl}/api/v1/auth/me:`, text);
      return NextResponse.json(
        { error: "Failed to load profile", status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Unexpected upstream response format" },
        { status: 502 }
      );
    }
    const email =
      !data.email || data.email.includes("@placeholder.com")
        ? session.user?.email || data.email
        : data.email;
    const name = data.name || session.user?.name;

    return NextResponse.json({ ...data, email, name });
  } catch (err: any) {
    console.error("[API /profile] Failed to connect to backend:", err?.message);
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 500 }
    );
  }
}