import { NextRequest, NextResponse, ProxyConfig } from "next/server";

export default function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = req.cookies.get("session")?.value;

  const isAuthPage = pathname === "/auth" || pathname.startsWith("/auth/");

  if (isAuthPage) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

export const config: ProxyConfig = {
  matcher: ["/auth/:path*", "/dashboard/:path*"],
};