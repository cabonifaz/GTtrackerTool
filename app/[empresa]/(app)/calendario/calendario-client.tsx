"use client";

import { useState } from "react";
import { Feriado, FeriadoAdmin, MaestroItem, MiProyecto } from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatearFecha(fechaISO: string) {
  const [y, m, d] = fechaISO.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

function diaSemana(fechaISO: string) {
  const [y, m, d] = fechaISO.slice(0, 10).split("-").map(Number);
  return DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function etiquetaDias(dias: number) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "en 1 dia";
  return `en ${dias} dias`;
}

export default function CalendarioClient({
  esAdmin,
  paisesIniciales,
  feriadosTodosIniciales,
  idPaisAdminInicial,
  misProyectosIniciales,
  proximosIniciales,
  anioCompletoIniciales,
}: {
  esAdmin: boolean;
  paisesIniciales: MaestroItem[];
  feriadosTodosIniciales: FeriadoAdmin[];
  idPaisAdminInicial: string;
  misProyectosIniciales: MiProyecto[];
  proximosIniciales: Feriado[];
  anioCompletoIniciales: Feriado[];
}) {
  const anioActual = new Date().getFullYear();

  // Talento
  const [misProyectos, setMisProyectos] = useState<MiProyecto[]>(misProyectosIniciales);
  const [cambiandoDefault, setCambiandoDefault] = useState(false);

  // Admin
  const [paises] = useState<MaestroItem[]>(paisesIniciales);
  const [idPaisAdmin, setIdPaisAdmin] = useState(idPaisAdminInicial);
  const [feriadosTodos, setFeriadosTodos] = useState<FeriadoAdmin[]>(feriadosTodosIniciales);
  const [formPais, setFormPais] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [creandoFeriado, setCreandoFeriado] = useState(false);
  const [eliminandoFeriadoId, setEliminandoFeriadoId] = useState<number | null>(null);
  const [importPais, setImportPais] = useState("");
  const [importAnio, setImportAnio] = useState(String(new Date().getFullYear() + 1));
  const [reemplazarAnio, setReemplazarAnio] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState<string | null>(null);

  // Compartido
  const [proximos, setProximos] = useState<Feriado[]>(proximosIniciales);
  const [anioCompleto, setAnioCompleto] = useState<Feriado[]>(anioCompletoIniciales);
  const [cargandoCalendario, setCargandoCalendario] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarCalendarioPara(idPais: number) {
    setCargandoCalendario(true);
    try {
      const [proximosData, anioData] = await Promise.all([
        fetchJson<Feriado[]>(`/api/feriados/proximos?idPais=${idPais}&limite=5`),
        fetchJson<Feriado[]>(`/api/feriados?idPais=${idPais}&anio=${anioActual}`),
      ]);
      setProximos(proximosData);
      setAnioCompleto(anioData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el calendario");
    }
    setCargandoCalendario(false);
  }

  async function cambiarPredeterminado(idProyecto: number) {
    setCambiandoDefault(true);
    setError(null);
    const res = await fetch("/api/usuario-proyectos/predeterminado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idProyecto }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setCambiandoDefault(false);
      return;
    }
    const actualizados = misProyectos.map((p) => ({
      ...p,
      predeterminado: p.id_proyecto === idProyecto ? 1 : 0,
    }));
    setMisProyectos(actualizados);
    const nuevo = actualizados.find((p) => p.id_proyecto === idProyecto);
    if (nuevo?.id_pais_calendario) await cargarCalendarioPara(nuevo.id_pais_calendario);
    setCambiandoDefault(false);
  }

  async function cambiarPaisAdmin(idPais: string) {
    setIdPaisAdmin(idPais);
    if (idPais) await cargarCalendarioPara(Number(idPais));
  }

  async function crearFeriado() {
    if (!formPais || !formFecha || !formNombre.trim()) return;
    setCreandoFeriado(true);
    setError(null);
    const res = await fetch("/api/feriados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPais: Number(formPais), fecha: formFecha, nombre: formNombre.trim() }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setCreandoFeriado(false);
      return;
    }
    setFormFecha("");
    setFormNombre("");
    try {
      setFeriadosTodos(await fetchJson<FeriadoAdmin[]>("/api/feriados/todos"));
    } catch {
      // no bloquea el flujo si solo falla el refresco de la lista
    }
    if (idPaisAdmin && Number(formPais) === Number(idPaisAdmin)) {
      await cargarCalendarioPara(Number(idPaisAdmin));
    }
    setCreandoFeriado(false);
  }

  async function eliminarFeriado(id: number) {
    setEliminandoFeriadoId(id);
    await fetch(`/api/feriados/${id}`, { method: "DELETE" });
    setFeriadosTodos((prev) => prev.filter((f) => f.id_feriado !== id));
    if (idPaisAdmin) await cargarCalendarioPara(Number(idPaisAdmin));
    setEliminandoFeriadoId(null);
  }

  function cambiarImportAnio(valor: string) {
    setImportAnio(valor);
    if (Number(valor) <= anioActual) setReemplazarAnio(false);
  }

  async function importarAnio() {
    if (!importPais || !importAnio) return;
    setImportando(true);
    setError(null);
    setMensajeImport(null);
    const res = await fetch("/api/feriados/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idPais: Number(importPais),
        anio: Number(importAnio),
        reemplazar: reemplazarAnio,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo importar el calendario");
      setImportando(false);
      return;
    }
    const resultado = await res.json();
    setMensajeImport(`Se importaron ${resultado.total} feriados de ${resultado.pais} para ${resultado.anio}.`);
    try {
      setFeriadosTodos(await fetchJson<FeriadoAdmin[]>("/api/feriados/todos"));
    } catch {
      // no bloquea el flujo si solo falla el refresco de la lista
    }
    if (idPaisAdmin && Number(importPais) === Number(idPaisAdmin)) {
      await cargarCalendarioPara(Number(idPaisAdmin));
    }
    setImportando(false);
  }

  const predeterminado = misProyectos.find((p) => p.predeterminado === 1);
  const feriadoInminente =
    proximos[0] && proximos[0].dias_faltantes !== undefined && proximos[0].dias_faltantes <= 3;
  const anioNoHaComenzado = Number(importAnio) > anioActual;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Calendario</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!esAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          {misProyectos.length === 0 ? (
            <p className="text-sm text-gray-500">
              No tienes un proyecto asignado todavia. Pidele al Admin que te asigne uno para ver tu
              calendario de feriados.
            </p>
          ) : !predeterminado?.id_pais_calendario ? (
            <p className="text-sm text-gray-500">
              Tu proyecto predeterminado (<strong>{predeterminado?.proyecto}</strong>) no tiene un
              calendario de feriados configurado. Pidele al Admin que lo configure.
            </p>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Tu calendario</p>
              <p className="text-lg font-semibold">{predeterminado.pais}</p>
              <p className="text-sm text-gray-500">
                segun el proyecto <strong>{predeterminado.proyecto}</strong>
              </p>
            </div>
          )}

          {misProyectos.length > 1 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Cambiar proyecto predeterminado</p>
              <div className="flex flex-wrap gap-2">
                {misProyectos.map((p) => (
                  <button
                    key={p.id_proyecto}
                    onClick={() => cambiarPredeterminado(p.id_proyecto)}
                    disabled={cambiandoDefault || p.predeterminado === 1}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border disabled:cursor-default ${
                      p.predeterminado === 1
                        ? "bg-[var(--color-primario)] text-white border-[var(--color-primario)]"
                        : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {p.proyecto}
                    {p.pais ? ` (${p.pais})` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {esAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1">
          <label className="text-sm font-medium">Ver calendario de</label>
          <select
            value={idPaisAdmin}
            onChange={(e) => cambiarPaisAdmin(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {paises.map((p) => (
              <option key={p.id_maestro} value={p.id_maestro}>
                {p.valor}
              </option>
            ))}
          </select>
        </div>
      )}

      {feriadoInminente && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Proximo feriado: <strong>{proximos[0].nombre}</strong> el {formatearFecha(proximos[0].fecha)} (
          {etiquetaDias(proximos[0].dias_faltantes!)})
        </div>
      )}

      {cargandoCalendario ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <CargandoInline />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium mb-3">Proximos feriados</p>
            {proximos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin feriados proximos registrados.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {proximos.map((f) => (
                  <li key={f.id_feriado} className="py-2 flex justify-between text-sm">
                    <span>{f.nombre}</span>
                    <span className="text-gray-500">
                      {formatearFecha(f.fecha)} · {etiquetaDias(f.dias_faltantes!)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium mb-3">Calendario completo {anioActual}</p>
            {anioCompleto.length === 0 ? (
              <p className="text-sm text-gray-400">Sin feriados registrados para este anio.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {anioCompleto.map((f) => (
                  <li key={f.id_feriado} className="py-2 flex justify-between text-sm">
                    <span>{f.nombre}</span>
                    <span className="text-gray-500">
                      {diaSemana(f.fecha)} {formatearFecha(f.fecha)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {esAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium">Importar calendario oficial de un anio</p>
          <p className="text-xs text-gray-500">
            Trae los feriados publicos de ese pais/anio desde una fuente oficial en internet
            (date.nager.at). Si ya existen feriados para esas fechas, se actualizan en vez de
            duplicarse.
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <select
              value={importPais}
              onChange={(e) => setImportPais(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Pais</option>
              {paises.map((p) => (
                <option key={p.id_maestro} value={p.id_maestro}>
                  {p.valor}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={importAnio}
              onChange={(e) => cambiarImportAnio(e.target.value)}
              placeholder="Anio"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={importarAnio}
              disabled={importando || !importPais || !importAnio}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 sm:col-span-2"
            >
              {importando && <Spinner />}
              Importar desde internet
            </button>
          </div>

          <label
            className={`flex items-start gap-2 text-xs ${
              anioNoHaComenzado ? "text-gray-600" : "text-gray-400"
            }`}
          >
            <input
              type="checkbox"
              checked={reemplazarAnio}
              onChange={(e) => setReemplazarAnio(e.target.checked)}
              disabled={!anioNoHaComenzado}
              className="mt-0.5"
            />
            <span>
              Reemplazar los feriados que ya tenga cargados ese pais/anio (en vez de solo agregar/actualizar).
              {!anioNoHaComenzado && " Solo disponible para un anio que todavia no comenzo."}
            </span>
          </label>

          {mensajeImport && <p className="text-sm text-green-700">{mensajeImport}</p>}
        </div>
      )}

      {esAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
          <p className="text-sm font-medium">Administrar feriados</p>
          <div className="grid gap-2 sm:grid-cols-4">
            <select
              value={formPais}
              onChange={(e) => setFormPais(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Pais</option>
              {paises.map((p) => (
                <option key={p.id_maestro} value={p.id_maestro}>
                  {p.valor}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={formFecha}
              onChange={(e) => setFormFecha(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              placeholder="Nombre del feriado"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          <button
            onClick={crearFeriado}
            disabled={creandoFeriado || !formPais || !formFecha || !formNombre.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {creandoFeriado && <Spinner />}
            Agregar feriado
          </button>

          <div className="overflow-x-auto border border-gray-100 rounded-md max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-500 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Pais</th>
                  <th className="px-3 py-1.5 font-medium">Fecha</th>
                  <th className="px-3 py-1.5 font-medium">Nombre</th>
                  <th className="px-3 py-1.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feriadosTodos.map((f) => (
                  <tr key={f.id_feriado}>
                    <td className="px-3 py-1.5">{f.pais}</td>
                    <td className="px-3 py-1.5">{formatearFecha(f.fecha)}</td>
                    <td className="px-3 py-1.5">{f.nombre}</td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => eliminarFeriado(f.id_feriado)}
                        disabled={eliminandoFeriadoId === f.id_feriado}
                        className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 underline disabled:opacity-50"
                      >
                        {eliminandoFeriadoId === f.id_feriado && <Spinner className="h-3 w-3" />}
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {feriadosTodos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                      Sin feriados registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
