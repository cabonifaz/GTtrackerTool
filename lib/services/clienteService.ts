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
