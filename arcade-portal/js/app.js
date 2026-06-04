const SESSION_KEY = "arcade_user";
const authForm = document.getElementById("authForm");
const codeForm = document.getElementById("codeForm");
const emailInput = document.getElementById("emailInput");
const codeInput = document.getElementById("codeInput");
const message = document.getElementById("message");
const authPanel = document.getElementById("authPanel");
const selectorPanel = document.getElementById("selectorPanel");
const bind = (id, eventName, handler) => {
  const element = document.getElementById(id);
  if (element) element.addEventListener(eventName, handler);
};

let authType = "register";
let pendingEmail = "";

function setMessage(text, isError = false) {
  message.textContent = text || "";
  message.classList.toggle("error", Boolean(isError));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user, token) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
}

bind("pacmanLaunchBtn", "click", () => {
  sessionStorage.setItem("pacman_entry_intro", "1");
});

function transitionToSelector() {
  authPanel.classList.remove("is-active");
  authPanel.classList.add("is-hidden");
  selectorPanel.classList.remove("is-hidden");
  requestAnimationFrame(() => selectorPanel.classList.add("is-active"));
}

function transitionToAuth() {
  selectorPanel.classList.remove("is-active");
  selectorPanel.classList.add("is-hidden");
  authPanel.classList.remove("is-hidden");
  requestAnimationFrame(() => authPanel.classList.add("is-active"));
}

async function logoutAll() {
  const session = getSession();
  if (session?.token) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` }
    }).catch(() => {});
  }
  localStorage.removeItem(SESSION_KEY);
  transitionToAuth();
  setMessage("Sesión cerrada.");
}

document.querySelectorAll("[data-auth-type]").forEach((btn) => {
  btn.addEventListener("click", () => {
    authType = btn.dataset.authType;
    document.querySelectorAll("[data-auth-type]").forEach((item) => item.classList.toggle("active", item === btn));
  });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pendingEmail = emailInput.value.trim().toLowerCase();

  try {
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, type: authType })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "No se pudo pedir el código.");

    authForm.classList.add("hidden");
    codeForm.classList.remove("hidden");
    codeInput.focus();
    setMessage(data.message || "Código enviado. Revisá tu email o la consola del servidor.");
  } catch (error) {
    setMessage(error.message, true);
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, code: codeInput.value.trim(), type: authType })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "No se pudo verificar el código.");

    setSession(data.user, data.token || null);
    setMessage("Sesión iniciada correctamente.");
    transitionToSelector();
  } catch (error) {
    setMessage(error.message, true);
  }
});

bind("backBtn", "click", () => {
  codeForm.classList.add("hidden");
  authForm.classList.remove("hidden");
  setMessage("Podés corregir el email y volver a pedir el código.");
});

bind("logoutBtn", "click", logoutAll);

(function init() {
  const session = getSession();
  if (session?.user?.email) transitionToSelector();
})();
