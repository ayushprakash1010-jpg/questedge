import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { token } = await auth0.getAccessToken();
    return NextResponse.json({ accessToken: token });
  } catch (err: any) {
    // In production, unauthenticated requests must return 401 Unauthorized (P3-01 / P1-06)
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Unauthorized", message: "User is not authenticated" },
        { status: 401 },
      );
    }
    // Local dev fallback allows testing without live Auth0 credentials
    return NextResponse.json({ accessToken: "mock-token-for-dev" });
  }
}
