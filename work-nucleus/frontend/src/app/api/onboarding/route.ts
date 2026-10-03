import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("[Onboarding API] Session found:", !!session);

    let accessToken;
    try {
      const tokenObj = await auth0.getAccessToken();
      accessToken = tokenObj.token;
      console.log("[Onboarding API] Access token fetched. Length:", accessToken?.length);
    } catch (e: any) {
      console.error("[Onboarding API] getAccessToken error:", e);
      return NextResponse.json({ error: "getAccessToken error: " + e.message }, { status: 400 });
    }

    const body = await req.json();
    const apiUrl = getApiUrl();
    const payload = {
      ...body,
      email: session.user.email,
    };
    console.log("[Onboarding API] Sending to backend:", apiUrl, "with payload:", payload);

    const res = await fetch(`${apiUrl}/api/v1/auth/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("[Onboarding API] Backend responded with status:", res.status);
    
    const text = await res.text();
    console.log("[Onboarding API] Backend response text:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Provisioning failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Onboarding API] Catch-all error:", err);
    return NextResponse.json(
      { error: "Failed to provision organization: " + err.message },
      { status: 500 }
    );
  }
}
