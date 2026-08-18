"use client";

import { useState, FormEvent } from "react";
import { signOut } from "next-auth/react";
import { CodigoTipoPlanEmpresa, Empresa, MaestroItem, Usuario } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import TenantLogo from "@/components/TenantLogo";
import { fetchJson } from "@/lib/fetchJson";

function CamposPlan({
  tiposPlan,
  monedas,
  planInicial,
  limiteInicial,
  tarifaInicial,
  monedaInicial,
  publicidadInicial,
}: {
  tiposPlan: MaestroItem[];
  monedas: MaestroItem[];
  planInicial: CodigoTipoPlanEmpresa;
  limiteInicial?: number | null;
  tarifaInicial?: number | null;
  monedaInicial?: string | null;
  publicidadInicial: boolean;
}) {
  const [plan, setPlan] = useState<CodigoTipoPlanEmpresa>(planInicial);
  const [publicidadDefault, setPublicidadDefault] = useState(publicidadInicial);
  const esPago = plan === "PAGO_USUARIO";

  function cambiarPlan(nuevoPlan: CodigoTipoPlanEmpresa) {
    setPlan(nuevoPlan);
    setPublicidadDefault(nuevoPlan === "GRATIS_PUBLICIDAD");
  }

  return (
    <>
      <select
        name="codigoTipoPlan"
        value={plan}
        onChange={(e) => cambiarPlan(e.target.value as CodigoTipoPlanEmpresa)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      >
        {tiposPlan.map((t) => (
          <option key={t.codigo} value={t.codigo}>
            {t.valor}
          </option>
        ))}
      </select>
      {esPago && (
        <>
          <input
            name="limiteUsuarios"
            type="number"
            min={1}
            placeholder="Limite de usuarios"
            defaultValue={limiteInicial ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            name="tarifaPorUsuario"
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="Tarifa por usuario"
            defaultValue={tarifaInicial ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select
            name="codigoMoneda"
            required
            defaultValue={monedaInicial ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="" disabled>
              Moneda
            </option>
            {monedas.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.codigo}
              </option>
            ))}
          </select>
        </>
      )}
      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input key={plan} type="checkbox" name="publicidadActiva" defaultChecked={publicidadDefault} />
        Mostrar publicidad
      </label>
    </>
  );
}

function EtiquetaPlan({ emp }: { emp: Empresa }) {
  if (!emp.codigo_tipo_plan) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        Sin plan configurado
      </span>
    );
  }
  const usuarios = `${emp.usuarios_activos ?? 0}${emp.limite_usuarios ? `/${emp.limite_usuarios}` : ""} usuarios`;
  return (
    <span className="flex items-center gap-2 flex-wrap">
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        {emp.codigo_tipo_plan === "PAGO_USUARIO"
          ? `Pago por usuario · ${usuarios} · ${emp.tarifa_por_usuario} ${emp.codigo_moneda ?? ""}/usuario`
          : `Gratis con publicidad · ${usuarios}`}
      </span>
      {emp.publicidad_activa === 1 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Publicidad activa
        </span>
      )}
    </span>
  );
}

export default function PlataformaClient({
  nombre,
  empresasIniciales,
  usuariosIniciales,
  tiposPlan,
  monedas,
  origen,
}: {
  nombre: string;
  empresasIniciales: Empresa[];
  usuariosIniciales: Usuario[];
  tiposPlan: MaestroItem[];
  monedas: MaestroItem[];
  origen: string;
}) {
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasIniciales);
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);
  const [error, setError] = useState<string | null>(null);
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);
  const [idsProcesando, setIdsProcesando] = useState<Set<string>>(new Set());
  const [adminForm, setAdminForm] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<number | null>(null);
  const [linkCopiado, setLinkCopiado] = useState<number | null>(null);
  const [passwordGenerica, setPasswordGenerica] = useState<{ contexto: string; valor: string } | null>(
    null
  );

  const planPorDefecto = tiposPlan[0]?.codigo as CodigoTipoPlanEmpresa | undefined;

  function marcar(id: string, activo: boolean) {
    setIdsProcesando((prev) => {
      const next = new Set(prev);
      if (activo) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function linkTenant(slug: string) {
    return `${origen}/${slug}/login`;
  }

  async function copiarLink(emp: Empresa) {
    const link = linkTenant(emp.slug);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // clipboard API puede fallar (permiso, contexto no seguro); el link
      // ya queda visible en pantalla para copiarlo a mano igual.
    }
    setLinkCopiado(emp.id_empresa);
    setTimeout(() => setLinkCopiado((actual) => (actual === emp.id_empresa ? null : actual)), 2000);
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
          codigoTipoPlan: form.get("codigoTipoPlan"),
          limiteUsuarios: form.get("limiteUsuarios"),
          tarifaPorUsuario: form.get("tarifaPorUsuario"),
          codigoMoneda: form.get("codigoMoneda"),
          publicidadActiva: form.get("publicidadActiva") === "on",
          ocultarNombre: form.get("ocultarNombre") === "on",
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

  async function guardarEdicion(emp: Empresa, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    marcar(`editar-${emp.id_empresa}`, true);
    try {
      const res = await fetch(`/api/plataforma/empresas/${emp.id_empresa}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.get("nombre"),
          colorPrimario: form.get("colorPrimario"),
          colorSecundario: form.get("colorSecundario"),
          codigoTipoPlan: form.get("codigoTipoPlan"),
          limiteUsuarios: form.get("limiteUsuarios"),
          tarifaPorUsuario: form.get("tarifaPorUsuario"),
          codigoMoneda: form.get("codigoMoneda"),
          publicidadActiva: form.get("publicidadActiva") === "on",
          ocultarNombre: form.get("ocultarNombre") === "on",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditForm(null);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la empresa");
    } finally {
      marcar(`editar-${emp.id_empresa}`, false);
    }
  }

  async function medirImagen(archivo: File): Promise<{ w: number; h: number }> {
    const url = URL.createObjectURL(archivo);
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("No se pudo leer la imagen"));
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function subirLogo(idEmpresa: number, archivo: File) {
    marcar(`logo-${idEmpresa}`, true);
    try {
      const { w, h } = await medirImagen(archivo);
      if (w < 96 || h < 96) {
        throw new Error(
          `El logo mide ${w}x${h}px -- sube uno de al menos 96x96px para que no se vea borroso al ampliarlo`
        );
      }
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

        {planPorDefecto && (
          <form onSubmit={crearEmpresa} className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-md p-3">
            <input name="nombre" required placeholder="Nombre" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            <input
              name="slug"
              required
              placeholder="slug-url"
              pattern="[a-z0-9-]+"
              title="Solo minusculas, numeros y guiones"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <input name="colorPrimario" type="color" defaultValue="#111827" className="h-8 rounded-md border border-gray-300" />
            <input name="colorSecundario" type="color" defaultValue="#374151" className="h-8 rounded-md border border-gray-300" />
            <CamposPlan
              tiposPlan={tiposPlan}
              monedas={monedas}
              planInicial={planPorDefecto}
              publicidadInicial={planPorDefecto === "GRATIS_PUBLICIDAD"}
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input type="checkbox" name="ocultarNombre" />
              Ocultar nombre en login (solo logo)
            </label>
            <button
              disabled={creandoEmpresa}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50"
            >
              {creandoEmpresa && <Spinner />}
              Crear empresa
            </button>
          </form>
        )}

        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {empresas.map((emp) => (
            <li key={emp.id_empresa} className="px-4 py-3 text-sm space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {emp.tiene_logo ? (
                    <TenantLogo slug={emp.slug} alt={emp.nombre} className="h-6 w-24" />
                  ) : (
                    <span
                      className="h-4 w-4 rounded-full inline-block"
                      style={{ backgroundColor: emp.color_primario }}
                    />
                  )}
                  <span className="font-medium">{emp.nombre}</span>
                  <span className="text-gray-400">· /{emp.slug}</span>
                  <EtiquetaPlan emp={emp} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={emp.suspendida ? "text-amber-600" : "text-green-600"}>
                    {emp.suspendida ? "Suspendida" : "Activa"}
                  </span>
                  <button
                    onClick={() => setEditForm(editForm === emp.id_empresa ? null : emp.id_empresa)}
                    className="text-gray-500 hover:text-gray-900 underline"
                  >
                    Editar
                  </button>
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

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <a
                  href={linkTenant(emp.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-gray-900 hover:underline"
                >
                  {linkTenant(emp.slug)}
                </a>
                <button
                  onClick={() => copiarLink(emp)}
                  className="shrink-0 text-gray-500 hover:text-gray-900 underline"
                >
                  {linkCopiado === emp.id_empresa ? "Copiado" : "Copiar link"}
                </button>
              </div>

              {editForm === emp.id_empresa && (
                <form
                  onSubmit={(e) => guardarEdicion(emp, e)}
                  className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-md p-3"
                >
                  <input
                    name="nombre"
                    required
                    defaultValue={emp.nombre}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    name="colorPrimario"
                    type="color"
                    defaultValue={emp.color_primario}
                    className="h-8 rounded-md border border-gray-300"
                  />
                  <input
                    name="colorSecundario"
                    type="color"
                    defaultValue={emp.color_secundario}
                    className="h-8 rounded-md border border-gray-300"
                  />
                  <CamposPlan
                    tiposPlan={tiposPlan}
                    monedas={monedas}
                    planInicial={(emp.codigo_tipo_plan ?? planPorDefecto) as CodigoTipoPlanEmpresa}
                    limiteInicial={emp.limite_usuarios}
                    tarifaInicial={emp.tarifa_por_usuario}
                    monedaInicial={emp.codigo_moneda}
                    publicidadInicial={emp.publicidad_activa === 1}
                  />
                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <input type="checkbox" name="ocultarNombre" defaultChecked={emp.ocultar_nombre === 1} />
                    Ocultar nombre en login (solo logo)
                  </label>
                  <button
                    disabled={idsProcesando.has(`editar-${emp.id_empresa}`)}
                    className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
                  >
                    {idsProcesando.has(`editar-${emp.id_empresa}`) && <Spinner />}
                    Guardar
                  </button>
                </form>
              )}

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
