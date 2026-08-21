"use client";

import { useRef, useState, FormEvent } from "react";
import { Ausencia, AusenciaAdmin, MaestroItem, SaldoVacaciones, Usuario } from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import BuscadorTalento from "@/components/BuscadorTalento";
import SelectorTalentosMultiple from "@/components/SelectorTalentosMultiple";
import { fetchJson } from "@/lib/fetchJson";

type TabAdmin = "solicitudes" | "saldos";

const ESTADOS_FILTRO = [
  { codigo: "PENDIENTE", label: "Pendientes" },
  { codigo: "APROBADA", label: "Aprobadas" },
  { codigo: "RECHAZADA", label: "Rechazadas" },
  { codigo: "", label: "Todas" },
];

function badgeEstado(codigo: string) {
  if (codigo === "APROBADA") return "text-green-600";
  if (codigo === "RECHAZADA") return "text-red-600";
  return "text-amber-600";
}

export default function DiasOffClient({
  esAdmin,
  tiposIniciales,
  misAusenciasIniciales,
  saldoInicial,
  pendientesIniciales,
  talentosIniciales,
  anioActual,
}: {
  esAdmin: boolean;
  tiposIniciales: MaestroItem[];
  misAusenciasIniciales: Ausencia[];
  saldoInicial: SaldoVacaciones | null;
  pendientesIniciales: AusenciaAdmin[];
  talentosIniciales: Usuario[];
  anioActual: number;
}) {
  const [tipos] = useState<MaestroItem[]>(tiposIniciales);
  const [error, setError] = useState<string | null>(null);

  // Talento
  const [misAusencias, setMisAusencias] = useState<Ausencia[]>(misAusenciasIniciales);
  const [saldo, setSaldo] = useState<SaldoVacaciones | null>(saldoInicial);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const evidenciaRef = useRef<HTMLInputElement>(null);

  // Admin
  const [tabAdmin, setTabAdmin] = useState<TabAdmin>("solicitudes");
  const [ausencias, setAusencias] = useState<AusenciaAdmin[]>(pendientesIniciales);
  const [filtroEstado, setFiltroEstado] = useState("PENDIENTE");
  const [idsFiltroTalento, setIdsFiltroTalento] = useState<number[]>([]);
  const [cargandoAusencias, setCargandoAusencias] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [talentos] = useState<Usuario[]>(talentosIniciales);
  const [mostrandoFormRegistro, setMostrandoFormRegistro] = useState(false);
  const [idTalentoRegistro, setIdTalentoRegistro] = useState<number | null>(null);
  const [enviandoRegistro, setEnviandoRegistro] = useState(false);
  const evidenciaRegistroRef = useRef<HTMLInputElement>(null);
  const [saldoTalentoId, setSaldoTalentoId] = useState(talentosIniciales[0] ? String(talentosIniciales[0].id_usuario) : "");
  const [saldoAnio, setSaldoAnio] = useState(anioActual);
  const [saldoAdmin, setSaldoAdmin] = useState<SaldoVacaciones | null>(null);
  const [diasAsignadosForm, setDiasAsignadosForm] = useState("");
  const [guardandoSaldo, setGuardandoSaldo] = useState(false);
  const [cargandoSaldoAdmin, setCargandoSaldoAdmin] = useState(false);

  async function recargarMisAusencias() {
    try {
      setMisAusencias(await fetchJson<Ausencia[]>("/api/ausencias"));
      setSaldo(await fetchJson<SaldoVacaciones>(`/api/saldos-vacaciones?anio=${anioActual}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron recargar tus ausencias");
    }
  }

  async function solicitar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviandoSolicitud(true);
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const res = await fetch("/api/ausencias", { method: "POST", body: formData });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviandoSolicitud(false);
      return;
    }
    formEl.reset();
    await recargarMisAusencias();
    setEnviandoSolicitud(false);
  }

  async function buscarAusenciasAdmin() {
    setCargandoAusencias(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      if (idsFiltroTalento.length > 0) params.set("idsUsuario", idsFiltroTalento.join(","));
      setAusencias(await fetchJson<AusenciaAdmin[]>(`/api/ausencias/todas?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las ausencias");
    }
    setCargandoAusencias(false);
  }

  function alternarFiltroTalento(id: number) {
    setIdsFiltroTalento((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function registrarAusenciaAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!idTalentoRegistro) {
      setError("Busca y selecciona un talento");
      return;
    }
    setEnviandoRegistro(true);
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    formData.set("idUsuario", String(idTalentoRegistro));
    const res = await fetch("/api/ausencias/admin", { method: "POST", body: formData });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviandoRegistro(false);
      return;
    }
    formEl.reset();
    setIdTalentoRegistro(null);
    setMostrandoFormRegistro(false);
    await buscarAusenciasAdmin();
    setEnviandoRegistro(false);
  }

  async function aprobar(id: number) {
    setProcesandoId(id);
    setError(null);
    const res = await fetch(`/api/ausencias/${id}/aprobar`, { method: "POST" });
    if (!res.ok) {
      setError((await res.json()).error);
    } else {
      await buscarAusenciasAdmin();
    }
    setProcesandoId(null);
  }

  async function rechazar(id: number) {
    setProcesandoId(id);
    setError(null);
    const res = await fetch(`/api/ausencias/${id}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivoRechazo: motivoRechazo || null }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
    } else {
      setRechazandoId(null);
      setMotivoRechazo("");
      await buscarAusenciasAdmin();
    }
    setProcesandoId(null);
  }

  async function buscarSaldoAdmin() {
    if (!saldoTalentoId) return;
    setCargandoSaldoAdmin(true);
    setError(null);
    try {
      const s = await fetchJson<SaldoVacaciones>(
        `/api/saldos-vacaciones?idUsuario=${saldoTalentoId}&anio=${saldoAnio}`
      );
      setSaldoAdmin(s);
      setDiasAsignadosForm(String(s.dias_asignados));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el saldo");
    }
    setCargandoSaldoAdmin(false);
  }

  async function guardarSaldo() {
    if (!saldoTalentoId || !diasAsignadosForm) return;
    setGuardandoSaldo(true);
    setError(null);
    const res = await fetch("/api/saldos-vacaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idUsuario: Number(saldoTalentoId),
        anio: saldoAnio,
        diasAsignados: Number(diasAsignadosForm),
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
    } else {
      await buscarSaldoAdmin();
    }
    setGuardandoSaldo(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Dias Off</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!esAdmin && (
        <>
          {saldo && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Vacaciones {anioActual}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {Number(saldo.dias_asignados) - Number(saldo.dias_usados)} dias disponibles
                </p>
                <p className="text-xs text-gray-400">
                  {saldo.dias_usados} usados de {saldo.dias_asignados} asignados
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={solicitar}
            className="rounded-lg border border-gray-200 bg-white p-4 grid gap-2 sm:grid-cols-2"
          >
            <p className="text-sm font-medium sm:col-span-2">Solicitar dia off</p>
            <select name="idTipo" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Selecciona un tipo</option>
              {tipos.map((t) => (
                <option key={t.id_maestro} value={t.id_maestro}>
                  {t.valor}
                </option>
              ))}
            </select>
            <input
              name="motivo"
              placeholder="Motivo (opcional)"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Desde</label>
              <input
                type="date"
                name="fechaInicio"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hasta</label>
              <input
                type="date"
                name="fechaFin"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-gray-500">Evidencia (opcional, foto, maximo 3MB)</label>
              <input
                ref={evidenciaRef}
                type="file"
                name="evidencia"
                accept="image/*"
                className="w-full text-sm"
              />
            </div>
            <button
              disabled={enviandoSolicitud}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 sm:col-span-2 sm:w-fit"
            >
              {enviandoSolicitud && <Spinner />}
              Enviar solicitud
            </button>
          </form>

          <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Desde</th>
                  <th className="px-4 py-2 font-medium">Hasta</th>
                  <th className="px-4 py-2 font-medium">Motivo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {misAusencias.map((a) => (
                  <tr key={a.id_ausencia}>
                    <td className="px-4 py-2">{a.tipo}</td>
                    <td className="px-4 py-2 text-gray-500">{a.fecha_inicio.slice(0, 10)}</td>
                    <td className="px-4 py-2 text-gray-500">{a.fecha_fin.slice(0, 10)}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {a.motivo ?? "-"}
                      {a.codigo_estado === "RECHAZADA" && a.motivo_rechazo && (
                        <span className="block text-xs text-red-500">Motivo rechazo: {a.motivo_rechazo}</span>
                      )}
                    </td>
                    <td className={`px-4 py-2 font-medium ${badgeEstado(a.codigo_estado)}`}>{a.estado}</td>
                    <td className="px-4 py-2">
                      {a.tiene_evidencia === 1 && (
                        <a
                          href={`/api/ausencias/${a.id_ausencia}/evidencia`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-500 hover:text-gray-900 underline"
                        >
                          Ver evidencia
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {misAusencias.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      Sin solicitudes registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {esAdmin && (
        <>
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setTabAdmin("solicitudes")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tabAdmin === "solicitudes"
                  ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                  : "border-transparent text-gray-500"
              }`}
            >
              Solicitudes
            </button>
            <button
              onClick={() => setTabAdmin("saldos")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tabAdmin === "saldos"
                  ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                  : "border-transparent text-gray-500"
              }`}
            >
              Saldos de vacaciones
            </button>
          </div>

          {tabAdmin === "solicitudes" && (
            <div className="space-y-4">
              {!mostrandoFormRegistro ? (
                <button
                  onClick={() => setMostrandoFormRegistro(true)}
                  className="text-sm text-[var(--color-primario)] underline"
                >
                  + Registrar ausencia
                </button>
              ) : (
                <form
                  onSubmit={registrarAusenciaAdmin}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
                >
                  <p className="text-sm font-medium">
                    Registrar ausencia ya aprobada (enfermedad, vacaciones coordinadas, etc.)
                  </p>
                  <BuscadorTalento talentos={talentos} idSeleccionado={idTalentoRegistro} onSeleccionar={setIdTalentoRegistro} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select name="idTipo" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <option value="">Selecciona un tipo</option>
                      {tipos.map((t) => (
                        <option key={t.id_maestro} value={t.id_maestro}>
                          {t.valor}
                        </option>
                      ))}
                    </select>
                    <input
                      name="motivo"
                      placeholder="Motivo (opcional)"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Desde</label>
                      <input
                        type="date"
                        name="fechaInicio"
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Hasta</label>
                      <input
                        type="date"
                        name="fechaFin"
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-gray-500">Evidencia (opcional, foto, maximo 3MB)</label>
                      <input
                        ref={evidenciaRegistroRef}
                        type="file"
                        name="evidencia"
                        accept="image/*"
                        className="w-full text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={enviandoRegistro}
                      className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                    >
                      {enviandoRegistro && <Spinner />}
                      Registrar (queda aprobada)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrandoFormRegistro(false)}
                      className="text-sm text-gray-500 underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Estado</label>
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {ESTADOS_FILTRO.map((e) => (
                        <option key={e.codigo} value={e.codigo}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={buscarAusenciasAdmin}
                    disabled={cargandoAusencias}
                    className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                  >
                    {cargandoAusencias && <Spinner />}
                    Buscar
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Talentos (vacio = todos)</label>
                  <SelectorTalentosMultiple
                    talentos={talentos}
                    idsSeleccionados={idsFiltroTalento}
                    onAlternar={alternarFiltroTalento}
                    todosLosUsuarios={talentos}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                {cargandoAusencias ? (
                  <CargandoInline texto="Buscando solicitudes..." />
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Colaborador</th>
                        <th className="px-4 py-2 font-medium">Tipo</th>
                        <th className="px-4 py-2 font-medium">Desde</th>
                        <th className="px-4 py-2 font-medium">Hasta</th>
                        <th className="px-4 py-2 font-medium">Motivo</th>
                        <th className="px-4 py-2 font-medium">Estado</th>
                        <th className="px-4 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ausencias.map((a) => (
                        <tr key={a.id_ausencia}>
                          <td className="px-4 py-2">{a.colaborador}</td>
                          <td className="px-4 py-2 text-gray-500">{a.tipo}</td>
                          <td className="px-4 py-2 text-gray-500">{a.fecha_inicio.slice(0, 10)}</td>
                          <td className="px-4 py-2 text-gray-500">{a.fecha_fin.slice(0, 10)}</td>
                          <td className="px-4 py-2 text-gray-500">
                            {a.motivo ?? "-"}
                            {a.tiene_evidencia === 1 && (
                              <a
                                href={`/api/ausencias/${a.id_ausencia}/evidencia`}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-xs text-gray-500 underline"
                              >
                                Ver evidencia
                              </a>
                            )}
                          </td>
                          <td className={`px-4 py-2 font-medium ${badgeEstado(a.codigo_estado)}`}>{a.estado}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.codigo_estado === "PENDIENTE" && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => aprobar(a.id_ausencia)}
                                  disabled={procesandoId === a.id_ausencia}
                                  className="inline-flex items-center gap-1 text-green-700 underline disabled:opacity-50"
                                >
                                  {procesandoId === a.id_ausencia && <Spinner className="h-3 w-3" />}
                                  Aprobar
                                </button>
                                {rechazandoId === a.id_ausencia ? (
                                  <span className="inline-flex items-center gap-1">
                                    <input
                                      value={motivoRechazo}
                                      onChange={(e) => setMotivoRechazo(e.target.value)}
                                      placeholder="Motivo"
                                      className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs"
                                    />
                                    <button
                                      onClick={() => rechazar(a.id_ausencia)}
                                      disabled={procesandoId === a.id_ausencia}
                                      className="text-red-700 underline disabled:opacity-50"
                                    >
                                      Confirmar
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setRechazandoId(a.id_ausencia)}
                                    className="text-red-700 underline"
                                  >
                                    Rechazar
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {ausencias.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                            Sin solicitudes para este filtro
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tabAdmin === "saldos" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Talento</label>
                  <select
                    value={saldoTalentoId}
                    onChange={(e) => setSaldoTalentoId(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona un talento</option>
                    {talentos.map((t) => (
                      <option key={t.id_usuario} value={t.id_usuario}>
                        {t.nombres} {t.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Anio</label>
                  <input
                    type="number"
                    value={saldoAnio}
                    onChange={(e) => setSaldoAnio(Number(e.target.value))}
                    className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={buscarSaldoAdmin}
                  disabled={cargandoSaldoAdmin || !saldoTalentoId}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                >
                  {cargandoSaldoAdmin && <Spinner />}
                  Ver saldo
                </button>
              </div>

              {saldoAdmin && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <p className="text-sm text-gray-600">
                    Usados: <strong>{saldoAdmin.dias_usados}</strong> de{" "}
                    <strong>{saldoAdmin.dias_asignados}</strong> asignados (
                    {Number(saldoAdmin.dias_asignados) - Number(saldoAdmin.dias_usados)} disponibles)
                  </p>
                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Dias asignados para {saldoAnio}</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={diasAsignadosForm}
                        onChange={(e) => setDiasAsignadosForm(e.target.value)}
                        className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={guardarSaldo}
                      disabled={guardandoSaldo}
                      className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                    >
                      {guardandoSaldo && <Spinner />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
