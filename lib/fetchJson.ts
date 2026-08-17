// Wrapper de fetch que valida el status antes de parsear -- sin esto, una
// respuesta de error (JSON tipo {error: "..."}) se asigna tal cual al
// estado esperado (ej. un array), y provoca crashes como "x.map is not a
// function" en vez de mostrar el error real.
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.error ?? `Error ${res.status} al consultar ${input}`);
  }
  return res.json();
}
