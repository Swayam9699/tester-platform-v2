import axios, { type AxiosError } from "axios";

/**
 * Shared HTTP client for calling the app's route handlers (src/app/api) from Client Components, or an external API
 * when NEXT_PUBLIC_API_URL is set. Server Components and Server Actions read the database directly (src/api)
 * instead: they have no browser origin to resolve "/api" against, and fetch() there gets Next's request memoization.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

/** What every failed request rejects with, so callers can show `message` without digging into axios internals. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

api.interceptors.request.use((config) => {
  // Lets route handlers tell an XHR apart from a navigation, e.g. to answer 401 with JSON instead of a redirect.
  config.headers.set("X-Requested-With", "XMLHttpRequest");
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Aborted requests (AbortController, unmounted components) aren't failures worth reporting.
    if (axios.isCancel(error) || !axios.isAxiosError(error)) return Promise.reject(error);

    const status = error.response?.status ?? null;
    if (status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
      const next = window.location.pathname + window.location.search;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    }
    return Promise.reject(new ApiError(messageFor(error), status, error.response?.data));
  },
);

/** Route handlers answer errors as { error } (see src/app/api/cron); external APIs often use { message }. */
function messageFor(error: AxiosError): string {
  const data = error.response?.data as { error?: unknown; message?: unknown } | undefined;
  const fromBody = typeof data?.error === "string" ? data.error : typeof data?.message === "string" ? data.message : null;
  if (fromBody) return fromBody;
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "The request timed out. Please try again.";
  if (!error.response) return "Network error. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}
