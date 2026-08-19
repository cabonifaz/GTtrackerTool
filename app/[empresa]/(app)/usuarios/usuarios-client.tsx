"use client";

import { useRef, useState, FormEvent } from "react";
import { ImportarUsuarioResultado, Usuario, UsuarioSistema } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";
import { PASSWORD_GENERICA } from "@/lib/constants";

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
  const [idsProcesando, setIdsProcesando] = useState<Set<number | string>>(new Set());
  const [editandoUsuario, setEditandoUsuario] = useState<number | null>(null);

  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultadosImport, setResultadosImport] = useState<ImportarUsuarioResultado[] | null>(null);

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

        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {usuarios.map((u) => (
            <li key={u.id_usuario} className="px-4 py-3 text-sm space-y-2">
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
                    onClick={() => setEditandoUsuario(editandoUsuario === u.id_usuario ? null : u.id_usuario)}
                    className="text-gray-500 hover:text-gray-900 underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => alternarActivo(u)}
                    disabled={idsProcesando.has(u.id_usuario)}
                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
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
            </li>
          ))}
        </ul>
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
