"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm({
  slug,
  empresaNombre,
  tieneLogo,
  ocultarNombre,
  colorPrimario,
  suspendida,
}: {
  slug: string;
  empresaNombre: string;
  tieneLogo: boolean;
  ocultarNombre: boolean;
  colorPrimario: string;
  suspendida: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Sin logo no hay nada mas que mostrar, asi que el nombre siempre se ve
  // aunque la empresa haya pedido ocultarlo.
  const mostrarNombre = !tieneLogo || !ocultarNombre;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const result = await signIn("credentials", {
      email,
      password,
      slug,
      redirect: false,
    });

    setCargando(false);

    if (result?.error) {
      setError("Email o contrasena invalidos");
      return;
    }

    router.push(`/${slug}/cronometro`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-5"
      >
        <div className="flex flex-col items-center text-center gap-2">
          {tieneLogo && (
            // eslint-disable-next-line @next/next/no-img-element -- logo binario servido desde la DB
            <img
              src={`/${slug}/logo`}
              alt={empresaNombre}
              className={mostrarNombre ? "h-12 w-auto" : "h-20 w-auto"}
            />
          )}
          {mostrarNombre && <h1 className="text-xl font-semibold">{empresaNombre}</h1>}
          <p className="text-xs text-gray-400">
            Trackeo de tiempos &quot;Qro&apos;nos&quot;
          </p>
          <p className="text-sm text-gray-500">Inicia sesion para continuar</p>
        </div>

        {suspendida && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Esta cuenta esta suspendida. Contacta a soporte si crees que es un error.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="password">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-md text-white text-sm font-medium py-2 disabled:opacity-50"
          style={{ backgroundColor: colorPrimario }}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-400">
        Develop by{" "}
        <a
          href="https://geeky-tech.es"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-700 underline"
        >
          Geeky Tech
        </a>
      </p>
    </div>
  );
}
