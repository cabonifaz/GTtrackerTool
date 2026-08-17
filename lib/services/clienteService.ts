import { executeProcedure } from "@/lib/db";
import { Cliente, CodigoRol } from "@/lib/types";

export function crearCliente(nombre: string, creadoPor: string) {
  return executeProcedure<{ id_cliente: number }>("sp_cliente_crear", [nombre, creadoPor]);
}

export function editarCliente(idCliente: number, nombre: string, modificadoPor: string) {
  return executeProcedure("sp_cliente_editar", [idCliente, nombre, modificadoPor]);
}

export function desactivarCliente(idCliente: number, modificadoPor: string) {
  return executeProcedure("sp_cliente_desactivar", [idCliente, modificadoPor]);
}

export function listarClientes(idUsuarioActor: number, codigoRolActor: CodigoRol) {
  return executeProcedure<Cliente>("sp_cliente_listar", [idUsuarioActor, codigoRolActor]);
}
