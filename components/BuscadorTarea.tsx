"use client";

import { useEffect, useMemo, useState } from "react";
import { Tarea } from "@/lib/types";

function normalizarBusqueda(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Buscador con tipeo para elegir UNA tarea de un proyecto, en vez de un
// <select> nativo -- hay proyectos con mas de 100 tareas y ese listado se
// vuelve inmanejable.
export default function BuscadorTarea({
  tareas,
  idSeleccionada,
  onSeleccionar,
  disabled = false,
  placeholder = "Escribe para buscar una tarea...",
}: {
  tareas: Tarea[];
  idSeleccionada: string;
  onSeleccionar: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const seleccionada = tareas.find((t) => String(t.id_tarea) === idSeleccionada) ?? null;
  const [query, setQuery] = useState(seleccionada?.nombre ?? "");
  const [abierto, setAbierto] = useState(false);

  // Si cambia el proyecto (y por lo tanto la tarea seleccionada se limpia
  // desde el padre), limpiar tambien el texto tipeado.
  useEffect(() => {
    if (!idSeleccionada) setQuery("");
  }, [idSeleccionada]);

  const resultados = useMemo(() => {
    const q = normalizarBusqueda(query);
    if (!q) return tareas.slice(0, 20);
    return tareas.filter((t) => normalizarBusqueda(t.nombre).includes(q)).slice(0, 20);
  }, [tareas, query]);

  function elegir(t: Tarea) {
    onSeleccionar(String(t.id_tarea));
    setQuery(t.nombre);
    setAbierto(false);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
          if (idSeleccionada) onSeleccionar("");
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
      />
      {abierto && !disabled && resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-[var(--shadow-1)] text-sm">
          {resultados.map((t) => (
            <li key={t.id_tarea}>
              <button
                type="button"
                onMouseDown={() => elegir(t)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                {t.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierto && !disabled && query && resultados.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-[var(--shadow-1)] px-3 py-2 text-sm text-gray-400">
          Sin resultados
        </div>
      )}
    </div>
  );
}
