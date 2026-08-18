import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { obtenerUsuarioPorEmail } from "@/lib/services/usuarioService";
import { CodigoRol } from "@/lib/types";
import { estaBloqueado, registrarIntentoFallido, registrarLoginExitoso } from "@/lib/rateLimiter";

// Un unico NextAuth sirve tanto el login por tenant (/[empresa]/login, con
// slug) como el del Super Admin (/plataforma/login, sin slug). El slug
// recibido debe coincidir con la empresa del usuario autenticado -- asi un
// Admin/Talento no puede loguearse por la URL de otra empresa aunque
// conozca sus credenciales, y un Super Admin (sin empresa) solo entra por
// el login sin slug.
export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/plataforma/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        slug: { label: "Empresa", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        // Bloqueo por fuerza bruta: se revisa antes de tocar la base o
        // comparar el hash, para no gastar tiempo/recursos en un intento
        // que ya sabemos que va a fallar.
        if (estaBloqueado(credentials.email)) return null;

        const usuario = await obtenerUsuarioPorEmail(credentials.email);
        if (!usuario || !usuario.activo) {
          registrarIntentoFallido(credentials.email);
          return null;
        }

        const passwordValida = await bcrypt.compare(credentials.password, usuario.password_hash);
        if (!passwordValida) {
          registrarIntentoFallido(credentials.email);
          return null;
        }

        const slug = credentials.slug?.trim() || "";

        if (usuario.codigo_rol === "SUPER_ADMIN") {
          if (slug !== "") {
            registrarIntentoFallido(credentials.email);
            return null;
          }
        } else {
          if (slug === "" || usuario.empresa_slug !== slug) {
            registrarIntentoFallido(credentials.email);
            return null;
          }
        }

        registrarLoginExitoso(credentials.email);

        return {
          id: String(usuario.id_usuario),
          name: `${usuario.nombres} ${usuario.apellidos}`,
          email: usuario.email,
          rol: usuario.codigo_rol,
          debeCambiarPassword: !!usuario.debe_cambiar_password,
          idEmpresa: usuario.id_empresa,
          empresaSlug: usuario.empresa_slug,
          empresaNombre: usuario.empresa_nombre,
          empresaSuspendida: !!usuario.empresa_suspendida,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as {
          rol: CodigoRol;
          debeCambiarPassword: boolean;
          idEmpresa: number | null;
          empresaSlug: string | null;
          empresaNombre: string | null;
          empresaSuspendida: boolean;
        };
        token.idUsuario = Number(user.id);
        token.rol = u.rol;
        token.debeCambiarPassword = u.debeCambiarPassword;
        token.idEmpresa = u.idEmpresa;
        token.empresaSlug = u.empresaSlug;
        token.empresaNombre = u.empresaNombre;
        token.empresaSuspendida = u.empresaSuspendida;
      }
      if (trigger === "update" && typeof session?.debeCambiarPassword === "boolean") {
        token.debeCambiarPassword = session.debeCambiarPassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.idUsuario = token.idUsuario as number;
        session.user.rol = token.rol as CodigoRol;
        session.user.debeCambiarPassword = token.debeCambiarPassword as boolean;
        session.user.idEmpresa = token.idEmpresa as number | null;
        session.user.empresaSlug = token.empresaSlug as string | null;
        session.user.empresaNombre = token.empresaNombre as string | null;
        session.user.empresaSuspendida = token.empresaSuspendida as boolean;
      }
      return session;
    },
  },
};
