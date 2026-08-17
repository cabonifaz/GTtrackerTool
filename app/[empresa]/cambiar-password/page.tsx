"use client";

import { useState, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const { empresa } = useParams<{ empresa: string }>();
  const { update } = useSession();
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (nuevaPassword.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres");
      return;
    }
    if (nuevaPassword !== confirmar) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setCargando(true);
    const res = await fetch("/api/usuarios/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nuevaPassword }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo cambiar la contrasena");
      setCargando(false);
      return;
    }

    await update({ debeCambiarPassword: false });
    router.push(`/${empresa}/cronometro`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-semibold">Cambia tu contrasena</h1>
          <p className="text-sm text-gray-500">
            Es tu primer ingreso. Antes de continuar, fija una contrasena propia.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="nuevaPassword">
            Nueva contrasena
          </label>
          <input
            id="nuevaPassword"
            type="password"
            required
            minLength={8}
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-md bg-gray-900 text-white text-sm font-medium py-2 disabled:opacity-50"
        >
          {cargando ? "Guardando..." : "Guardar y continuar"}
        </button>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${empresa}/login` })}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
        >
          Cerrar sesion
        </button>
      </form>
    </div>
  );
}
