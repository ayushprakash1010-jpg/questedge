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

export function extractApiErrorMessage(
  body: unknown,
  fallback = "Request failed",
): string {
  if (!body || typeof body !== "object") {
    return typeof body === "string" && body.trim() ? body : fallback;
  }
  const obj = body as Record<string, any>;
  const nestedError =
    obj.error && typeof obj.error === "object" ? obj.error : undefined;
  const raw =
    nestedError?.message ??
    (typeof obj.message === "string" || Array.isArray(obj.message)
      ? obj.message
      : undefined) ??
    (typeof obj.error === "string" ? obj.error : undefined);

  if (Array.isArray(raw)) {
    const joined = raw.filter((item) => typeof item === "string" && item.trim()).join(", ");
    return joined || fallback;
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw;
  }
  return fallback;
}

export async function readResponseError(
  res: Response,
  fallback?: string,
): Promise<string> {
  const defaultMsg = fallback || res.statusText || `Request failed (${res.status})`;
  const body = await res.json().catch(() => null);
  return extractApiErrorMessage(body, defaultMsg);
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
    const msg = await readResponseError(res, `API error: ${res.status}`);
    const err = new Error(msg);
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}
