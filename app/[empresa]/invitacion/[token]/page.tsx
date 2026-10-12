import { obtenerInvitacionPorToken } from "@/lib/services/invitacionService";
import InvitacionForm from "./invitacion-form";

function mensajeNoValida(codigoEstado: string, fechaExpiracion: string): string {
  if (codigoEstado === "ACEPTADA") return "Esta invitacion ya fue utilizada.";
  if (codigoEstado === "REVOCADA") return "Esta invitacion fue cancelada.";
  if (new Date(fechaExpiracion) < new Date()) return "Esta invitacion vencio.";
  return "Esta invitacion no esta disponible.";
}

export default async function InvitacionPage({ params }: { params: { empresa: string; token: string } }) {
  const invitacion = await obtenerInvitacionPorToken(params.token);

  if (!invitacion) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-gray-500">Invitacion no encontrada.</p>
      </div>
    );
  }

  const esValida =
    invitacion.codigo_estado === "PENDIENTE" && new Date(invitacion.fecha_expiracion) > new Date();

  if (!esValida) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-2"
        style={{ "--color-primario": invitacion.color_primario } as React.CSSProperties}
      >
        <h1 className="text-lg font-semibold">{invitacion.empresa}</h1>
        <p className="text-sm text-gray-500">
          {mensajeNoValida(invitacion.codigo_estado, invitacion.fecha_expiracion)}
        </p>
        <p className="text-xs text-gray-400">Pide a tu administrador que te envie una invitacion nueva.</p>
      </div>
    );
  }

  return (
    <InvitacionForm
      token={params.token}
      nombres={invitacion.nombres}
      apellidos={invitacion.apellidos}
      email={invitacion.email}
      empresaNombre={invitacion.empresa}
      empresaSlug={invitacion.empresa_slug}
      tieneLogo={!!invitacion.tiene_logo}
      colorPrimario={invitacion.color_primario}
      proyecto={invitacion.proyecto}
    />
  );
}
