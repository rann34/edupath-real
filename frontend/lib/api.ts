const API_BASE = "http://localhost:8000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function setToken(token: string, remember: boolean) {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  if (remember) localStorage.setItem("token", token);
  else sessionStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function api(path: string, options: ApiOptions = {}) {
  const { method = "GET", body, token } = options;

  const headers: HeadersInit = {};

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body:
      body instanceof FormData
        ? body
        : body
        ? JSON.stringify(body)
        : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || "Request failed");
  }

  return data;
}
