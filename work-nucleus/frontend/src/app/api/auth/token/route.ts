import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { token } = await auth0.getAccessToken();
    return NextResponse.json({ accessToken: token });
  } catch (err: any) {
    // If we're not logged in, or token doesn't exist, return a fallback mock token for development
    // This allows the frontend to continue working in local dev even without strict Auth0 enforcement
    return NextResponse.json({ accessToken: "mock-token-for-dev" });
  }
}
