"use client";

import { useMemo, useState } from "react";
import { Usuario } from "@/lib/types";

function normalizarBusqueda(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Buscador con tipeo para elegir UN talento (a diferencia de
// SelectorTalentosMultiple, que es para elegir varios/filtrar).
export default function BuscadorTalento({
  talentos,
  idSeleccionado,
  onSeleccionar,
  placeholder = "Escribe para buscar un talento por nombre o correo...",
}: {
  talentos: Usuario[];
  idSeleccionado: number | null;
  onSeleccionar: (id: number | null) => void;
  placeholder?: string;
}) {
  const seleccionado = talentos.find((t) => t.id_usuario === idSeleccionado) ?? null;
  const [query, setQuery] = useState(seleccionado ? `${seleccionado.nombres} ${seleccionado.apellidos}` : "");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    const q = normalizarBusqueda(query);
    if (!q) return talentos.slice(0, 20);
    return talentos
      .filter((t) => normalizarBusqueda(`${t.nombres} ${t.apellidos} ${t.email}`).includes(q))
      .slice(0, 20);
  }, [talentos, query]);

  function elegir(t: Usuario) {
    onSeleccionar(t.id_usuario);
    setQuery(`${t.nombres} ${t.apellidos}`);
    setAbierto(false);
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
          if (idSeleccionado) onSeleccionar(null);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-[var(--shadow-1)] text-sm">
          {resultados.map((t) => (
            <li key={t.id_usuario}>
              <button
                type="button"
                onMouseDown={() => elegir(t)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                <span className="font-medium">
                  {t.nombres} {t.apellidos}
                </span>
                <span className="text-gray-400"> · {t.email}</span>
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
  );
}
