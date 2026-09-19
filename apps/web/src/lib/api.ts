const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function api(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, init);
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
