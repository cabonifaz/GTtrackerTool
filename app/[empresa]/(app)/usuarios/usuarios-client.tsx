"use client";

import { useMemo, useRef, useState, FormEvent } from "react";
import {
  ImportarUsuarioResultado,
  MaestroItem,
  MiProyecto,
  Proyecto,
  Usuario,
  UsuarioSistema,
} from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";
import { PASSWORD_GENERICA } from "@/lib/constants";

function normalizarBusqueda(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function UsuariosClient({
  usuariosIniciales,
  sistemasIniciales,
  proyectosIniciales = [],
  paisesCalendarioIniciales = [],
}: {
  usuariosIniciales: Usuario[];
  sistemasIniciales: UsuarioSistema[];
  proyectosIniciales?: Proyecto[];
  paisesCalendarioIniciales?: MaestroItem[];
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);
  const [sistemas, setSistemas] = useState<UsuarioSistema[]>(sistemasIniciales);
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosIniciales);
  const [paisesCalendario] = useState<MaestroItem[]>(paisesCalendarioIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nuevaCuenta, setNuevaCuenta] = useState<{ apiKey: string; apiSecret: string } | null>(
    null
  );
  const [passwordGenerica, setPasswordGenerica] = useState<string | null>(null);
  const [enviandoUsuario, setEnviandoUsuario] = useState(false);
  const [enviandoSistema, setEnviandoSistema] = useState(false);
  const [idsProcesando, setIdsProcesando] = useState<Set<number | string>>(new Set());
  const [editandoUsuario, setEditandoUsuario] = useState<number | null>(null);

  // Asignacion de proyectos por usuario
  const [panelProyectosUsuario, setPanelProyectosUsuario] = useState<number | null>(null);
  const [proyectosPorUsuario, setProyectosPorUsuario] = useState<Record<number, MiProyecto[]>>({});
  const [cargandoProyectosUsuario, setCargandoProyectosUsuario] = useState(false);
  const [procesandoAsignacion, setProcesandoAsignacion] = useState<Set<string>>(new Set());
  const [guardandoPaisAsignacion, setGuardandoPaisAsignacion] = useState<string | null>(null);

  // Carga masiva
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultadosImport, setResultadosImport] = useState<ImportarUsuarioResultado[] | null>(null);

  const usuariosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return [];
    return usuarios.filter((u) => {
      const texto = `${u.nombres} ${u.apellidos} ${u.email} ${u.numero_documento ?? ""} ${u.rol}`;
      return normalizarBusqueda(texto).includes(q);
    });
  }, [usuarios, busqueda]);

  async function cargarTodo() {
    try {
      const [u, s, p] = await Promise.all([
        fetchJson<Usuario[]>("/api/usuarios"),
        fetchJson<UsuarioSistema[]>("/api/usuarios-sistema"),
        fetchJson<Proyecto[]>("/api/proyectos"),
      ]);
      setUsuarios(u);
      setSistemas(s);
      setProyectos(p.filter((x) => x.activo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
    }
  }

  async function abrirPanelProyectos(idUsuario: number) {
    if (panelProyectosUsuario === idUsuario) {
      setPanelProyectosUsuario(null);
      return;
    }
    setPanelProyectosUsuario(idUsuario);
    if (!proyectosPorUsuario[idUsuario]) {
      setCargandoProyectosUsuario(true);
      try {
        const asignados = await fetchJson<MiProyecto[]>(`/api/usuarios/${idUsuario}/proyectos`);
        setProyectosPorUsuario((prev) => ({ ...prev, [idUsuario]: asignados }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los proyectos del usuario");
      } finally {
        setCargandoProyectosUsuario(false);
      }
    }
  }

  async function alternarAsignacionProyecto(idUsuario: number, idProyecto: number, yaAsignado: boolean) {
    const clave = `${idUsuario}:${idProyecto}`;
    setProcesandoAsignacion((prev) => new Set(prev).add(clave));
    setError(null);
    try {
      if (yaAsignado) {
        const res = await fetch(`/api/usuarios/${idUsuario}/proyectos?idProyecto=${idProyecto}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setProyectosPorUsuario((prev) => ({
          ...prev,
          [idUsuario]: (prev[idUsuario] ?? []).filter((p) => p.id_proyecto !== idProyecto),
        }));
      } else {
        const res = await fetch(`/api/usuarios/${idUsuario}/proyectos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idProyecto }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const pInfo = proyectos.find((p) => p.id_proyecto === idProyecto);
        setProyectosPorUsuario((prev) => ({
          ...prev,
          [idUsuario]: [
            ...(prev[idUsuario] ?? []),
            {
              id_proyecto: idProyecto,
              proyecto: pInfo?.nombre ?? "Proyecto",
              predeterminado: (prev[idUsuario]?.length ?? 0) === 0 ? 1 : 0,
              id_pais_calendario: null,
              codigo_pais: null,
              pais: null,
            },
          ],
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar asignacion");
    } finally {
      setProcesandoAsignacion((prev) => {
        const next = new Set(prev);
        next.delete(clave);
        return next;
      });
    }
  }

  async function cambiarPaisCalendario(idUsuario: number, idProyecto: number, idPaisCalendario: string) {
    const clave = `${idUsuario}:${idProyecto}`;
    setGuardandoPaisAsignacion(clave);
    setError(null);
    try {
      const res = await fetch(`/api/usuarios/${idUsuario}/proyectos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idProyecto, idPaisCalendario: idPaisCalendario || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const paisSel = paisesCalendario.find((pc) => String(pc.id_maestro) === idPaisCalendario);
      setProyectosPorUsuario((prev) => ({
        ...prev,
        [idUsuario]: (prev[idUsuario] ?? []).map((p) =>
          p.id_proyecto === idProyecto
            ? {
                ...p,
                id_pais_calendario: paisSel ? paisSel.id_maestro : null,
                codigo_pais: paisSel ? paisSel.codigo : null,
                pais: paisSel ? paisSel.valor : null,
              }
            : p
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar pais de calendario");
    } finally {
      setGuardandoPaisAsignacion(null);
    }
  }

  async function crearUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordGenerica(null);
    setEnviandoUsuario(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get("email"));
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombres: form.get("nombres"),
        apellidos: form.get("apellidos"),
        email: email,
        codigoRol: form.get("codigoRol"),
        numeroDocumento: form.get("numeroDocumento") || null,
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
    setBusqueda(email);
    setEnviandoUsuario(false);
  }

  async function guardarEdicion(u: Usuario, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setIdsProcesando((prev) => new Set(prev).add(`editar-${u.id_usuario}`));
    try {
      const res = await fetch(`/api/usuarios/${u.id_usuario}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: form.get("nombres"),
          apellidos: form.get("apellidos"),
          codigoRol: form.get("codigoRol"),
          numeroDocumento: form.get("numeroDocumento") || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditandoUsuario(null);
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario");
    } finally {
      setIdsProcesando((prev) => {
        const next = new Set(prev);
        next.delete(`editar-${u.id_usuario}`);
        return next;
      });
    }
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

  async function descargarPlantilla() {
    setDescargandoPlantilla(true);
    setError(null);
    const res = await fetch("/api/usuarios/plantilla");
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo descargar la plantilla");
      setDescargandoPlantilla(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_usuarios.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    setDescargandoPlantilla(false);
  }

  async function importarExcel() {
    const archivo = inputArchivoRef.current?.files?.[0];
    if (!archivo) return;

    setImportando(true);
    setResultadosImport(null);
    setPasswordGenerica(null);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const res = await fetch("/api/usuarios/importar", { method: "POST", body: formData });
    setImportando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo importar el archivo");
      return;
    }
    const resultados: ImportarUsuarioResultado[] = await res.json();
    setResultadosImport(resultados);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
    if (resultados.some((r) => r.ok)) {
      setPasswordGenerica(PASSWORD_GENERICA);
    }
    await cargarTodo();
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
            <p className="font-medium">
              Comparte esta contrasena temporal con los usuarios nuevos (no se volvera a mostrar):
            </p>
            <p>
              <span className="text-gray-500">Contrasena:</span> {passwordGenerica}
            </p>
          </div>
        )}

        <form onSubmit={crearUsuario} className="grid gap-2 sm:grid-cols-5">
          <input name="nombres" required placeholder="Nombres" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="apellidos" required placeholder="Apellidos" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input
            name="numeroDocumento"
            placeholder="N.º documento (opcional)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select name="codigoRol" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="TALENTO">Talento</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            disabled={enviandoUsuario}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 sm:col-span-5 sm:w-fit"
          >
            {enviandoUsuario && <Spinner />}
            Crear usuario
          </button>
        </form>

        {/* Buscador de usuarios */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-md flex-1 min-w-[260px]">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar usuario por nombre, apellido, correo o documento..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm pr-16"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Limpiar
                </button>
              )}
            </div>
            {busqueda.trim() && (
              <span className="text-xs text-gray-500">
                {usuariosFiltrados.length}{" "}
                {usuariosFiltrados.length === 1 ? "usuario encontrado" : "usuarios encontrados"}
              </span>
            )}
          </div>

          {!busqueda.trim() ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 bg-gray-50/50">
              Escribe en el buscador para encontrar y gestionar un usuario o asignar sus proyectos.
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
              No se encontraron usuarios que coincidan con &quot;{busqueda}&quot;
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {usuariosFiltrados.map((u) => {
                const asignados = proyectosPorUsuario[u.id_usuario];
                const cantidadAsignados = asignados?.length;
                const estaAbierto = panelProyectosUsuario === u.id_usuario;

                return (
                  <li key={u.id_usuario} className="text-sm">
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-medium">
                            {u.nombres} {u.apellidos}
                          </span>
                          <span className="text-gray-400"> · {u.email} · {u.rol}</span>
                          {u.numero_documento && <span className="text-gray-400"> · Doc: {u.numero_documento}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={u.activo ? "text-green-600" : "text-gray-400"}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirPanelProyectos(u.id_usuario)}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border transition-colors ${
                              estaAbierto
                                ? "border-[var(--color-primario)] text-[var(--color-primario)] bg-white"
                                : "border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            Proyectos {cantidadAsignados !== undefined ? `(${cantidadAsignados})` : ""}
                          </button>
                          <button
                            onClick={() => setEditandoUsuario(editandoUsuario === u.id_usuario ? null : u.id_usuario)}
                            className="text-gray-500 hover:text-gray-900 underline text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => alternarActivo(u)}
                            disabled={idsProcesando.has(u.id_usuario)}
                            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 underline text-xs disabled:opacity-50"
                          >
                            {idsProcesando.has(u.id_usuario) && <Spinner className="h-3 w-3" />}
                            {u.activo ? "Dar de baja" : "Reactivar"}
                          </button>
                        </div>
                      </div>

                      {editandoUsuario === u.id_usuario && (
                        <form
                          onSubmit={(e) => guardarEdicion(u, e)}
                          className="grid gap-2 sm:grid-cols-5 bg-gray-50 rounded-md p-3"
                        >
                          <input
                            name="nombres"
                            required
                            defaultValue={u.nombres}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          />
                          <input
                            name="apellidos"
                            required
                            defaultValue={u.apellidos}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          />
                          <input
                            name="numeroDocumento"
                            defaultValue={u.numero_documento ?? ""}
                            placeholder="N.º documento (opcional)"
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          />
                          <select
                            name="codigoRol"
                            defaultValue={u.codigo_rol}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          >
                            <option value="TALENTO">Talento</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <button
                            disabled={idsProcesando.has(`editar-${u.id_usuario}`)}
                            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
                          >
                            {idsProcesando.has(`editar-${u.id_usuario}`) && <Spinner />}
                            Guardar
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Panel de Asignacion de Proyectos */}
                    {estaAbierto && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-2.5">
                        <p className="text-xs font-semibold text-gray-700">
                          Proyectos asignados a {u.nombres} {u.apellidos}:
                        </p>
                        {cargandoProyectosUsuario && !asignados ? (
                          <CargandoInline texto="Cargando proyectos..." />
                        ) : proyectos.length === 0 ? (
                          <p className="text-xs text-gray-400">No hay proyectos activos en la empresa.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {proyectos.map((p) => {
                              const asignado = (asignados ?? []).find((ap) => ap.id_proyecto === p.id_proyecto);
                              const clave = `${u.id_usuario}:${p.id_proyecto}`;
                              const procesando = procesandoAsignacion.has(clave);
                              const guardandoPais = guardandoPaisAsignacion === clave;

                              return (
                                <div key={p.id_proyecto} className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => alternarAsignacionProyecto(u.id_usuario, p.id_proyecto, !!asignado)}
                                    disabled={procesando}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-colors disabled:opacity-50 ${
                                      asignado
                                        ? "bg-[var(--color-primario)] text-white border-[var(--color-primario)] font-medium"
                                        : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                                    }`}
                                  >
                                    {procesando && <Spinner className="h-3 w-3" />}
                                    {asignado && <span>✓</span>}
                                    {p.nombre}
                                    {p.cliente && (
                                      <span className={asignado ? "text-white/80" : "text-gray-400"}>
                                        {" "}· {p.cliente}
                                      </span>
                                    )}
                                  </button>

                                  {asignado && paisesCalendario.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <select
                                        value={asignado.id_pais_calendario ?? ""}
                                        onChange={(e) =>
                                          cambiarPaisCalendario(u.id_usuario, p.id_proyecto, e.target.value)
                                        }
                                        disabled={guardandoPais}
                                        className="rounded-md border border-gray-300 px-2 py-0.5 text-xs bg-white disabled:opacity-50"
                                      >
                                        <option value="">Sin calendario de feriados</option>
                                        {paisesCalendario.map((pc) => (
                                          <option key={pc.id_maestro} value={pc.id_maestro}>
                                            {pc.valor}
                                          </option>
                                        ))}
                                      </select>
                                      {guardandoPais && <Spinner className="h-3 w-3" />}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Carga masiva por Excel</h2>
        <p className="text-sm text-gray-500">
          Descarga la plantilla, llenala con los nuevos usuarios y volve a subirla. Los que ya existan
          (mismo email) no se vuelven a crear -- se avisa cuales se saltearon.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={descargarPlantilla}
            disabled={descargandoPlantilla}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {descargandoPlantilla && <Spinner />}
            Descargar plantilla
          </button>
          <input ref={inputArchivoRef} type="file" accept=".xlsx" className="text-sm" />
          <button
            onClick={importarExcel}
            disabled={importando}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {importando && <Spinner />}
            Importar
          </button>
        </div>

        {resultadosImport && (
          <div className="overflow-x-auto border border-gray-100 rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Fila</th>
                  <th className="px-3 py-1.5 font-medium">Nombre</th>
                  <th className="px-3 py-1.5 font-medium">Email</th>
                  <th className="px-3 py-1.5 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultadosImport.map((r) => (
                  <tr key={r.fila} className={r.ok ? "" : "bg-red-50"}>
                    <td className="px-3 py-1.5">{r.fila}</td>
                    <td className="px-3 py-1.5">
                      {r.nombres} {r.apellidos}
                    </td>
                    <td className="px-3 py-1.5">{r.email || "-"}</td>
                    <td className={`px-3 py-1.5 ${r.ok ? "text-green-700" : "text-red-600 font-medium"}`}>
                      {r.mensaje}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
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
