import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isStaticAsset(pathname: string) {
  return /\.[a-z0-9]+$/i.test(pathname);
}

function isAuthorizedInternalRequest(request: NextRequest): boolean {
  const expectedUser = process.env.INTERNAL_BASIC_AUTH_USER?.trim();
  const expectedPassword = process.env.INTERNAL_BASIC_AUTH_PASSWORD?.trim();

  if (!expectedUser || !expectedPassword) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      return false;
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    return username === expectedUser && password === expectedPassword;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/internal")) {
    if (isAuthorizedInternalRequest(request)) {
      return NextResponse.next();
    }

    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="GradeCheck Internal Monitoring", charset="UTF-8"',
      },
    });
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/claim") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    isStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const lowercasePathname = pathname.toLowerCase();

  if (pathname !== lowercasePathname) {
    const url = request.nextUrl.clone();
    url.pathname = lowercasePathname;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
