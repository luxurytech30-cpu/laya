export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lt_token");
}

function emitTokenChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lt-token-change"));
}

export function setToken(token: string) {
  localStorage.setItem("lt_token", token);
  emitTokenChange();
}

export function clearToken() {
  localStorage.removeItem("lt_token");
  emitTokenChange();
}

export async function apiFetch<T>(url: string, options: RequestInit = {}) {
  const token = getToken();
  const extraHeaders = (options.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => null);

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json as T;
}
