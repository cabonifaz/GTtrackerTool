import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// authorized() siempre retorna true: todos los redirects (sesion faltante,
// tenant equivocado, cambio de password forzado, area de Super Admin) se
// resuelven a mano abajo, porque el destino depende del slug de la URL y
// NextAuth's pages.signIn es un solo string estatico que no puede serlo.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // El matcher de abajo usa ":empresa" como comodin de un solo segmento,
    // asi que "/api/usuarios", "/api/cronometro/..." etc. tambien matchean
    // (empresa="api"). Las rutas API resuelven su propia autenticacion
    // (requireSession/requireAdmin/requireSuperAdmin), asi que nunca deben
    // pasar por esta logica orientada a paginas.
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/plataforma")) {
      if (pathname === "/plataforma/login") return NextResponse.next();
      if (!token || token.rol !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/plataforma/login", req.url));
      }
      return NextResponse.next();
    }

    const empresaSlug = pathname.split("/").filter(Boolean)[0] ?? "";

    if (!token) {
      return NextResponse.redirect(new URL(`/${empresaSlug}/login`, req.url));
    }

    if (token.rol === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/plataforma", req.url));
    }

    if (token.empresaSlug !== empresaSlug) {
      // El usuario logueado pertenece a otra empresa: lo mandamos a la suya,
      // no a la URL ajena que intento visitar.
      return NextResponse.redirect(new URL(`/${token.empresaSlug}/cronometro`, req.url));
    }

    if (token.debeCambiarPassword) {
      return NextResponse.redirect(new URL(`/${empresaSlug}/cambiar-password`, req.url));
    }

    const isUsuariosRoute = pathname.startsWith(`/${empresaSlug}/usuarios`);
    if (isUsuariosRoute && token.rol !== "ADMIN") {
      return NextResponse.redirect(new URL(`/${empresaSlug}/cronometro`, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/:empresa/cronometro/:path*",
    "/:empresa/tareas/:path*",
    "/:empresa/registros/:path*",
    "/:empresa/reportes/:path*",
    "/:empresa/calendario/:path*",
    "/:empresa/dias-off/:path*",
    "/:empresa/usuarios/:path*",
    "/plataforma/:path*",
  ],
};
