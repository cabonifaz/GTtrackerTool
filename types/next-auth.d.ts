import { CodigoRol } from "@/lib/types";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      idUsuario: number;
      rol: CodigoRol;
      debeCambiarPassword: boolean;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    rol: CodigoRol;
    debeCambiarPassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idUsuario: number;
    rol: CodigoRol;
    debeCambiarPassword: boolean;
  }
}
