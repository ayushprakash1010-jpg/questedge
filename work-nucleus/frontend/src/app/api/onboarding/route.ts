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
    const role = body.role || (body.orgName ? "company" : undefined);

    let targetEndpoint = `${apiUrl}/api/v1/auth/provision`;
    let payload: any = {};

    if (role === "recruiter") {
      targetEndpoint = `${apiUrl}/api/v1/recruiter/profile`;
      payload = {
        name: body.name || session.user.name || "Recruiter",
        phone: body.phone || undefined,
        headline: body.headline || undefined,
        specializations: body.specializations || [],
        experienceYears: body.experienceYears ? Number(body.experienceYears) : undefined,
        bio: body.bio || undefined,
        linkedinUrl: body.linkedinUrl || undefined,
      };
    } else if (role === "candidate") {
      targetEndpoint = `${apiUrl}/api/v1/candidate/profile`;
      payload = {
        name: body.name || session.user.name || "Candidate",
        headline: body.headline || undefined,
        currentDesignation: body.currentDesignation || undefined,
        experienceYears: body.experienceYears ? Number(body.experienceYears) : undefined,
        skills: body.skills || [],
        workModel: body.workModel || undefined,
        fallbackEmail: session.user.email,
      };
    } else {
      // Company provisioning
      payload = {
        orgName: body.orgName,
        industry: body.industry,
        name: body.name || session.user.name,
        email: session.user.email,
      };
    }

    console.log("[Onboarding API] Sending to backend:", targetEndpoint, "for role:", role);

    const res = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("[Onboarding API] Backend responded with status:", res.status);
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `Backend provisioning error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, role, data });
  } catch (err: any) {
    console.error("[Onboarding API] Catch-all error:", err);
    return NextResponse.json(
      { error: `Backend connection error (${getApiUrl()}): ${err.message}` },
      { status: 500 }
    );
  }
}
