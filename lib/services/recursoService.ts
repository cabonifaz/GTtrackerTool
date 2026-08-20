// Helpers compartidos para resolver un "recurso" (talento) por nombre al
// crear asignaciones de Actividades -- usados tanto por la carga masiva
// de Excel como por la creacion manual de una asignacion, para no
// duplicar la logica de normalizacion/split-de-nombre/generacion de
// email entre los dos flujos.

export function normalizarNombre(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function partirNombre(nombreCompleto: string): { nombres: string; apellidos: string } {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) {
    return { nombres: nombreCompleto.trim().slice(0, 100), apellidos: nombreCompleto.trim().slice(0, 100) };
  }
  return { nombres: partes[0].slice(0, 100), apellidos: partes.slice(1).join(" ").slice(0, 100) };
}

export function slugEmail(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

// El dominio configurado en la empresa (Super Admin) tiene prioridad; si
// no se definio ninguno, se usa <slug>.local como antes -- nunca rompe
// empresas que ya venian funcionando sin dominio propio.
export function resolverDominioCorreo(dominioCorreoEmpresa: string | null | undefined, slug: string): string {
  return dominioCorreoEmpresa?.trim() || `${slug}.local`;
}

export function generarEmailUnico(nombres: string, apellidos: string, dominio: string, emailsExistentes: Set<string>): string {
  let email = `${slugEmail(nombres)}.${slugEmail(apellidos)}@${dominio}`;
  let sufijo = 2;
  while (emailsExistentes.has(email)) {
    email = `${slugEmail(nombres)}.${slugEmail(apellidos)}${sufijo}@${dominio}`;
    sufijo++;
  }
  return email;
}
