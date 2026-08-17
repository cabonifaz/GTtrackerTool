"use client";

import { useEffect } from "react";
import { iniciarVigilancia, useSyncStatus } from "@/lib/offline/sync";
import { Spinner } from "@/components/Spinner";

function IconoNube({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M7 18h10a4 4 0 000-8 5.5 5.5 0 00-10.7-1.6A4 4 0 007 18z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoNubeCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M7 18h10a4 4 0 000-8 5.5 5.5 0 00-10.7-1.6A4 4 0 007 18z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 13.5l1.8 1.8L14.5 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoSinConexion({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M7 18h10a4 4 0 000-8 5.5 5.5 0 00-10.7-1.6A4 4 0 007 18z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 4l16 16" strokeLinecap="round" />
    </svg>
  );
}

export default function SyncStatus() {
  useEffect(() => iniciarVigilancia(), []);

  const estado = useSyncStatus();

  if (estado === "inactivo") return null;

  const config = {
    sincronizado: {
      icono: <IconoNubeCheck className="h-4 w-4" />,
      texto: "Sincronizado",
      titulo: "Tu cronometro esta guardado en el servidor.",
      color: "text-green-600",
    },
    "sin-conexion": {
      icono: <IconoSinConexion className="h-4 w-4" />,
      texto: "Sin conexion",
      titulo:
        "Tranquilo: tu tiempo se sigue registrando en este dispositivo y se subira automaticamente en cuanto vuelva la conexion.",
      color: "text-amber-600",
    },
    sincronizando: {
      icono: <Spinner className="h-4 w-4" />,
      texto: "Sincronizando",
      titulo: "Subiendo tu registro de tiempo al servidor...",
      color: "text-gray-500",
    },
    pendiente: {
      icono: <IconoNube className="h-4 w-4" />,
      texto: "Reintentando",
      titulo:
        "No se pudo sincronizar por ahora, pero tu tiempo esta a salvo en este dispositivo. Se reintentara solo.",
      color: "text-amber-600",
    },
  } as const;

  const { icono, texto, titulo, color } = config[estado];

  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${color}`}
    >
      {icono}
      <span className="hidden sm:inline">{texto}</span>
    </span>
  );
}
