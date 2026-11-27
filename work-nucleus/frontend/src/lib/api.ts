const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://questedge.onrender.com"
    : "http://localhost:3000");

export function getClientApiUrl(): string {
  return API_BASE;
}

const COMPANY_PATH_PREFIXES = [
  "/dashboard",
  "/mandates",
  "/candidates",
  "/assessments",
  "/resume-ranker",
  "/appraisal",
  "/bgv",
  "/compensation",
  "/company",
  "/admin",
  "/offers",
  "/hiring-plans",
  "/training",
];

export function getDemoRole(): string | null {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)demo_role=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    if (p.startsWith("/recruiter")) return "RECRUITER";
    if (p === "/candidate" || p.startsWith("/candidate/")) return "CANDIDATE";
    if (COMPANY_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))) {
      return "COMPANY";
    }
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
  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(demoRole ? { "X-Demo-Role": demoRole } : {}),
      ...headers,
    },
    ...rest,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText || `Request failed with HTTP ${res.status}` }));
    const rawMsg =
      body?.error?.message ??
      (typeof body?.message === "string" || Array.isArray(body?.message) ? body.message : undefined) ??
      (typeof body?.error === "string" ? body.error : undefined);
    const msg = Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg;
    const err = new Error(msg || `API error: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}
