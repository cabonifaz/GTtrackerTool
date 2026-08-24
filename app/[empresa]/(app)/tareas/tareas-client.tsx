"use client";

import { useRef, useState, FormEvent } from "react";
import {
  Cliente,
  ImportarPerfilResultado,
  MaestroItem,
  Perfil,
  Proyecto,
  Tarea,
  Usuario,
  UsuarioAsignado,
} from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import Badge from "@/components/Badge";
import SelectorTalentosMultiple from "@/components/SelectorTalentosMultiple";
import { fetchJson } from "@/lib/fetchJson";

type Tab = "clientes" | "proyectos" | "tareas" | "perfiles";

function normalizarBusqueda(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function formatearHorasMin(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function TareasClient({
  esAdmin,
  clientesIniciales,
  proyectosIniciales,
  tareasIniciales,
  talentosIniciales,
  paisesCalendarioIniciales,
  monedasIniciales,
  perfilesIniciales,
}: {
  esAdmin: boolean;
  clientesIniciales: Cliente[];
  proyectosIniciales: Proyecto[];
  tareasIniciales: Tarea[];
  talentosIniciales: Usuario[];
  paisesCalendarioIniciales: MaestroItem[];
  monedasIniciales: MaestroItem[];
  perfilesIniciales: Perfil[];
}) {
  const [tab, setTab] = useState<Tab>("tareas");
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosIniciales);
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [finalizandoTarea, setFinalizandoTarea] = useState<number | null>(null);
  const [eliminandoTarea, setEliminandoTarea] = useState<number | null>(null);

  // Busqueda de tareas por talento(s), solo Admin -- no se trae la lista
  // completa por defecto (ver comentario en page.tsx), se busca a pedido.
  const [talentosFiltro, setTalentosFiltro] = useState<number[]>([]);
  const [tareasFiltradas, setTareasFiltradas] = useState<Tarea[] | null>(null);
  const [buscandoTareasFiltradas, setBuscandoTareasFiltradas] = useState(false);

  // Asignacion de talentos a proyectos (solo Admin) -- el Admin tambien
  // cuenta como talento: puede asignarse a si mismo a un proyecto.
  const [talentos] = useState<Usuario[]>(talentosIniciales.filter((u) => u.activo));
  const [panelAbierto, setPanelAbierto] = useState<number | null>(null);
  const [filtroAsignacion, setFiltroAsignacion] = useState("");
  const [asignadosPorProyecto, setAsignadosPorProyecto] = useState<Record<number, UsuarioAsignado[]>>({});
  const [procesandoAsignacion, setProcesandoAsignacion] = useState<Set<string>>(new Set());

  // Pais de calendario por asignacion talento-proyecto (solo Admin)
  const [paisesCalendario] = useState<MaestroItem[]>(paisesCalendarioIniciales);
  const [guardandoPaisAsignacion, setGuardandoPaisAsignacion] = useState<string | null>(null);
  const [guardandoPerfilAsignacion, setGuardandoPerfilAsignacion] = useState<string | null>(null);

  // Perfiles de cobro por cliente (solo Admin)
  const [monedas] = useState<MaestroItem[]>(monedasIniciales);
  const [perfiles, setPerfiles] = useState<Perfil[]>(perfilesIniciales);
  const [perfilClienteFiltro, setPerfilClienteFiltro] = useState<string>(
    clientesIniciales[0] ? String(clientesIniciales[0].id_cliente) : ""
  );
  const [enviandoPerfil, setEnviandoPerfil] = useState(false);
  const [editandoTarifaPerfil, setEditandoTarifaPerfil] = useState<number | null>(null);
  const [tarifaEdit, setTarifaEdit] = useState("");
  const [monedaEdit, setMonedaEdit] = useState("");
  const [guardandoTarifaPerfil, setGuardandoTarifaPerfil] = useState(false);
  const [desactivandoPerfil, setDesactivandoPerfil] = useState<number | null>(null);

  // Carga masiva de tarifario por Excel (solo Admin)
  const inputArchivoPerfilRef = useRef<HTMLInputElement>(null);
  const [monedaImportPerfil, setMonedaImportPerfil] = useState("");
  const [descargandoPlantillaPerfil, setDescargandoPlantillaPerfil] = useState(false);
  const [importandoPerfil, setImportandoPerfil] = useState(false);
  const [resultadosImportPerfil, setResultadosImportPerfil] = useState<ImportarPerfilResultado[] | null>(null);

  async function cargarTodo() {
    try {
      const [c, p, t] = await Promise.all([
        fetchJson<Cliente[]>("/api/clientes"),
        fetchJson<Proyecto[]>("/api/proyectos"),
        fetchJson<Tarea[]>("/api/tareas"),
      ]);
      setClientes(c);
      setProyectos(p);
      setTareas(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    }
  }

  async function cargarPerfiles() {
    try {
      setPerfiles(await fetchJson<Perfil[]>("/api/perfiles"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los perfiles");
    }
  }

  async function crearPerfilAccion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviandoPerfil(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/perfiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCliente: Number(form.get("idCliente")),
        nombre: form.get("nombre"),
        codigoExterno: form.get("codigoExterno") || null,
        tarifa: Number(form.get("tarifa")),
        idMoneda: Number(form.get("idMoneda")),
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviandoPerfil(false);
      return;
    }
    formEl.reset();
    await cargarPerfiles();
    setEnviandoPerfil(false);
  }

  function empezarEdicionTarifa(p: Perfil) {
    setEditandoTarifaPerfil(p.id_perfil);
    setTarifaEdit(p.tarifa !== null ? String(p.tarifa) : "");
    setMonedaEdit(p.id_moneda !== null ? String(p.id_moneda) : "");
  }

  async function guardarTarifaPerfil(idPerfil: number) {
    if (!tarifaEdit || !monedaEdit) return;
    setGuardandoTarifaPerfil(true);
    setError(null);
    const res = await fetch(`/api/perfiles/${idPerfil}/tarifa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tarifa: Number(tarifaEdit), idMoneda: Number(monedaEdit) }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setGuardandoTarifaPerfil(false);
      return;
    }
    setEditandoTarifaPerfil(null);
    await cargarPerfiles();
    setGuardandoTarifaPerfil(false);
  }

  async function desactivarPerfilAccion(idPerfil: number) {
    setDesactivandoPerfil(idPerfil);
    await fetch(`/api/perfiles/${idPerfil}`, { method: "DELETE" });
    await cargarPerfiles();
    setDesactivandoPerfil(null);
  }

  async function descargarPlantillaPerfil() {
    setDescargandoPlantillaPerfil(true);
    setError(null);
    const res = await fetch("/api/perfiles/plantilla");
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo descargar la plantilla");
      setDescargandoPlantillaPerfil(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_tarifario.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    setDescargandoPlantillaPerfil(false);
  }

  async function importarExcelPerfil() {
    const archivo = inputArchivoPerfilRef.current?.files?.[0];
    if (!archivo || !perfilClienteFiltro || !monedaImportPerfil) return;

    setImportandoPerfil(true);
    setResultadosImportPerfil(null);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("idCliente", perfilClienteFiltro);
    formData.append("idMoneda", monedaImportPerfil);
    const moneda = monedas.find((m) => String(m.id_maestro) === monedaImportPerfil);
    formData.append("codigoMoneda", moneda?.codigo ?? "");

    const res = await fetch("/api/perfiles/importar", { method: "POST", body: formData });
    setImportandoPerfil(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo importar el archivo");
      return;
    }
    const resultados: ImportarPerfilResultado[] = await res.json();
    setResultadosImportPerfil(resultados);
    if (inputArchivoPerfilRef.current) inputArchivoPerfilRef.current.value = "";
    await cargarPerfiles();
  }

  async function crearCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: form.get("nombre") }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviando(false);
      return;
    }
    formEl.reset();
    await cargarTodo();
    setEnviando(false);
  }

  async function crearProyecto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const idCliente = form.get("idCliente");
    const res = await fetch("/api/proyectos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCliente: idCliente ? Number(idCliente) : null,
        nombre: form.get("nombre"),
        descripcion: form.get("descripcion") || null,
        codigoTipoProyecto: form.get("codigoTipoProyecto") || "CRONOMETRO",
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviando(false);
      return;
    }
    formEl.reset();
    await cargarTodo();
    setEnviando(false);
  }

  async function crearTarea(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idProyecto: Number(form.get("idProyecto")),
        nombre: form.get("nombre"),
        descripcion: form.get("descripcion") || null,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviando(false);
      return;
    }
    formEl.reset();
    await cargarTodo();
    setEnviando(false);
  }

  async function finalizarTareaAccion(idTarea: number) {
    setError(null);
    setFinalizandoTarea(idTarea);
    const res = await fetch(`/api/tareas/${idTarea}/finalizar`, { method: "POST" });
    if (!res.ok) {
      setError((await res.json()).error);
      setFinalizandoTarea(null);
      return;
    }
    await cargarTodo();
    setTareasFiltradas((prev) =>
      prev
        ? prev.map((t) => (t.id_tarea === idTarea ? { ...t, estado: "Finalizada", codigo_estado: "FINALIZADA" } : t))
        : prev
    );
    setFinalizandoTarea(null);
  }

  function alternarTalentoFiltro(idUsuario: number) {
    setTalentosFiltro((prev) =>
      prev.includes(idUsuario) ? prev.filter((id) => id !== idUsuario) : [...prev, idUsuario]
    );
  }

  async function buscarTareasPorTalentos() {
    if (talentosFiltro.length === 0) return;
    setError(null);
    setBuscandoTareasFiltradas(true);
    try {
      const ids = talentosFiltro.join(",");
      setTareasFiltradas(await fetchJson<Tarea[]>(`/api/tareas/por-talentos?idsUsuario=${ids}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron buscar las tareas");
    } finally {
      setBuscandoTareasFiltradas(false);
    }
  }

  async function eliminarTareaAccion(idTarea: number) {
    setError(null);
    setEliminandoTarea(idTarea);
    const res = await fetch(`/api/tareas/${idTarea}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json()).error);
      setEliminandoTarea(null);
      return;
    }
    setTareas((prev) => prev.filter((t) => t.id_tarea !== idTarea));
    setTareasFiltradas((prev) => (prev ? prev.filter((t) => t.id_tarea !== idTarea) : prev));
    setEliminandoTarea(null);
  }

  async function abrirPanelAsignacion(idProyecto: number) {
    if (panelAbierto === idProyecto) {
      setPanelAbierto(null);
      return;
    }
    setPanelAbierto(idProyecto);
    setFiltroAsignacion("");
    if (!asignadosPorProyecto[idProyecto]) {
      try {
        const asignados = await fetchJson<UsuarioAsignado[]>(
          `/api/proyectos/${idProyecto}/asignaciones`
        );
        setAsignadosPorProyecto((prev) => ({
          ...prev,
          [idProyecto]: asignados,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las asignaciones");
      }
    }
  }

  async function alternarAsignacion(
    idProyecto: number,
    talento: Usuario,
    asignado: UsuarioAsignado | undefined
  ) {
    const clave = `${idProyecto}:${talento.id_usuario}`;
    setProcesandoAsignacion((prev) => new Set(prev).add(clave));

    if (asignado) {
      await fetch(`/api/proyectos/${idProyecto}/asignaciones?idUsuario=${talento.id_usuario}`, {
        method: "DELETE",
      });
    } else {
      await fetch(`/api/proyectos/${idProyecto}/asignaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idUsuario: talento.id_usuario }),
      });
    }

    setAsignadosPorProyecto((prev) => {
      const actuales = prev[idProyecto] ?? [];
      return {
        ...prev,
        [idProyecto]: asignado
          ? actuales.filter((a) => a.id_usuario !== talento.id_usuario)
          : [
              ...actuales,
              {
                id_usuario: talento.id_usuario,
                nombres: talento.nombres,
                apellidos: talento.apellidos,
                email: talento.email,
                id_pais_calendario: null,
                codigo_pais: null,
                pais: null,
                id_perfil: null,
                perfil: null,
                tarifa: null,
                codigo_moneda: null,
                moneda: null,
              },
            ],
      };
    });
    setProcesandoAsignacion((prev) => {
      const next = new Set(prev);
      next.delete(clave);
      return next;
    });
  }

  async function cambiarPaisAsignacion(idProyecto: number, idUsuario: number, idPaisCalendario: string) {
    const clave = `${idProyecto}:${idUsuario}`;
    setGuardandoPaisAsignacion(clave);
    await fetch(`/api/proyectos/${idProyecto}/asignaciones`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idUsuario, idPaisCalendario: idPaisCalendario || null }),
    });
    const paisSeleccionado = paisesCalendario.find((pc) => String(pc.id_maestro) === idPaisCalendario);
    setAsignadosPorProyecto((prev) => {
      const actuales = prev[idProyecto] ?? [];
      return {
        ...prev,
        [idProyecto]: actuales.map((a) =>
          a.id_usuario === idUsuario
            ? {
                ...a,
                id_pais_calendario: paisSeleccionado ? paisSeleccionado.id_maestro : null,
                codigo_pais: paisSeleccionado ? paisSeleccionado.codigo : null,
                pais: paisSeleccionado ? paisSeleccionado.valor : null,
              }
            : a
        ),
      };
    });
    setGuardandoPaisAsignacion(null);
  }

  async function cambiarPerfilAsignacion(idProyecto: number, idUsuario: number, idPerfil: string) {
    const clave = `${idProyecto}:${idUsuario}`;
    setGuardandoPerfilAsignacion(clave);
    await fetch(`/api/proyectos/${idProyecto}/asignaciones/perfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idUsuario, idPerfil: idPerfil || null }),
    });
    const perfilSeleccionado = perfiles.find((pf) => String(pf.id_perfil) === idPerfil);
    setAsignadosPorProyecto((prev) => {
      const actuales = prev[idProyecto] ?? [];
      return {
        ...prev,
        [idProyecto]: actuales.map((a) =>
          a.id_usuario === idUsuario
            ? {
                ...a,
                id_perfil: perfilSeleccionado ? perfilSeleccionado.id_perfil : null,
                perfil: perfilSeleccionado ? perfilSeleccionado.nombre : null,
                tarifa: perfilSeleccionado ? perfilSeleccionado.tarifa : null,
                codigo_moneda: perfilSeleccionado ? perfilSeleccionado.codigo_moneda : null,
                moneda: perfilSeleccionado ? perfilSeleccionado.moneda : null,
              }
            : a
        ),
      };
    });
    setGuardandoPerfilAsignacion(null);
  }

  function renderListaTareas(lista: Tarea[]) {
    return (
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {lista.map((t) => (
          <li key={t.id_tarea} className="px-4 py-3 text-sm flex justify-between items-center gap-2">
            <span>
              {t.nombre}
              <span className="text-gray-400"> · {t.proyecto}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono tabular-nums">
                {formatearHorasMin(Number(t.total_segundos))} · {(Number(t.total_segundos) / 3600).toFixed(2)} h
              </span>
              <Badge tono={t.codigo_estado === "FINALIZADA" ? "success" : t.codigo_estado === "EN_PROGRESO" ? "warning" : "neutral"}>
                {t.estado}
              </Badge>
              {t.codigo_estado !== "FINALIZADA" && (
                <button
                  onClick={() => finalizarTareaAccion(t.id_tarea)}
                  disabled={finalizandoTarea === t.id_tarea}
                  className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[var(--color-primario)] underline disabled:opacity-50"
                >
                  {finalizandoTarea === t.id_tarea && <Spinner className="h-3 w-3" />}
                  Finalizar
                </button>
              )}
              <button
                onClick={() => eliminarTareaAccion(t.id_tarea)}
                disabled={eliminandoTarea === t.id_tarea}
                className="inline-flex items-center gap-1.5 text-gray-500 hover:text-red-600 underline disabled:opacity-50"
              >
                {eliminandoTarea === t.id_tarea && <Spinner className="h-3 w-3" />}
                Eliminar
              </button>
            </span>
          </li>
        ))}
        {lista.length === 0 && (
          <li className="px-4 py-6 text-sm text-center text-gray-400">Sin tareas registradas</li>
        )}
      </ul>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "tareas", label: "Tareas" },
    { id: "proyectos", label: "Proyectos" },
    { id: "clientes", label: "Clientes" },
    ...(esAdmin ? [{ id: "perfiles" as Tab, label: "Perfiles" }] : []),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Tareas</h1>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {tab === "clientes" && (
            <div className="space-y-4">
              {esAdmin && (
                <form onSubmit={crearCliente} className="flex gap-2">
                  <input
                    name="nombre"
                    required
                    placeholder="Nombre del cliente"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm flex-1"
                  />
                  <button
                    disabled={enviando}
                    className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                  >
                    {enviando && <Spinner />}
                    Agregar
                  </button>
                </form>
              )}
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {clientes.map((c) => (
                  <li key={c.id_cliente} className="px-4 py-3 text-sm flex justify-between">
                    <span>{c.nombre}</span>
                    <span className={c.activo ? "text-green-600" : "text-gray-400"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </li>
                ))}
                {clientes.length === 0 && (
                  <li className="px-4 py-6 text-sm text-center text-gray-400">
                    {esAdmin ? "Sin clientes registrados" : "No tienes clientes asignados todavia"}
                  </li>
                )}
              </ul>
            </div>
          )}

          {tab === "proyectos" && (
            <div className="space-y-4">
              {esAdmin && (
                <form onSubmit={crearProyecto} className="grid gap-2 sm:grid-cols-4">
                  <select name="idCliente" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Sin cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    name="nombre"
                    required
                    placeholder="Nombre del proyecto"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    name="descripcion"
                    placeholder="Descripcion (opcional)"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    name="codigoTipoProyecto"
                    defaultValue="CRONOMETRO"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="CRONOMETRO">Cronometro (tareas)</option>
                    <option value="CLASES">Clases</option>
                    <option value="ACTIVIDADES_EXCEL">Actividades por Excel</option>
                  </select>
                  <p className="text-xs text-gray-400 sm:col-span-4">
                    El tipo de proyecto no se puede cambiar despues de crearlo.
                  </p>
                  <button
                    disabled={enviando}
                    className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 sm:col-span-4 sm:w-fit"
                  >
                    {enviando && <Spinner />}
                    Agregar
                  </button>
                </form>
              )}
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {proyectos.map((p) => (
                  <li key={p.id_proyecto} className="text-sm">
                    <div className="px-4 py-3 flex flex-wrap justify-between items-center gap-2">
                      <span>
                        {p.nombre}
                        {p.cliente && <span className="text-gray-400"> · {p.cliente}</span>}
                        {p.codigo_tipo_proyecto !== "CRONOMETRO" && (
                          <Badge tono="neutral">{p.tipo_proyecto}</Badge>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{p.estado}</span>
                        {esAdmin && (
                          <button
                            onClick={() => abrirPanelAsignacion(p.id_proyecto)}
                            className="text-gray-500 hover:text-gray-900 underline"
                          >
                            {panelAbierto === p.id_proyecto ? "Cerrar" : "Asignar talentos"}
                          </button>
                        )}
                      </div>
                    </div>
                    {esAdmin && panelAbierto === p.id_proyecto && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        {!asignadosPorProyecto[p.id_proyecto] ? (
                          <CargandoInline texto="Cargando asignaciones..." />
                        ) : talentos.length === 0 ? (
                          <p className="text-xs text-gray-400 pt-3">No hay usuarios Talento creados.</p>
                        ) : (
                          <div className="flex flex-col gap-2 pt-3">
                            {talentos.length > 8 && (
                              <input
                                value={filtroAsignacion}
                                onChange={(e) => setFiltroAsignacion(e.target.value)}
                                placeholder="Filtrar por nombre o correo..."
                                className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-xs"
                              />
                            )}
                            {talentos
                              .filter((t) => {
                                const q = normalizarBusqueda(filtroAsignacion);
                                if (!q) return true;
                                const asignado = asignadosPorProyecto[p.id_proyecto]?.some(
                                  (a) => a.id_usuario === t.id_usuario
                                );
                                return asignado || normalizarBusqueda(`${t.nombres} ${t.apellidos} ${t.email}`).includes(q);
                              })
                              .map((t) => {
                              const asignado = asignadosPorProyecto[p.id_proyecto]?.find(
                                (a) => a.id_usuario === t.id_usuario
                              );
                              const clave = `${p.id_proyecto}:${t.id_usuario}`;
                              const procesando = procesandoAsignacion.has(clave);
                              const guardandoPais = guardandoPaisAsignacion === clave;
                              return (
                                <div key={t.id_usuario} className="flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => alternarAsignacion(p.id_proyecto, t, asignado)}
                                    disabled={procesando}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border disabled:opacity-50 ${
                                      asignado
                                        ? "bg-[var(--color-primario)] text-white border-[var(--color-primario)]"
                                        : "border-gray-300 text-gray-600"
                                    }`}
                                  >
                                    {procesando && <Spinner className="h-3 w-3" />}
                                    {t.nombres} {t.apellidos}
                                  </button>
                                  {asignado && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <select
                                        value={asignado.id_pais_calendario ?? ""}
                                        onChange={(e) =>
                                          cambiarPaisAsignacion(p.id_proyecto, t.id_usuario, e.target.value)
                                        }
                                        disabled={guardandoPais}
                                        className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                                      >
                                        <option value="">Sin calendario</option>
                                        {paisesCalendario.map((pc) => (
                                          <option key={pc.id_maestro} value={pc.id_maestro}>
                                            {pc.valor}
                                          </option>
                                        ))}
                                      </select>
                                      {guardandoPais && <Spinner className="h-3 w-3" />}
                                    </span>
                                  )}
                                  {asignado && (() => {
                                    const perfilesCliente = perfiles.filter(
                                      (pf) => pf.id_cliente === p.id_cliente
                                    );
                                    const guardandoPerfil = guardandoPerfilAsignacion === clave;
                                    if (!p.id_cliente) {
                                      return (
                                        <span className="text-xs text-gray-400">
                                          Proyecto sin cliente: no se puede asignar perfil
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="inline-flex items-center gap-1.5">
                                        <select
                                          value={asignado.id_perfil ?? ""}
                                          onChange={(e) =>
                                            cambiarPerfilAsignacion(p.id_proyecto, t.id_usuario, e.target.value)
                                          }
                                          disabled={guardandoPerfil}
                                          className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                                        >
                                          <option value="">Sin perfil</option>
                                          {perfilesCliente.map((pf) => (
                                            <option key={pf.id_perfil} value={pf.id_perfil}>
                                              {pf.nombre}
                                              {pf.tarifa !== null ? ` — ${pf.tarifa} ${pf.codigo_moneda}/h` : ""}
                                            </option>
                                          ))}
                                        </select>
                                        {guardandoPerfil && <Spinner className="h-3 w-3" />}
                                        {asignado.tarifa !== null && (
                                          <span className="text-xs text-gray-400">
                                            {asignado.tarifa} {asignado.codigo_moneda}/h
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {proyectos.length === 0 && (
                  <li className="px-4 py-6 text-sm text-center text-gray-400">
                    {esAdmin ? "Sin proyectos registrados" : "No tienes proyectos asignados todavia"}
                  </li>
                )}
              </ul>
            </div>
          )}

          {tab === "tareas" && (
            <div className="space-y-4">
              <form onSubmit={crearTarea} className="grid gap-2 sm:grid-cols-3">
                <select
                  name="idProyecto"
                  required
                  defaultValue={proyectos.length === 1 ? String(proyectos[0].id_proyecto) : ""}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un proyecto</option>
                  {proyectos.map((p) => (
                    <option key={p.id_proyecto} value={p.id_proyecto}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <input
                  name="nombre"
                  required
                  placeholder="Nombre de la tarea"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  name="descripcion"
                  placeholder="Descripcion (opcional)"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  disabled={enviando}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 sm:col-span-3 sm:w-fit"
                >
                  {enviando && <Spinner />}
                  Agregar
                </button>
              </form>
              {esAdmin ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                    <p className="text-sm font-medium">Buscar tareas por talento</p>
                    {talentos.length === 0 ? (
                      <p className="text-sm text-gray-400">No hay talentos registrados</p>
                    ) : (
                      <SelectorTalentosMultiple
                        talentos={talentos}
                        idsSeleccionados={talentosFiltro}
                        onAlternar={alternarTalentoFiltro}
                        todosLosUsuarios={talentos}
                      />
                    )}
                    <button
                      onClick={buscarTareasPorTalentos}
                      disabled={buscandoTareasFiltradas || talentosFiltro.length === 0}
                      className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                    >
                      {buscandoTareasFiltradas && <Spinner />}
                      Buscar
                    </button>
                  </div>

                  {tareasFiltradas === null ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Selecciona uno o mas talentos y busca para ver sus tareas.
                    </p>
                  ) : (
                    renderListaTareas(tareasFiltradas)
                  )}
                </div>
              ) : (
                renderListaTareas(tareas)
              )}
            </div>
          )}

          {tab === "perfiles" && esAdmin && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Cliente</label>
                <select
                  value={perfilClienteFiltro}
                  onChange={(e) => setPerfilClienteFiltro(e.target.value)}
                  className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {perfilClienteFiltro && (
                <form
                  onSubmit={crearPerfilAccion}
                  className="grid gap-2 sm:grid-cols-5 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <input type="hidden" name="idCliente" value={perfilClienteFiltro} />
                  <input
                    name="nombre"
                    required
                    placeholder="Nombre del perfil (ej. Senior)"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    name="codigoExterno"
                    placeholder="Id Rate (opcional)"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    name="tarifa"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Tarifa por hora"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select name="idMoneda" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Moneda</option>
                    {monedas.map((m) => (
                      <option key={m.id_maestro} value={m.id_maestro}>
                        {m.valor}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={enviandoPerfil}
                    className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                  >
                    {enviandoPerfil && <Spinner />}
                    Agregar perfil
                  </button>
                </form>
              )}

              {perfilClienteFiltro && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <p className="text-sm font-medium">Cargar tarifario por Excel</p>
                  <p className="text-xs text-gray-500">
                    Formato de 3 columnas (Id Rate / Rate / Rate p/h). Si un perfil ya existe para este
                    cliente se actualiza su tarifa; si no, se crea.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={descargarPlantillaPerfil}
                      disabled={descargandoPlantillaPerfil}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
                    >
                      {descargandoPlantillaPerfil && <Spinner />}
                      Descargar plantilla
                    </button>
                    <select
                      value={monedaImportPerfil}
                      onChange={(e) => setMonedaImportPerfil(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Moneda del tarifario</option>
                      {monedas.map((m) => (
                        <option key={m.id_maestro} value={m.id_maestro}>
                          {m.valor}
                        </option>
                      ))}
                    </select>
                    <input ref={inputArchivoPerfilRef} type="file" accept=".xlsx" className="text-sm" />
                    <button
                      onClick={importarExcelPerfil}
                      disabled={importandoPerfil || !monedaImportPerfil}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
                    >
                      {importandoPerfil && <Spinner />}
                      Importar
                    </button>
                  </div>

                  {resultadosImportPerfil && (
                    <div className="overflow-x-auto border border-gray-100 rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left text-gray-500">
                          <tr>
                            <th className="px-3 py-1.5 font-medium">Fila</th>
                            <th className="px-3 py-1.5 font-medium">Id Rate</th>
                            <th className="px-3 py-1.5 font-medium">Rate</th>
                            <th className="px-3 py-1.5 font-medium">Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {resultadosImportPerfil.map((r) => (
                            <tr key={r.fila} className={r.ok ? "" : "bg-red-50"}>
                              <td className="px-3 py-1.5">{r.fila}</td>
                              <td className="px-3 py-1.5">{r.idRate || "-"}</td>
                              <td className="px-3 py-1.5">{r.rate || "-"}</td>
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
              )}

              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {perfiles
                  .filter((pf) => !perfilClienteFiltro || pf.id_cliente === Number(perfilClienteFiltro))
                  .map((pf) => (
                    <li key={pf.id_perfil} className="px-4 py-3 text-sm flex flex-wrap justify-between items-center gap-2">
                      <span>
                        {pf.codigo_externo && <span className="text-gray-400">{pf.codigo_externo} · </span>}
                        {pf.nombre}
                        <span className="text-gray-400"> · {pf.cliente}</span>
                      </span>
                      {editandoTarifaPerfil === pf.id_perfil ? (
                        <span className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={tarifaEdit}
                            onChange={(e) => setTarifaEdit(e.target.value)}
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
                          />
                          <select
                            value={monedaEdit}
                            onChange={(e) => setMonedaEdit(e.target.value)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                          >
                            {monedas.map((m) => (
                              <option key={m.id_maestro} value={m.id_maestro}>
                                {m.codigo}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => guardarTarifaPerfil(pf.id_perfil)}
                            disabled={guardandoTarifaPerfil}
                            className="inline-flex items-center gap-1 text-[var(--color-primario)] underline disabled:opacity-50"
                          >
                            {guardandoTarifaPerfil && <Spinner className="h-3 w-3" />}
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditandoTarifaPerfil(null)}
                            className="text-gray-500 underline"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          <span className="text-gray-500">
                            {pf.tarifa !== null ? `${pf.tarifa} ${pf.codigo_moneda}/h` : "Sin tarifa"}
                          </span>
                          <button
                            onClick={() => empezarEdicionTarifa(pf)}
                            className="text-gray-500 hover:text-gray-900 underline"
                          >
                            Editar tarifa
                          </button>
                          <button
                            onClick={() => desactivarPerfilAccion(pf.id_perfil)}
                            disabled={desactivandoPerfil === pf.id_perfil}
                            className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 underline disabled:opacity-50"
                          >
                            {desactivandoPerfil === pf.id_perfil && <Spinner className="h-3 w-3" />}
                            Desactivar
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                {perfiles.filter((pf) => !perfilClienteFiltro || pf.id_cliente === Number(perfilClienteFiltro))
                  .length === 0 && (
                  <li className="px-4 py-6 text-sm text-center text-gray-400">
                    {perfilClienteFiltro ? "Sin perfiles para este cliente" : "Selecciona un cliente"}
                  </li>
                )}
              </ul>
            </div>
          )}
    </div>
  );
}
