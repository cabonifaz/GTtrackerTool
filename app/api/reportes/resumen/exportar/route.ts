import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteFacturacionMensual } from "@/lib/services/reporteService";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarPerfiles } from "@/lib/services/perfilService";
import { generarExcel, respuestaExcel } from "@/lib/excelExport";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Reporte de facturacion mensual (formato pedido: hoja de detalle por
// talento + hoja de facturacion agrupada por perfil/rate, replicando el
// excel que ya manejaban a mano). Incluye en la hoja de facturacion
// TODOS los perfiles del cliente, aunque tengan 0 talentos este mes.
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idProyecto = params.get("idProyecto");
  const anio = params.get("anio");
  const mes = params.get("mes");

  if (!idProyecto || !anio || !mes) {
    return NextResponse.json({ error: "idProyecto, anio y mes son requeridos" }, { status: 400 });
  }

  try {
    const [detalle, proyectos] = await Promise.all([
      reporteFacturacionMensual(Number(idProyecto), Number(anio), Number(mes), session.user.idEmpresa!),
      listarProyectos(session.user.idUsuario, session.user.rol, session.user.idEmpresa!),
    ]);

    const proyecto = proyectos.find((p) => p.id_proyecto === Number(idProyecto));
    const perfilesCliente = proyecto?.id_cliente
      ? await listarPerfiles(proyecto.id_cliente, session.user.idEmpresa!)
      : [];

    // Agrupado por Id Rate para la hoja de facturacion -- arranca de
    // TODOS los perfiles del cliente (aunque 0 talentos este mes) y les
    // suma encima lo que salga del detalle por talento.
    interface Grupo {
      idRate: string;
      rate: string;
      tarifa: number;
      talentos: number;
      horas: number;
      horasObjetivo: number;
    }
    const grupos = new Map<number, Grupo>();
    for (const pf of perfilesCliente) {
      grupos.set(pf.id_perfil, {
        idRate: pf.codigo_externo ?? "",
        rate: pf.nombre,
        tarifa: Number(pf.tarifa ?? 0),
        talentos: 0,
        horas: 0,
        horasObjetivo: 0,
      });
    }
    for (const f of detalle) {
      if (!f.id_perfil) continue;
      let g = grupos.get(f.id_perfil);
      if (!g) {
        g = { idRate: f.id_rate ?? "", rate: f.rate_nombre ?? "", tarifa: Number(f.tarifa ?? 0), talentos: 0, horas: 0, horasObjetivo: 0 };
        grupos.set(f.id_perfil, g);
      }
      g.talentos += 1;
      g.horas += Number(f.horas_trabajadas);
      g.horasObjetivo += Number(f.horas_objetivo);
    }
    const filasFacturacion = Array.from(grupos.values()).sort((a, b) => a.idRate.localeCompare(b.idRate));
    const totales = filasFacturacion.reduce(
      (acc, g) => ({
        talentos: acc.talentos + g.talentos,
        horas: acc.horas + g.horas,
        horasObjetivo: acc.horasObjetivo + g.horasObjetivo,
        total: acc.total + g.horas * g.tarifa,
      }),
      { talentos: 0, horas: 0, horasObjetivo: 0, total: 0 }
    );

    const buffer = await generarExcel([
      {
        nombre: "Detalle",
        columnas: [
          { header: "Nombres", key: "nombres", width: 25 },
          { header: "Horas", key: "horas", width: 10, numFmt: "0.00" },
          { header: "idRate", key: "idRate", width: 10 },
          { header: "DNI", key: "dni", width: 14 },
          { header: "Hour Target", key: "hourTarget", width: 14, numFmt: "0.00" },
          { header: "Tiempo en Falta", key: "tiempoFalta", width: 16, numFmt: "0.00" },
          { header: "Tiempo extra", key: "tiempoExtra", width: 14, numFmt: "0.00" },
          { header: "Comment", key: "comment", width: 20 },
          { header: "Supervisor", key: "supervisor", width: 18 },
          { header: "Dias Off", key: "diasOff", width: 10 },
          { header: "Dias Fault", key: "diasFault", width: 10 },
        ],
        filas: detalle.map((f) => {
          const horas = Number(f.horas_trabajadas);
          const objetivo = Number(f.horas_objetivo);
          return {
            nombres: f.colaborador,
            horas,
            idRate: f.id_rate ?? "",
            dni: f.dni ?? "",
            hourTarget: objetivo,
            tiempoFalta: Math.max(0, objetivo - horas),
            tiempoExtra: Math.max(0, horas - objetivo),
            comment: "",
            supervisor: "",
            diasOff: f.dias_off,
            diasFault: f.dias_fault,
          };
        }),
      },
      {
        nombre: "Facturacion",
        columnas: [
          { header: "Id Rate", key: "idRate", width: 10 },
          { header: "Rate", key: "rate", width: 22 },
          { header: "Rate p/h", key: "tarifa", width: 12, numFmt: "0.00" },
          { header: "Talents", key: "talentos", width: 10 },
          { header: "Billing hours", key: "horas", width: 14, numFmt: "0.00" },
          { header: "Target hours", key: "horasObjetivo", width: 14, numFmt: "0.00" },
          { header: "Total Billing", key: "totalBilling", width: 16, numFmt: "$#,##0.00" },
        ],
        filas: [
          ...filasFacturacion.map((g) => ({
            idRate: g.idRate,
            rate: g.rate,
            tarifa: g.tarifa,
            talentos: g.talentos,
            horas: g.horas,
            horasObjetivo: g.horasObjetivo,
            totalBilling: g.horas * g.tarifa,
          })),
          {
            idRate: "",
            rate: "",
            tarifa: "",
            talentos: totales.talentos,
            horas: totales.horas,
            horasObjetivo: totales.horasObjetivo,
            totalBilling: totales.total,
          },
        ],
      },
    ]);

    return respuestaExcel(buffer, `facturacion_${MESES[Number(mes) - 1]}_${anio}.xlsx`);
  } catch (err) {
    return handleApiError(err);
  }
}
