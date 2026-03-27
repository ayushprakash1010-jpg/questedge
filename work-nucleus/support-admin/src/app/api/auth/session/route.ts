import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
      },
    });
  } catch {
    return NextResponse.json({ error: "Session check failed" }, { status: 401 });
  }
}
