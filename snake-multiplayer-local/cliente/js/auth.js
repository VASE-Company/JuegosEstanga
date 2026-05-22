const SESSION_KEY = "snakeUser";

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email }));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function requestCode(email, type) {
  const response = await fetch("/api/auth/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo pedir el código.");
  return data;
}

export async function verifyCode(email, code, type) {
  const response = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, type })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo verificar el código.");
  setCurrentUser(data.user);
  return data.user;
}
