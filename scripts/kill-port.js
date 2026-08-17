// Libera el puerto indicado antes de arrancar el server, para que una
// sesion anterior de VS que quedo huerfana no empuje al server nuevo a
// otro puerto (lo que rompe NEXTAUTH_URL, fijo en localhost:3000).
const { execSync } = require("child_process");

const puerto = process.argv[2] || "3000";

if (process.platform !== "win32") {
  // En un contenedor (Railway, Docker, CI, etc.) no hay sesiones previas
  // de VS que limpiar, y los comandos de abajo (netstat/findstr/taskkill)
  // son especificos de Windows. No-op fuera de Windows.
  process.exit(0);
}

try {
  const salida = execSync(`netstat -ano | findstr LISTENING | findstr :${puerto}`, {
    encoding: "utf8",
  });
  const pids = new Set(
    salida
      .split("\n")
      .map((linea) => linea.trim().split(/\s+/).pop())
      .filter(Boolean)
  );
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`);
      console.log(`Puerto ${puerto}: proceso ${pid} detenido.`);
    } catch {
      // Ya no existia o no se pudo matar; seguimos.
    }
  }
} catch {
  // findstr no encontro nada escuchando en el puerto: no hay nada que limpiar.
}
