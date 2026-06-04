const toast = document.getElementById("toast");
let toastTimer = null;

const icons = {
  sun: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
    </svg>`,
  moon: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.2 14.8A8 8 0 0 1 9.2 3.8 7 7 0 1 0 20.2 14.8Z"></path>
    </svg>`,
  musicOn: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18V5l11-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="17" cy="16" r="3"></circle>
    </svg>`,
  musicOff: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18V5l8-1.45M20 12.5V3l-2.2.4"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="m3 3 18 18"></path>
    </svg>`
};

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
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("dark", nextTheme === "dark");
  document.getElementById("themeIcon").innerHTML = nextTheme === "light" ? icons.sun : icons.moon;
  document.getElementById("themeLabel").textContent = nextTheme === "light" ? "Claro" : "Oscuro";
  localStorage.setItem("snakeTheme", nextTheme);
}

export function setMusicState(isPlaying) {
  document.getElementById("musicIcon").innerHTML = isPlaying ? icons.musicOn : icons.musicOff;
  document.getElementById("musicLabel").textContent = isPlaying ? "Mutear" : "Escuchar";
  document.getElementById("musicToggle").setAttribute(
    "aria-label",
    isPlaying ? "Mutear musica" : "Escuchar musica"
  );
  document.getElementById("musicToggle").title = isPlaying ? "Mutear musica" : "Escuchar musica";
}
