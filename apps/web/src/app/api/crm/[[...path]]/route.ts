const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function backendConfig() {
  const base = process.env.CRM_API_URL?.trim();
  const token = process.env.CRM_API_TOKEN?.trim();
  if (!base || !token) throw new Error("CRM_API_URL and CRM_API_TOKEN are required");

  const url = new URL(base);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password) {
    throw new Error("CRM_API_URL must be HTTPS, except for localhost");
  }
  return { url, token };
}

async function forward(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { url: base, token } = backendConfig();
    const { path = [] } = await context.params;
    const suffix = path.map(encodeURIComponent).join("/");
    const target = new URL(`${base.pathname.replace(/\/$/, "")}/${suffix}`, base);
    target.search = new URL(request.url).search;

    const headers = new Headers(request.headers);
    for (const name of ["connection", "content-length", "cookie", "host"]) headers.delete(name);
    headers.set("authorization", `Bearer ${token}`);

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["connection", "content-length", "transfer-encoding"]) responseHeaders.delete(name);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: "CRM API is unavailable" }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
export const OPTIONS = forward;
