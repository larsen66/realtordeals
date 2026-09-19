const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function api(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, init);
}
