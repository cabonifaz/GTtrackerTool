import { executeProcedure } from "@/lib/db";
import { Cliente, CodigoRol } from "@/lib/types";

export function crearCliente(nombre: string, idEmpresa: number, creadoPor: string) {
  return executeProcedure<{ id_cliente: number }>("sp_cliente_crear", [nombre, idEmpresa, creadoPor]);
}

export function editarCliente(idCliente: number, nombre: string, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_cliente_editar", [idCliente, nombre, idEmpresaActor, modificadoPor]);
}

export function desactivarCliente(idCliente: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_cliente_desactivar", [idCliente, idEmpresaActor, modificadoPor]);
}

export function listarClientes(idUsuarioActor: number, codigoRolActor: CodigoRol, idEmpresaActor: number) {
  return executeProcedure<Cliente>("sp_cliente_listar", [idUsuarioActor, codigoRolActor, idEmpresaActor]);
}

export function asignarClienteGestor(idCliente: number, idUsuario: number, idEmpresaActor: number, creadoPor: string) {
  return executeProcedure("sp_cliente_gestor_asignar", [idCliente, idUsuario, idEmpresaActor, creadoPor]);
}

export function quitarClienteGestor(
  idCliente: number,
  idUsuario: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_cliente_gestor_quitar", [idCliente, idUsuario, idEmpresaActor, modificadoPor]);
}

export function listarClientesGestor(idUsuario: number, idEmpresaActor: number) {
  return executeProcedure<{ id_cliente: number; cliente: string }>("sp_cliente_gestor_listar_por_usuario", [
    idUsuario,
    idEmpresaActor,
  ]);
}
