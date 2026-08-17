import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { obtenerUsuarioPorEmail } from "@/lib/services/usuarioService";
import { CodigoRol } from "@/lib/types";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const usuario = await obtenerUsuarioPorEmail(credentials.email);
        if (!usuario || !usuario.activo) return null;

        const passwordValida = await bcrypt.compare(credentials.password, usuario.password_hash);
        if (!passwordValida) return null;

        return {
          id: String(usuario.id_usuario),
          name: `${usuario.nombres} ${usuario.apellidos}`,
          email: usuario.email,
          rol: usuario.codigo_rol,
          debeCambiarPassword: !!usuario.debe_cambiar_password,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.idUsuario = Number(user.id);
        token.rol = (user as { rol: CodigoRol }).rol;
        token.debeCambiarPassword = (user as { debeCambiarPassword: boolean }).debeCambiarPassword;
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
      }
      return session;
    },
  },
};
