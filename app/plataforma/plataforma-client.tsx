"use client";

import { useState, FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Empresa, Usuario } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";

export default function PlataformaClient({
  nombre,
  empresasIniciales,
  usuariosIniciales,
}: {
  nombre: string;
  empresasIniciales: Empresa[];
  usuariosIniciales: Usuario[];
}) {
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasIniciales);
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);
  const [error, setError] = useState<string | null>(null);
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);
  const [idsProcesando, setIdsProcesando] = useState<Set<string>>(new Set());
  const [adminForm, setAdminForm] = useState<number | null>(null);
  const [passwordGenerica, setPasswordGenerica] = useState<{ contexto: string; valor: string } | null>(
    null
  );

  function marcar(id: string, activo: boolean) {
    setIdsProcesando((prev) => {
      const next = new Set(prev);
      if (activo) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function recargar() {
    const [e, u] = await Promise.all([
      fetchJson<Empresa[]>("/api/plataforma/empresas"),
      fetchJson<Usuario[]>("/api/plataforma/usuarios"),
    ]);
    setEmpresas(e);
    setUsuarios(u);
  }

  async function crearEmpresa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreandoEmpresa(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      const res = await fetch("/api/plataforma/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.get("nombre"),
          slug: form.get("slug"),
          colorPrimario: form.get("colorPrimario"),
          colorSecundario: form.get("colorSecundario"),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      formEl.reset();
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la empresa");
    } finally {
      setCreandoEmpresa(false);
    }
  }

  async function subirLogo(idEmpresa: number, archivo: File) {
    marcar(`logo-${idEmpresa}`, true);
    try {
      const form = new FormData();
      form.append("logo", archivo);
      const res = await fetch(`/api/plataforma/empresas/${idEmpresa}/logo`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el logo");
    } finally {
      marcar(`logo-${idEmpresa}`, false);
    }
  }

  async function alternarSuspension(emp: Empresa) {
    const accion = emp.suspendida ? "reactivar" : "suspender";
    marcar(`empresa-${emp.id_empresa}`, true);
    try {
      const res = await fetch(`/api/plataforma/empresas/${emp.id_empresa}/${accion}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la empresa");
    } finally {
      marcar(`empresa-${emp.id_empresa}`, false);
    }
  }

  async function crearAdmin(idEmpresa: number, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordGenerica(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    marcar(`admin-${idEmpresa}`, true);
    try {
      const res = await fetch(`/api/plataforma/empresas/${idEmpresa}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: form.get("nombres"),
          apellidos: form.get("apellidos"),
          email: form.get("email"),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setPasswordGenerica({ contexto: `Admin ${form.get("email")}`, valor: data.passwordGenerica });
      formEl.reset();
      setAdminForm(null);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el Admin");
    } finally {
      marcar(`admin-${idEmpresa}`, false);
    }
  }

  async function resetearPassword(u: Usuario) {
    setError(null);
    setPasswordGenerica(null);
    marcar(`reset-${u.id_usuario}`, true);
    try {
      const res = await fetch(`/api/plataforma/usuarios/${u.id_usuario}/resetear-password`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setPasswordGenerica({ contexto: `${u.nombres} ${u.apellidos} (${u.email})`, valor: data.passwordGenerica });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resetear la contrasena");
    } finally {
      marcar(`reset-${u.id_usuario}`, false);
    }
  }

  async function darDeBaja(u: Usuario) {
    marcar(`baja-${u.id_usuario}`, true);
    try {
      const res = await fetch(`/api/plataforma/usuarios/${u.id_usuario}/baja`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dar de baja al usuario");
    } finally {
      marcar(`baja-${u.id_usuario}`, false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Chronos" className="h-8 w-8 rounded" />
          <div>
            <h1 className="text-lg font-semibold">Chronos Plataforma</h1>
            <p className="text-sm text-gray-500">{nombre}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/plataforma/login" })}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Salir
        </button>
      </header>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      {passwordGenerica && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm space-y-1">
          <p className="font-medium">Comparte esta contrasena temporal (no se volvera a mostrar):</p>
          <p>
            <span className="text-gray-500">{passwordGenerica.contexto}:</span> {passwordGenerica.valor}
          </p>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Empresas</h2>

        <form onSubmit={crearEmpresa} className="grid gap-2 sm:grid-cols-5">
          <input name="nombre" required placeholder="Nombre" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input
            name="slug"
            required
            placeholder="slug-url"
            pattern="[a-z0-9-]+"
            title="Solo minusculas, numeros y guiones"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input name="colorPrimario" type="color" defaultValue="#111827" className="h-9 rounded-md border border-gray-300" />
          <input name="colorSecundario" type="color" defaultValue="#374151" className="h-9 rounded-md border border-gray-300" />
          <button
            disabled={creandoEmpresa}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {creandoEmpresa && <Spinner />}
            Crear empresa
          </button>
        </form>

        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {empresas.map((emp) => (
            <li key={emp.id_empresa} className="px-4 py-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {emp.tiene_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/${emp.slug}/logo`} alt={emp.nombre} className="h-6 w-auto" />
                  ) : (
                    <span
                      className="h-4 w-4 rounded-full inline-block"
                      style={{ backgroundColor: emp.color_primario }}
                    />
                  )}
                  <span className="font-medium">{emp.nombre}</span>
                  <span className="text-gray-400">· /{emp.slug}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={emp.suspendida ? "text-amber-600" : "text-green-600"}>
                    {emp.suspendida ? "Suspendida" : "Activa"}
                  </span>
                  <button
                    onClick={() => alternarSuspension(emp)}
                    disabled={idsProcesando.has(`empresa-${emp.id_empresa}`)}
                    className="text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                  >
                    {emp.suspendida ? "Reactivar" : "Suspender"}
                  </button>
                  <button
                    onClick={() => setAdminForm(adminForm === emp.id_empresa ? null : emp.id_empresa)}
                    className="text-gray-500 hover:text-gray-900 underline"
                  >
                    Crear Admin
                  </button>
                  <label className="text-gray-500 hover:text-gray-900 underline cursor-pointer">
                    Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0];
                        if (archivo) subirLogo(emp.id_empresa, archivo);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {adminForm === emp.id_empresa && (
                <form
                  onSubmit={(e) => crearAdmin(emp.id_empresa, e)}
                  className="grid gap-2 sm:grid-cols-4 bg-gray-50 rounded-md p-3"
                >
                  <input name="nombres" required placeholder="Nombres" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  <input name="apellidos" required placeholder="Apellidos" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  <input name="email" type="email" required placeholder="Email" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
                  <button
                    disabled={idsProcesando.has(`admin-${emp.id_empresa}`)}
                    className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
                  >
                    {idsProcesando.has(`admin-${emp.id_empresa}`) && <Spinner />}
                    Crear
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Usuarios (todas las empresas)</h2>
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {usuarios.map((u) => (
            <li key={u.id_usuario} className="px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <span className="font-medium">
                  {u.nombres} {u.apellidos}
                </span>
                <span className="text-gray-400">
                  {" "}
                  · {u.email} · {u.rol} · {u.empresa ?? "Sin empresa"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={u.activo ? "text-green-600" : "text-gray-400"}>
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
                {u.codigo_rol === "ADMIN" && (
                  <button
                    onClick={() => resetearPassword(u)}
                    disabled={idsProcesando.has(`reset-${u.id_usuario}`)}
                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                  >
                    {idsProcesando.has(`reset-${u.id_usuario}`) && <Spinner className="h-3 w-3" />}
                    Resetear clave
                  </button>
                )}
                {u.activo === 1 && (
                  <button
                    onClick={() => darDeBaja(u)}
                    disabled={idsProcesando.has(`baja-${u.id_usuario}`)}
                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                  >
                    {idsProcesando.has(`baja-${u.id_usuario}`) && <Spinner className="h-3 w-3" />}
                    Dar de baja
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
