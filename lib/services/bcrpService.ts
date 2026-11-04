// Tipo de cambio Sol/Dolar desde la API publica del Banco Central de
// Reserva del Peru (sin autenticacion). Serie PN01215PM = "Tipo de
// cambio - fin de periodo (S/ por US$) - Interbancario - Venta",
// mensual -- el valor que BCRP ya registra para el ultimo dia habil de
// cada mes, que es exactamente "el TC al cierre de mes" sin necesidad
// de calcular a mano si el mes termina en 28/29/30/31.
const SERIE_TC_FIN_MES = "PN01215PM";

// Extrae el primer objeto JSON balanceado del texto. Necesario porque
// el endpoint del BCRP a veces devuelve el JSON valido seguido de HTML
// de debug pegado (un notice de PHP), o directamente una pagina
// distinta sin avisar con un codigo de error -- nunca se confia en que
// el body entero sea JSON limpio.
function extraerPrimerJson(texto: string): string | null {
  const inicio = texto.indexOf("{");
  if (inicio === -1) return null;
  let profundidad = 0;
  for (let i = inicio; i < texto.length; i++) {
    if (texto[i] === "{") profundidad++;
    else if (texto[i] === "}") {
      profundidad--;
      if (profundidad === 0) return texto.slice(inicio, i + 1);
    }
  }
  return null;
}

// Solo cubre el par Sol/Dolar (lo unico que da esta serie). Cualquier
// otro par de monedas sigue dependiendo de la carga manual.
export async function obtenerTipoCambioSolPorDolarBcrp(anio: number, mes: number): Promise<number | null> {
  // Se pide un rango de 2 meses (el anterior + el pedido), nunca el
  // mismo mes como inicio y fin -- eso dispara un bug conocido de esta
  // API que devuelve HTML de debug pegado al JSON. Se toma el ULTIMO
  // periodo del rango (el mas reciente = el mes pedido).
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioMesAnterior = mes === 1 ? anio - 1 : anio;
  const periodoInicial = `${anioMesAnterior}-${mesAnterior}`;
  const periodoFinal = `${anio}-${mes}`;
  const url = `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/${SERIE_TC_FIN_MES}/json/${periodoInicial}/${periodoFinal}/esp`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const texto = await res.text();
    const jsonTexto = extraerPrimerJson(texto);
    if (!jsonTexto) return null;

    const data = JSON.parse(jsonTexto) as { periods?: { values?: string[] }[] };
    const periodos = data.periods ?? [];
    const ultimo = periodos[periodos.length - 1];
    const valor = ultimo?.values?.[0];
    const numero = valor ? Number(valor) : NaN;
    return Number.isFinite(numero) && numero > 0 ? numero : null;
  } catch {
    // Red caida, timeout, respuesta no es JSON valido, o BCRP sin dato
    // para ese mes todavia -- quien llama sigue con el respaldo local.
    return null;
  }
}
