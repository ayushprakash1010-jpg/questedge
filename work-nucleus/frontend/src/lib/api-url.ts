/**
 * Returns the backend API base URL for server-side usage.
 * In Docker, API_URL_INTERNAL points to the backend service name (e.g. http://backend:3000).
 * Locally, falls back to NEXT_PUBLIC_API_URL or localhost.
 */
export function getApiUrl(): string {
  return (
    process.env.API_URL_INTERNAL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000"
  );
}
