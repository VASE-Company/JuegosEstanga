import { getCurrentUser, logout, requestCode, verifyCode } from "./auth.js";
import { fetchRankings, renderRanking, saveSingleplayerScore } from "./rankings.js";
import { askRankings, createRoom, finishTurn, getSocket, joinRoom, leaveRoom, sendSnakeState } from "./socket.js";
import { SnakeGame } from "./snake.js";
import {
  applyTheme,
  closeRoomModal,
  openRoomModal,
  setControlsEnabled,
  setGameMode,
  setGameStatus,
  setScore,
  showToast,
  showView
} from "./ui.js";

const authForm = document.getElementById("authForm");
const codeForm = document.getElementById("codeForm");
const emailInput = document.getElementById("emailInput");
const codeInput = document.getElementById("codeInput");
const userEmail = document.getElementById("userEmail");
const personalRanking = document.getElementById("personalRanking");
const generalRanking = document.getElementById("generalRanking");
const canvas = document.getElementById("snakeCanvas");
const restartBtn = document.getElementById("restartBtn");
const backMenuBtn = document.getElementById("backMenuBtn");
const joinForm = document.getElementById("joinForm");
const joinCodeInput = document.getElementById("joinCodeInput");

let authType = "register";
let pendingEmail = "";
let user = getCurrentUser();
let game = null;
let currentMode = null;
let activeRoomCode = null;
let multiplayerActiveTurn = false;
let turnFinished = false;

function requireUser() {
  user = getCurrentUser();
  if (!user?.id || !user?.email) {
    showToast("Iniciá sesión para jugar.", "error");
    showView("authView");
    return false;
  }
  return true;
}

async function loadRankings() {
  if (!user) return;
  const data = await fetchRankings(user.email);
  renderRanking(personalRanking, data.personalTop3, "Todavía no tenés scores.");
  renderRanking(generalRanking, data.generalTop10, "Todavía no hay scores en este servidor.");
}

function showDashboard() {
  user = getCurrentUser();
  if (!user) {
    showView("authView");
    return;
  }
  userEmail.textContent = user.email;
  showView("dashboardView");
  loadRankings().catch((error) => showToast(error.message, "error"));
  askRankings(user.email);
}

function setupGame({ mode, status, controls = true }) {
  game?.stop();
  turnFinished = false;
  currentMode = mode;
  setGameMode(mode === "singleplayer" ? "1 jugador" : "2 jugadores por turnos");
  setGameStatus(status);
  setScore(0);
  setControlsEnabled(controls);
  restartBtn.classList.toggle("hidden", mode !== "singleplayer");
  showView("gameView");
}

function startSingleplayer() {
  if (!requireUser()) return;
  activeRoomCode = null;
  multiplayerActiveTurn = false;
  setupGame({ mode: "singleplayer", status: "Jugando", controls: true });
  game = new SnakeGame(canvas, {
    onScore: setScore,
    onGameOver: async (score) => {
      setGameStatus(`Perdiste. Score final: ${score}`);
      setControlsEnabled(false);
      try {
        await saveSingleplayerScore(user.email, score);
        await loadRankings();
        showToast("Score guardado.");
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  });
  game.start();
}

function startActiveMultiplayerTurn(room) {
  multiplayerActiveTurn = true;
  activeRoomCode = room.codigo;
  setupGame({ mode: "multiplayer", status: "Tu turno: jugá hasta perder", controls: true });
  game = new SnakeGame(canvas, {
    onScore: setScore,
    onState: (state) => sendSnakeState(activeRoomCode, state),
    onGameOver: async (score) => {
      if (turnFinished) return;
      turnFinished = true;
      setControlsEnabled(false);
      setGameStatus(`Turno terminado. Score: ${score}`);
      const result = await finishTurn(activeRoomCode, score);
      if (!result?.ok) showToast(result?.error || "No se pudo finalizar el turno.", "error");
    }
  });
  game.start();
}

function startSpectator(room, message) {
  multiplayerActiveTurn = false;
  activeRoomCode = room.codigo;
  setupGame({ mode: "multiplayer", status: message, controls: false });
  game = new SnakeGame(canvas, { onScore: setScore });
  game.setActive(false);
  if (room.currentSnakeState) game.renderState(room.currentSnakeState);
}

function returnToMenu() {
  game?.stop();
  if (activeRoomCode && currentMode === "multiplayer") leaveRoom(activeRoomCode);
  activeRoomCode = null;
  currentMode = null;
  multiplayerActiveTurn = false;
  showDashboard();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pendingEmail = emailInput.value.trim().toLowerCase();
  try {
    await requestCode(pendingEmail, authType);
    authForm.classList.add("hidden");
    codeForm.classList.remove("hidden");
    codeInput.focus();
    showToast("Código enviado. Revisá email o consola del servidor.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    user = await verifyCode(pendingEmail, codeInput.value.trim(), authType);
    codeInput.value = "";
    showToast("Sesión iniciada.");
    showDashboard();
  } catch (error) {
    showToast(error.message, "error");
  }
});

document.getElementById("backToEmailBtn").addEventListener("click", () => {
  codeForm.classList.add("hidden");
  authForm.classList.remove("hidden");
});

document.querySelectorAll("[data-auth-type]").forEach((button) => {
  button.addEventListener("click", () => {
    authType = button.dataset.authType;
    document.querySelectorAll("[data-auth-type]").forEach((item) => item.classList.toggle("active", item === button));
  });
});

document.getElementById("singleBtn").addEventListener("click", startSingleplayer);

document.getElementById("createRoomBtn").addEventListener("click", async () => {
  if (!requireUser()) return;
  const result = await createRoom(user);
  if (!result?.ok) {
    showToast(result?.error || "No se pudo crear la partida.", "error");
    return;
  }
  activeRoomCode = result.room.codigo;
  openRoomModal({
    title: "Código de sala",
    message: "Compartilo con el segundo jugador. La partida empieza cuando se una.",
    code: activeRoomCode
  });
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  if (!requireUser()) return;
  openRoomModal({
    title: "Unirse a sala",
    message: "Ingresá el código de 5 caracteres que creó el otro jugador.",
    code: "-----",
    join: true
  });
});

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireUser()) return;
  const code = joinCodeInput.value.trim().toUpperCase();
  const result = await joinRoom(user, code);
  if (!result?.ok) {
    showToast(result?.error || "No se pudo unir a la sala.", "error");
    return;
  }
  activeRoomCode = result.room.codigo;
  closeRoomModal();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  logout();
  user = null;
  showToast("Sesión cerrada.");
  showView("authView");
});

document.getElementById("themeToggle").addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  game?.draw();
});

document.getElementById("closeModalBtn").addEventListener("click", closeRoomModal);
document.getElementById("roomModal").addEventListener("click", (event) => {
  if (event.target.id === "roomModal") closeRoomModal();
});

restartBtn.addEventListener("click", startSingleplayer);
backMenuBtn.addEventListener("click", returnToMenu);

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => game?.setDirection(button.dataset.direction));
});

window.addEventListener("keydown", (event) => {
  const gameViewVisible = !document.getElementById("gameView").classList.contains("hidden");
  const canUseKeyboard =
    gameViewVisible &&
    game &&
    (currentMode === "singleplayer" || (currentMode === "multiplayer" && multiplayerActiveTurn));
  if (!canUseKeyboard) return;

  const target = event.target;
  const isTypingField =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable;
  if (isTypingField) return;

  const map = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };
  if (map[event.key]) {
    event.preventDefault();
    game?.setDirection(map[event.key]);
  }
});

const socket = getSocket();

socket.on("partida-creada-snake", (room) => {
  activeRoomCode = room.codigo;
});

socket.on("jugador-unido-snake", () => {
  showToast("El segundo jugador se unió.");
});

socket.on("partida-iniciada-snake", () => {
  closeRoomModal();
});

socket.on("esperar-rival-snake", ({ jugadorActivo }) => {
  setGameStatus(`Esperando tu turno. Juega ${jugadorActivo}`);
  setControlsEnabled(false);
});

socket.on("turno-snake", ({ room, activo, jugadorActivo }) => {
  if (activo) {
    startActiveMultiplayerTurn(room);
  } else {
    startSpectator(room, `Esperando tu turno. Juega ${jugadorActivo}`);
  }
});

socket.on("estado-snake-espectador", ({ state, jugadorActivo }) => {
  if (!game || multiplayerActiveTurn) return;
  setGameStatus(`Viendo a ${jugadorActivo}`);
  game.renderState(state);
});

socket.on("turno-finalizado-snake", ({ jugador, score }) => {
  showToast(`${jugador} terminó con ${score} puntos.`);
});

socket.on("partida-finalizada-snake", async ({ room, winner, empate }) => {
  game?.stop();
  setControlsEnabled(false);
  const j1 = room.jugador1;
  const j2 = room.jugador2;
  const result = empate ? "Empate" : `Ganó ${winner}`;
  setGameStatus(`${result}. ${j1.email}: ${j1.score} / ${j2.email}: ${j2.score}`);
  showToast("Partida finalizada. Rankings actualizados.");
  activeRoomCode = null;
  await loadRankings().catch(() => {});
});

socket.on("rival-desconectado", ({ message }) => {
  game?.stop();
  setControlsEnabled(false);
  setGameStatus(message || "El rival se desconectó.");
  showToast(message || "La partida fue cancelada.", "error");
  activeRoomCode = null;
});

socket.on("error-partida", ({ message }) => {
  showToast(message || "Error de partida.", "error");
});

socket.on("rankings-actualizados", () => {
  if (user) loadRankings().catch(() => {});
});

applyTheme(localStorage.getItem("snakeTheme") || "light");
showDashboard();
