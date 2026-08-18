// Clave AES-256-GCM usada SOLO para que el password no aparezca en texto
// plano en el payload del request de login (pestaña Network del
// navegador). Esto es ofuscacion, no un limite de seguridad real: para
// que el navegador pueda cifrar, esta misma clave tiene que viajar en el
// bundle de JS que se le entrega al cliente, asi que cualquiera que la
// busque en el codigo fuente puede revertirlo igual. Lo unico que
// realmente protege el password en la red es TLS -- esto solo evita que
// se vea "a simple vista" en las DevTools.
export const CLAVE_OFUSCACION_LOGIN_B64 = "DfH3v8CDWHZsp+1uUvSXBasN95YriGLGf12Qmls3Bq8=";
