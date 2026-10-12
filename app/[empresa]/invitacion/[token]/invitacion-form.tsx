"use client";

import { useState, FormEvent } from "react";
import TenantLogo from "@/components/TenantLogo";

export default function InvitacionForm({
  token,
  nombres,
  apellidos,
  email,
  empresaNombre,
  empresaSlug,
  tieneLogo,
  colorPrimario,
  proyecto,
}: {
  token: string;
  nombres: string;
  apellidos: string;
  email: string;
  empresaNombre: string;
  empresaSlug: string;
  tieneLogo: boolean;
  colorPrimario: string;
  proyecto: string | null;
}) {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [lista, setLista] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmar) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setCargando(true);
    const res = await fetch(`/api/invitaciones/aceptar/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setCargando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo configurar la contrasena");
      return;
    }
    setLista(true);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ "--color-primario": colorPrimario } as React.CSSProperties}
    >
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-5">
        <div className="flex flex-col items-center text-center gap-2">
          {tieneLogo && <TenantLogo slug={empresaSlug} alt={empresaNombre} className="h-14 w-40" />}
          <h1 className="text-xl font-semibold">{empresaNombre}</h1>
        </div>

        {lista ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-700">
              Listo, {nombres}. Tu cuenta ya esta activa{proyecto ? ` y asignada a ${proyecto}` : ""}.
            </p>
            <a
              href={`/${empresaSlug}/login`}
              className="inline-flex w-full items-center justify-center rounded-md text-white text-sm font-medium py-2"
              style={{ backgroundColor: colorPrimario }}
            >
              Ir a iniciar sesion
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-gray-500 text-center">
              Hola {nombres} {apellidos}, configura tu contrasena para activar tu cuenta ({email}).
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="confirmar">
                Confirmar contrasena
              </label>
              <input
                id="confirmar"
                type="password"
                required
                minLength={8}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-md text-white text-sm font-medium py-2 disabled:opacity-50"
              style={{ backgroundColor: colorPrimario }}
            >
              {cargando ? "Guardando..." : "Activar mi cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
