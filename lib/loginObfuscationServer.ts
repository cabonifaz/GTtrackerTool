import crypto from "crypto";
import { CLAVE_OFUSCACION_LOGIN_B64 } from "@/lib/loginObfuscation";

/**
 * Revierte ofuscarPassword() (ver lib/loginObfuscationClient.ts). Si el
 * valor recibido no decodifica como AES-GCM valido -- porque el cliente
 * cayo a su propio fallback de mandar el password sin cifrar, o por
 * cualquier otro motivo -- se devuelve el valor tal cual en vez de
 * fallar el login por un problema de esta capa cosmetica.
 */
export function desofuscarPassword(valor: string): string {
  try {
    const combinado = Buffer.from(valor, "base64");
    if (combinado.length < 12 + 16) return valor;

    const iv = combinado.subarray(0, 12);
    const authTag = combinado.subarray(combinado.length - 16);
    const ciphertext = combinado.subarray(12, combinado.length - 16);

    const key = Buffer.from(CLAVE_OFUSCACION_LOGIN_B64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
  } catch {
    return valor;
  }
}
