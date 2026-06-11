const SESSION_KEY = "arcade_user";

export function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session?.user || null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user, token = null) {
  const current = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  const nextSession = { ...current, user: { id: user.id, email: user.email } };
  if (token) nextSession.token = token;
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
}

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
