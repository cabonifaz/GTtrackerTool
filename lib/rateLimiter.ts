// Limitador de intentos fallidos de login en memoria, por email. Frena
// fuerza bruta/credential stuffing contra una cuenta puntual.
//
// Limitacion aceptada: al vivir en memoria del proceso, se reinicia en
// cada redeploy y no se comparte entre instancias si la app llegara a
// correr con mas de un replica -- suficiente mientras el deploy sea de
// una sola instancia (que es el caso hoy en Railway).
interface Intento {
  fallos: number;
  primerFalloEn: number;
  bloqueadoHasta: number | null;
}

const intentos = new Map<string, Intento>();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

function normalizarClave(email: string): string {
  return email.trim().toLowerCase();
}

export function estaBloqueado(email: string): boolean {
  const registro = intentos.get(normalizarClave(email));
  if (!registro?.bloqueadoHasta) return false;
  if (Date.now() > registro.bloqueadoHasta) {
    intentos.delete(normalizarClave(email));
    return false;
  }
  return true;
}

export function registrarIntentoFallido(email: string): void {
  const clave = normalizarClave(email);
  const ahora = Date.now();
  const registro = intentos.get(clave);

  if (!registro || ahora - registro.primerFalloEn > VENTANA_MS) {
    intentos.set(clave, { fallos: 1, primerFalloEn: ahora, bloqueadoHasta: null });
    return;
  }

  registro.fallos += 1;
  if (registro.fallos >= MAX_FALLOS) {
    registro.bloqueadoHasta = ahora + BLOQUEO_MS;
  }
}

export function registrarLoginExitoso(email: string): void {
  intentos.delete(normalizarClave(email));
}

// Para la alerta/boton de desbloqueo en Usuarios (solo Admin). Al vivir
// en memoria, esto refleja el estado de ESTA instancia del proceso --
// coherente con la limitacion ya aceptada de estaBloqueado().
export function listarBloqueados(): { email: string; bloqueadoHasta: number }[] {
  const ahora = Date.now();
  const resultado: { email: string; bloqueadoHasta: number }[] = [];
  for (const [email, registro] of Array.from(intentos)) {
    if (registro.bloqueadoHasta && registro.bloqueadoHasta > ahora) {
      resultado.push({ email, bloqueadoHasta: registro.bloqueadoHasta });
    }
  }
  return resultado;
}

export function desbloquear(email: string): boolean {
  return intentos.delete(normalizarClave(email));
}
