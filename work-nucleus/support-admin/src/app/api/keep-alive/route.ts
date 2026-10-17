import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api-url";

const API_URL = getApiUrl();

/**
 * Keep-alive endpoint — called by Vercel Cron every 10 minutes.
 * Pings the backend health endpoint to prevent Render free-tier cold starts
 * (Render spins down services after ~15 minutes of inactivity).
 *
 * Cost: $0 — Vercel Hobby cron is free, Render Health ping is free.
 */
export async function GET() {
  const start = Date.now();
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - start;
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      latencyMs,
      backend: body,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
