// Card estatica, sin sombra a proposito -- el design system reserva la
// sombra (shadow-1) para overlays/paneles desplegables, no para tarjetas
// fijas en la pagina. Sin padding propio: cada pantalla ya usaba p-4/p-6
// distintos segun el caso, y mezclar dos utilidades de padding de
// Tailwind en el mismo className no resuelve el conflicto de forma
// confiable -- el que llama siempre pasa su propio p-*.
export default function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-md border border-gray-200 bg-white ${className}`}>{children}</div>;
}
