const toast = document.getElementById("toast");
let toastTimer = null;

export function showToast(message, tone = "info") {
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

export function showView(view) {
  ["authView", "dashboardView", "gameView"].forEach((id) => {
    document.getElementById(id).classList.toggle("hidden", id !== view);
  });
}

export function openRoomModal({ title, message, code = "-----", join = false }) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;
  document.getElementById("roomCodeText").textContent = code;
  document.getElementById("joinForm").classList.toggle("hidden", !join);
  document.getElementById("roomModal").classList.remove("hidden");
  if (join) document.getElementById("joinCodeInput").focus();
}

export function closeRoomModal() {
  document.getElementById("roomModal").classList.add("hidden");
}

export function setGameStatus(text) {
  document.getElementById("gameStatus").textContent = text;
}

export function setScore(score) {
  document.getElementById("scoreValue").textContent = score;
}

export function setGameMode(text) {
  document.getElementById("gameModeLabel").textContent = text;
}

export function setControlsEnabled(enabled) {
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.disabled = !enabled;
    button.style.opacity = enabled ? "1" : "0.46";
  });
}

export function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  document.getElementById("themeIcon").textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem("snakeTheme", theme);
}
