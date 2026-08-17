import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (req.nextauth.token?.debeCambiarPassword) {
      return NextResponse.redirect(new URL("/cambiar-password", req.url));
    }

    const rol = req.nextauth.token?.rol;
    const isUsuariosRoute = req.nextUrl.pathname.startsWith("/usuarios");

    if (isUsuariosRoute && rol !== "ADMIN") {
      return NextResponse.redirect(new URL("/cronometro", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/cronometro/:path*",
    "/tareas/:path*",
    "/registros/:path*",
    "/reportes/:path*",
    "/calendario/:path*",
    "/dias-off/:path*",
    "/usuarios/:path*",
  ],
};
