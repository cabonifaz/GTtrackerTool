import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { listarAsignaciones, upsertAsignacion } from "@/lib/services/actividadService";
import { crearUsuario, listarUsuarios } from "@/lib/services/usuarioService";
import { obtenerEmpresaPorSlug } from "@/lib/services/empresaService";
import { PASSWORD_GENERICA } from "@/lib/constants";
import bcrypt from "bcryptjs";
import { generarEmailUnico, normalizarNombre, resolverDominioCorreo } from "@/lib/services/recursoService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const idProyecto = req.nextUrl.searchParams.get("idProyecto");

  try {
    const asignaciones = await listarAsignaciones(
      idProyecto ? Number(idProyecto) : null,
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!
    );
    return NextResponse.json(asignaciones);
  } catch (err) {
    return handleApiError(err);
  }
}

// Crear o editar UNA asignacion a mano, sin pasar por Excel. Si viene
// idUsuario, se usa un talento ya existente. Si no, se crea uno nuevo
// (nombres/apellidos/email obligatorios) -- validando primero que no
// exista ya alguien con ese mismo nombre, para no duplicar por error a
// alguien que ya estaba cargado con otro dato. Volver a llamar esto con
// el mismo talento+periodo actualiza la fila en vez de duplicarla (es
// el mismo sp_proyecto_asignacion_upsert que usa la carga masiva).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const {
    idProyecto,
    idUsuario: idUsuarioExistente,
    nombres,
    apellidos,
    email,
    proveedor,
    ocOs,
    iniciativa,
    liderTecnico,
    periodoDesde,
    periodoHasta,
    periodoReferencia,
  } = await req.json();

  if (!idProyecto || !periodoDesde || !periodoHasta) {
    return NextResponse.json({ error: "Falta el proyecto o el periodo (desde/hasta)" }, { status: 400 });
  }

  try {
    let idUsuario = idUsuarioExistente ? Number(idUsuarioExistente) : null;

    if (!idUsuario) {
      if (!nombres || !apellidos) {
        return NextResponse.json(
          { error: "Elige un talento existente o completa nombres y apellidos para crear uno nuevo" },
          { status: 400 }
        );
      }

      const usuarios = await listarUsuarios(session.user.idEmpresa!);
      const nombreBuscado = normalizarNombre(`${nombres} ${apellidos}`);
      const coincidencia = usuarios.find((u) => normalizarNombre(`${u.nombres} ${u.apellidos}`) === nombreBuscado);
      if (coincidencia) {
        return NextResponse.json(
          {
            error: `Ya existe un talento con ese nombre (${coincidencia.email}) -- selecciona "Talento existente" en vez de crear uno nuevo`,
          },
          { status: 400 }
        );
      }

      const empresaSlug = session.user.empresaSlug ?? "empresa";
      const empresa = await obtenerEmpresaPorSlug(empresaSlug);
      const dominioCorreo = resolverDominioCorreo(empresa?.dominio_correo, empresaSlug);
      const emailFinal = (email && String(email).trim()) || generarEmailUnico(nombres, apellidos, dominioCorreo, new Set(usuarios.map((u) => u.email.toLowerCase())));

      const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);
      const creado = await crearUsuario(
        nombres,
        apellidos,
        emailFinal,
        passwordHash,
        "TALENTO",
        session.user.idEmpresa!,
        null,
        session.user.email ?? ""
      );
      idUsuario = creado[0].id_usuario;
    }

    const resultado = await upsertAsignacion(
      Number(idProyecto),
      idUsuario,
      proveedor || null,
      ocOs || null,
      iniciativa || null,
      periodoDesde,
      periodoHasta,
      periodoReferencia || null,
      liderTecnico || null,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(resultado[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
