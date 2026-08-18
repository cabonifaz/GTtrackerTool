"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CodigoRol } from "@/lib/types";
import SyncStatus from "@/components/SyncStatus";
import PushToggle from "@/components/PushToggle";
import TenantLogo from "@/components/TenantLogo";

const links: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "cronometro", label: "Cronometro" },
  { href: "registros", label: "Mis Registros" },
  { href: "tareas", label: "Tareas" },
  { href: "reportes", label: "Reportes" },
  { href: "calendario", label: "Calendario" },
  { href: "dias-off", label: "Dias Off" },
  { href: "usuarios", label: "Usuarios", adminOnly: true },
];

export default function NavBar({
  nombre,
  rol,
  empresaSlug,
  empresaNombre,
  tieneLogo,
}: {
  nombre: string;
  rol: CodigoRol;
  empresaSlug: string;
  empresaNombre: string;
  tieneLogo: boolean;
}) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  const linksVisibles = links.filter((link) => !link.adminOnly || rol === "ADMIN");
  const base = `/${empresaSlug}`;

  function activo(href: string) {
    return pathname.startsWith(`${base}/${href}`);
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="sm:hidden p-2 -ml-2 text-gray-600"
          aria-label="Abrir menu"
          aria-expanded={menuAbierto}
        >
          {menuAbierto ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-3">
          {tieneLogo ? (
            <TenantLogo slug={empresaSlug} alt={empresaNombre} className="h-8 w-32" />
          ) : (
            <span className="text-sm font-semibold text-gray-700">{empresaNombre}</span>
          )}
          <nav className="flex items-center gap-1">
            {linksVisibles.map((link) => (
              <Link
                key={link.href}
                href={`${base}/${link.href}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  activo(link.href) ? "text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
                style={activo(link.href) ? { backgroundColor: "var(--color-primario)" } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <PushToggle />
          <SyncStatus />
          <span className="hidden sm:inline truncate max-w-[10rem]">{nombre}</span>
          <button
            onClick={() => signOut({ callbackUrl: `${base}/login` })}
            className="text-gray-500 hover:text-gray-900"
          >
            Salir
          </button>
        </div>
      </div>

      {menuAbierto && (
        <nav className="sm:hidden border-t border-gray-200 px-4 py-2 flex flex-col gap-1">
          <p className="px-3 py-1 text-xs text-gray-400 truncate">{nombre}</p>
          {linksVisibles.map((link) => (
            <Link
              key={link.href}
              href={`${base}/${link.href}`}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activo(link.href) ? "text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
              style={activo(link.href) ? { backgroundColor: "var(--color-primario)" } : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
