import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="rieltordeals CRM", charset="UTF-8"' },
  });
}

function checkCrmAccess(request: NextRequest) {
  const expectedUser = process.env.CRM_WEB_USER?.trim();
  const expectedPassword = process.env.CRM_WEB_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return process.env.NODE_ENV === "production"
      ? new NextResponse("CRM authentication is not configured", { status: 503 })
      : null;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const user = separator === -1 ? decoded : decoded.slice(0, separator);
    const password = separator === -1 ? "" : decoded.slice(separator + 1);
    if (user !== expectedUser || password !== expectedPassword) return unauthorized();
  } catch {
    return unauthorized();
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/crm" || path.startsWith("/crm/") ||
      path === "/api/crm" || path.startsWith("/api/crm/")) {
    const rejection = checkCrmAccess(request);
    if (rejection) return rejection;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return updateSession(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/crm/:path*",
    "/api/crm/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
