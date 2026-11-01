const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getDemoRole(): string | null {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)demo_role=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/recruiter")) return "RECRUITER";
    if (window.location.pathname.startsWith("/candidate")) return "CANDIDATE";
    if (window.location.pathname.startsWith("/dashboard") || window.location.pathname.startsWith("/mandates")) return "COMPANY";
  }
  return null;
}

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const demoRole = getDemoRole();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(demoRole ? { "X-Demo-Role": demoRole } : {}),
      ...headers,
    },
    ...rest,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText || `Request failed with HTTP ${res.status}` }));
    const msg = Array.isArray(error.message) ? error.message.join(", ") : error.message;
    const err = new Error(msg || `API error: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}
