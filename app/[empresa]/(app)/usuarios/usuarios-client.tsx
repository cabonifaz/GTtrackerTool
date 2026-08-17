"use client";

import { useState, FormEvent } from "react";
import { Usuario, UsuarioSistema } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";

export default function UsuariosClient({
  usuariosIniciales,
  sistemasIniciales,
}: {
  usuariosIniciales: Usuario[];
  sistemasIniciales: UsuarioSistema[];
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);
  const [sistemas, setSistemas] = useState<UsuarioSistema[]>(sistemasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [nuevaCuenta, setNuevaCuenta] = useState<{ apiKey: string; apiSecret: string } | null>(
    null
  );
  const [passwordGenerica, setPasswordGenerica] = useState<string | null>(null);
  const [enviandoUsuario, setEnviandoUsuario] = useState(false);
  const [enviandoSistema, setEnviandoSistema] = useState(false);
  const [idsProcesando, setIdsProcesando] = useState<Set<number>>(new Set());

  async function cargarTodo() {
    try {
      const [u, s] = await Promise.all([
        fetchJson<Usuario[]>("/api/usuarios"),
        fetchJson<UsuarioSistema[]>("/api/usuarios-sistema"),
      ]);
      setUsuarios(u);
      setSistemas(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
    }
  }

  async function crearUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordGenerica(null);
    setEnviandoUsuario(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombres: form.get("nombres"),
        apellidos: form.get("apellidos"),
        email: form.get("email"),
        codigoRol: form.get("codigoRol"),
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviandoUsuario(false);
      return;
    }
    const data = await res.json();
    setPasswordGenerica(data.passwordGenerica);
    formEl.reset();
    await cargarTodo();
    setEnviandoUsuario(false);
  }

  async function alternarActivo(u: Usuario) {
    const accion = u.activo ? "baja" : "activar";
    setIdsProcesando((prev) => new Set(prev).add(u.id_usuario));
    await fetch(`/api/usuarios/${u.id_usuario}/${accion}`, { method: "POST" });
    await cargarTodo();
    setIdsProcesando((prev) => {
      const next = new Set(prev);
      next.delete(u.id_usuario);
      return next;
    });
  }

  async function crearCuentaSistema(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviandoSistema(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/usuarios-sistema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreSistema: form.get("nombreSistema") }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviandoSistema(false);
      return;
    }
    const data = await res.json();
    setNuevaCuenta({ apiKey: data.apiKey, apiSecret: data.apiSecret });
    formEl.reset();
    await cargarTodo();
    setEnviandoSistema(false);
  }

  async function revocarCuenta(id: number) {
    setIdsProcesando((prev) => new Set(prev).add(id));
    await fetch(`/api/usuarios-sistema/${id}/revocar`, { method: "POST" });
    await cargarTodo();
    setIdsProcesando((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Usuarios</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <p className="text-sm text-gray-500">
          Todo usuario nuevo recibe una contrasena temporal generica y debera cambiarla en su primer login.
        </p>

        {passwordGenerica && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">Usuario creado. Comparte esta contrasena temporal (no se volvera a mostrar):</p>
            <p>
              <span className="text-gray-500">Contrasena:</span> {passwordGenerica}
            </p>
          </div>
        )}

        <form onSubmit={crearUsuario} className="grid gap-2 sm:grid-cols-4">
          <input name="nombres" required placeholder="Nombres" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="apellidos" required placeholder="Apellidos" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="codigoRol" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="TALENTO">Talento</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            disabled={enviandoUsuario}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 sm:col-span-4 sm:w-fit"
          >
            {enviandoUsuario && <Spinner />}
            Crear usuario
          </button>
        </form>

        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {usuarios.map((u) => (
            <li key={u.id_usuario} className="px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <span className="font-medium">
                  {u.nombres} {u.apellidos}
                </span>
                <span className="text-gray-400"> · {u.email} · {u.rol}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={u.activo ? "text-green-600" : "text-gray-400"}>
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
                <button
                  onClick={() => alternarActivo(u)}
                  disabled={idsProcesando.has(u.id_usuario)}
                  className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                >
                  {idsProcesando.has(u.id_usuario) && <Spinner className="h-3 w-3" />}
                  {u.activo ? "Dar de baja" : "Reactivar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Usuarios de sistema (API)</h2>
        <p className="text-sm text-gray-500">
          Cuentas de servicio para integraciones externas. El api secret solo se muestra una vez.
        </p>

        {nuevaCuenta && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">Guarda estas credenciales, no se volveran a mostrar:</p>
            <p>
              <span className="text-gray-500">x-api-key:</span> {nuevaCuenta.apiKey}
            </p>
            <p>
              <span className="text-gray-500">x-api-secret:</span> {nuevaCuenta.apiSecret}
            </p>
          </div>
        )}

        <form onSubmit={crearCuentaSistema} className="flex gap-2">
          <input
            name="nombreSistema"
            required
            placeholder="Nombre del sistema/integracion"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm flex-1"
          />
          <button
            disabled={enviandoSistema}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {enviandoSistema && <Spinner />}
            Generar credenciales
          </button>
        </form>

        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {sistemas.map((s) => (
            <li key={s.id_usuario_sistema} className="px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <span className="font-medium">{s.nombre_sistema}</span>
                <span className="text-gray-400"> · {s.api_key}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={s.activo ? "text-green-600" : "text-gray-400"}>
                  {s.activo ? "Activo" : "Revocado"}
                </span>
                {s.activo === 1 && (
                  <button
                    onClick={() => revocarCuenta(s.id_usuario_sistema)}
                    disabled={idsProcesando.has(s.id_usuario_sistema)}
                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                  >
                    {idsProcesando.has(s.id_usuario_sistema) && <Spinner className="h-3 w-3" />}
                    Revocar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
