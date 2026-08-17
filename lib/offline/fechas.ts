// Convierte una fecha del dispositivo del usuario al formato DATETIME
// de MySQL ('YYYY-MM-DD HH:mm:ss'), en hora local -- igual convencion
// que usa el resto de la app (NOW() del servidor tambien es hora local).
export function aFechaMySQL(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
}
