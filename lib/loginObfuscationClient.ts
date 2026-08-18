import { CLAVE_OFUSCACION_LOGIN_B64 } from "@/lib/loginObfuscation";

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binario = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

/**
 * Ofusca el password antes de mandarlo en el body del login (ver
 * lib/loginObfuscation.ts para el porque). Si Web Crypto no esta
 * disponible por alguna razon, devuelve el password tal cual en vez de
 * bloquear el login -- mejor eso que dejar a alguien sin poder entrar.
 */
export async function ofuscarPassword(password: string): Promise<string> {
  try {
    const keyBytes = base64ToBytes(CLAVE_OFUSCACION_LOGIN_B64);
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
    const iv = new Uint8Array(new ArrayBuffer(12));
    crypto.getRandomValues(iv);
    const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(password));

    const combinado = new Uint8Array(new ArrayBuffer(iv.length + cifrado.byteLength));
    combinado.set(iv, 0);
    combinado.set(new Uint8Array(cifrado), iv.length);
    return bytesToBase64(combinado);
  } catch {
    return password;
  }
}
