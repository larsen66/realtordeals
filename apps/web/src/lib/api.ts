function apiUrl() {
  if (typeof window !== "undefined") return "/api/crm";
  return (process.env.CRM_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

export function api(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (typeof window === "undefined") {
    const token = process.env.CRM_API_TOKEN?.trim();
    if (!token) throw new Error("CRM_API_TOKEN is required for server-side API requests");
    headers.set("authorization", `Bearer ${token}`);
  }
  return fetch(`${apiUrl()}${path}`, { ...init, headers });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await api(path, { cache: "no-store", ...init, headers });
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return body;
}
