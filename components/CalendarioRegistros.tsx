"use client";

import { ReporteDetalleRow } from "@/lib/types";
import { CargandoInline } from "@/components/Spinner";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const PX_POR_HORA = 48;

function aFechaYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function horaDecimal(d: Date) {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

function formatearHora(d: Date) {
  return d.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" });
}

interface Segmento {
  fila: ReporteDetalleRow;
  inicio: Date;
  fin: Date;
}

// Un registro puede cruzar medianoche (ej. 14:20 a 04:00 del dia siguiente,
// tipico en talentos que trabajan de noche por horario US) -- se parte en
// un segmento por cada dia que toca para poder dibujarlo en la columna del
// dia correspondiente.
function agruparPorDia(filas: ReporteDetalleRow[]): Map<string, Segmento[]> {
  const mapa = new Map<string, Segmento[]>();
  for (const f of filas) {
    const inicio = new Date(f.fecha_inicio.replace(" ", "T"));
    const fin = new Date(f.fecha_fin.replace(" ", "T"));
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    while (cursor.getTime() <= fin.getTime()) {
      const finDelDia = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
      const segInicio = cursor.getTime() > inicio.getTime() ? cursor : inicio;
      const segFin = fin.getTime() < finDelDia.getTime() ? fin : finDelDia;
      const clave = aFechaYMD(cursor);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push({ fila: f, inicio: new Date(segInicio), fin: new Date(segFin) });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
  }
  return mapa;
}

export default function CalendarioRegistros({
  filas,
  dias,
  modo,
  mesReferencia,
  cargando,
}: {
  filas: ReporteDetalleRow[];
  dias: Date[];
  modo: "semana" | "mes";
  mesReferencia: number;
  cargando: boolean;
}) {
  const porDia = agruparPorDia(filas);

  if (cargando) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <CargandoInline texto="Cargando calendario..." />
      </div>
    );
  }

  const hoy = aFechaYMD(new Date());

  if (modo === "mes") {
    const semanas: Date[][] = [];
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

    return (
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {semanas.map((semana, i) => (
            <div key={i} className="grid grid-cols-7 divide-x divide-gray-100">
              {semana.map((dia) => {
                const clave = aFechaYMD(dia);
                const segmentos = (porDia.get(clave) ?? []).sort(
                  (a, b) => a.inicio.getTime() - b.inicio.getTime()
                );
                const fueraDeMes = dia.getMonth() !== mesReferencia;
                const esHoy = clave === hoy;
                return (
                  <div key={clave} className={`min-h-[110px] p-1.5 ${fueraDeMes ? "bg-gray-50/50" : ""}`}>
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs ${
                        esHoy
                          ? "bg-[var(--color-primario)] text-white font-medium"
                          : fueraDeMes
                            ? "text-gray-300"
                            : "text-gray-600"
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {segmentos.slice(0, 3).map((s, idx) => (
                        <div
                          key={`${s.fila.id_registro}-${idx}`}
                          title={`${s.fila.tarea} · ${formatearHora(s.inicio)}-${formatearHora(s.fin)}`}
                          className="truncate rounded px-1.5 py-0.5 text-[11px] bg-[var(--color-primario)]/10 text-[var(--color-primario)] border-l-2 border-[var(--color-primario)]"
                        >
                          {formatearHora(s.inicio)} {s.fila.tarea}
                        </div>
                      ))}
                      {segmentos.length > 3 && (
                        <div className="text-[11px] text-gray-400 px-1.5">+{segmentos.length - 3} mas</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vista semana: escala de horas comun a las 7 columnas, calculada a partir
  // del rango real de los registros de esa semana (con 1h de margen), para
  // no desperdiciar espacio mostrando siempre 0-24h.
  let min = 24;
  let max = 0;
  for (const segs of Array.from(porDia.values())) {
    for (const s of segs) {
      min = Math.min(min, Math.floor(horaDecimal(s.inicio)));
      max = Math.max(max, Math.ceil(horaDecimal(s.fin)));
    }
  }
  if (min > max) {
    min = 8;
    max = 20;
  }
  min = Math.max(0, min - 1);
  max = Math.min(24, max + 1);
  const horas = Array.from({ length: max - min }, (_, i) => min + i);
  const alturaTotal = (max - min) * PX_POR_HORA;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
        <div />
        {dias.map((dia) => {
          const esHoy = aFechaYMD(dia) === hoy;
          return (
            <div key={aFechaYMD(dia)} className="px-1 py-2 text-center border-l border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase">{DIAS_SEMANA[dia.getDay()]}</p>
              <p className={`text-sm font-medium ${esHoy ? "text-[var(--color-primario)]" : "text-gray-700"}`}>
                {dia.getDate()}
              </p>
            </div>
          );
        })}
      </div>
      <div className="overflow-y-auto max-h-[70vh]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: alturaTotal }}>
          <div className="relative">
            {horas.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 -translate-y-1/2 text-right pr-2 text-[11px] text-gray-400"
                style={{ top: (h - min) * PX_POR_HORA }}
              >
                {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
              </div>
            ))}
          </div>
          {dias.map((dia) => {
            const clave = aFechaYMD(dia);
            const segmentos = porDia.get(clave) ?? [];
            return (
              <div key={clave} className="relative border-l border-gray-100">
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: (h - min) * PX_POR_HORA }}
                  />
                ))}
                {segmentos.map((s, idx) => {
                  const top = (horaDecimal(s.inicio) - min) * PX_POR_HORA;
                  const alto = Math.max(18, (horaDecimal(s.fin) - horaDecimal(s.inicio)) * PX_POR_HORA);
                  return (
                    <div
                      key={`${s.fila.id_registro}-${idx}`}
                      title={`${s.fila.tarea} · ${s.fila.proyecto} · ${formatearHora(s.inicio)}-${formatearHora(s.fin)}`}
                      className="absolute left-0.5 right-0.5 rounded-md border-l-4 border-[var(--color-primario)] bg-[var(--color-primario)]/10 px-1.5 py-0.5 overflow-hidden"
                      style={{ top, height: alto }}
                    >
                      <p className="text-[11px] font-medium text-[var(--color-primario)] truncate">{s.fila.tarea}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {formatearHora(s.inicio)}-{formatearHora(s.fin)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
