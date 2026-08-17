import { CodigoRol } from "@/lib/types";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      idUsuario: number;
      rol: CodigoRol;
      debeCambiarPassword: boolean;
      idEmpresa: number | null;
      empresaSlug: string | null;
      empresaNombre: string | null;
      empresaSuspendida: boolean;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    rol: CodigoRol;
    debeCambiarPassword: boolean;
    idEmpresa: number | null;
    empresaSlug: string | null;
    empresaNombre: string | null;
    empresaSuspendida: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idUsuario: number;
    rol: CodigoRol;
    debeCambiarPassword: boolean;
    idEmpresa: number | null;
    empresaSlug: string | null;
    empresaNombre: string | null;
    empresaSuspendida: boolean;
  }
}
