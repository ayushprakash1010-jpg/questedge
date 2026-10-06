import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (session && session.user) {
      return NextResponse.json({ email: session.user.email, name: session.user.name });
    }
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}
