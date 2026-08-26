// Formato para todo campo de dinero en la app: coma como separador de
// miles, punto decimal, siempre 2 decimales (ej. 1234.5 -> "1,234.50").
// Acepta string porque las columnas DECIMAL de MySQL llegan como string
// via mysql2 aunque el tipo en TS diga number.
export function formatearMoneda(valor: number | string): string {
  return Number(valor).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
