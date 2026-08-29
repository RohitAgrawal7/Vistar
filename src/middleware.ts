import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveFloorTableId } from "@/lib/tables";

/** Normalize table URLs from QR scanners (extra slashes, encoded paths, etc.). */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/table\/([^/]+)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const raw = match[1];
  const tableId = resolveFloorTableId(raw);
  if (!tableId) return NextResponse.next();

  if (raw !== tableId) {
    const url = request.nextUrl.clone();
    url.pathname = `/table/${tableId}${match[2] ?? ""}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/table/:path*"],
};
