const SESSION_KEY = "arcade_user";

export function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session?.user || null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  const current = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, user: { id: user.id, email: user.email } }));
}

export async function logout() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    if (session?.token) {
      await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${session.token}` } });
    }
  } catch {}
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
  if (data?.token) {`r`n    const current = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");`r`n    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, token: data.token, user: data.user }));`r`n  } else {`r`n    setCurrentUser(data.user);`r`n  }
  return data.user;
}

