"use client";

import { useMemo, useState } from "react";
import { Usuario } from "@/lib/types";

function normalizarBusquedaTalento(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Buscador con tipeo + chips para elegir uno o mas talentos, en vez de
// una pared de checkboxes/pildoras -- necesario apenas la empresa tiene
// mas de una decena de talentos. `talentos` es el conjunto de candidatos
// a mostrar en el buscador (ya puede venir prefiltrado, ej. por
// proyecto); `todosLosUsuarios` se usa para poder mostrar el nombre de
// un chip ya seleccionado aunque haya quedado fuera del filtro actual.
export default function SelectorTalentosMultiple({
  talentos,
  idsSeleccionados,
  onAlternar,
  todosLosUsuarios,
}: {
  talentos: Usuario[];
  idsSeleccionados: number[];
  onAlternar: (id: number) => void;
  todosLosUsuarios: Usuario[];
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    const q = normalizarBusquedaTalento(query);
    const base = q
      ? talentos.filter((t) => normalizarBusquedaTalento(`${t.nombres} ${t.apellidos} ${t.email}`).includes(q))
      : talentos;
    return base.slice(0, 20);
  }, [talentos, query]);

  const seleccionados = idsSeleccionados
    .map((id) => todosLosUsuarios.find((u) => u.id_usuario === id))
    .filter((u): u is Usuario => !!u);

  return (
    <div className="space-y-2">
      {seleccionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {seleccionados.map((u) => (
            <span
              key={u.id_usuario}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primario)] text-white text-xs pl-3 pr-1.5 py-1"
            >
              {u.nombres} {u.apellidos}
              <button
                type="button"
                onClick={() => onAlternar(u.id_usuario)}
                aria-label={`Quitar ${u.nombres} ${u.apellidos}`}
                className="rounded-full hover:bg-white/20 h-4 w-4 inline-flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative max-w-sm">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder="Buscar talento por nombre o correo..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {abierto && resultados.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-[var(--shadow-1)] text-sm">
            {resultados.map((t) => (
              <li key={t.id_usuario}>
                <button
                  type="button"
                  onMouseDown={() => onAlternar(t.id_usuario)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between ${
                    idsSeleccionados.includes(t.id_usuario) ? "bg-gray-50" : ""
                  }`}
                >
                  <span>
                    <span className="font-medium">
                      {t.nombres} {t.apellidos}
                    </span>
                    <span className="text-gray-400"> · {t.email}</span>
                  </span>
                  {idsSeleccionados.includes(t.id_usuario) && <span className="text-[var(--color-primario)]">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {abierto && query && resultados.length === 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-[var(--shadow-1)] px-3 py-2 text-sm text-gray-400">
            Sin resultados
          </div>
        )}
      </div>
    </div>
  );
}
