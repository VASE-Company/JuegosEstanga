// auth.js maneja la sesion del jugador en el navegador y las llamadas
// al servidor para pedir/verificar el codigo de acceso por email.
const SESSION_KEY = "arcade_user";

// Lee la sesion guardada en localStorage. Si no existe o esta corrupta,
// devuelve null para obligar al usuario a volver a ingresar.
export function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session?.user || null;
  } catch {
    return null;
  }
}

// Guarda solo los datos necesarios del jugador. El token queda preparado
// para crecer despues, aunque este juego local no lo usa para proteger rutas.
export function setCurrentUser(user, token = null) {
  const current = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  const nextSession = { ...current, user: { id: user.id, email: user.email } };
  if (token) nextSession.token = token;
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
}

// Cierra sesion borrando la clave local. La interfaz decide despues
// si vuelve al login o al menu.
export async function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// Pide al backend un codigo de 6 digitos para registrar o iniciar sesion.
// En desarrollo, si no hay SMTP, el servidor lo muestra por consola.
export async function requestCode(email, type) {
  const response = await fetch("/api/auth/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo pedir el codigo.");
  return data;
}

// Envia el codigo ingresado por el usuario. Si es correcto, el servidor
// devuelve el usuario y aca se guarda la sesion en localStorage.
export async function verifyCode(email, code, type) {
  const response = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, type })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo verificar el codigo.");
  setCurrentUser(data.user, data.token || null);
  return data.user;
}
