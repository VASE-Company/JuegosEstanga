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
  setMusicState,
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
const gameRankingList = document.getElementById("gameRankingList");
const bestScoreValue = document.getElementById("bestScoreValue");
const bestMatchValue = document.getElementById("bestMatchValue");
const playerEmailShort = document.getElementById("playerEmailShort");
const canvas = document.getElementById("snakeCanvas");
const restartBtn = document.getElementById("restartBtn");
const backMenuBtn = document.getElementById("backMenuBtn");
const pauseBtn = document.getElementById("pauseBtn");
const musicToggle = document.getElementById("musicToggle");
const gameMusic = document.getElementById("gameMusic");
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
let paused = false;
let controlsActive = false;
let musicPlaying = false;

function requireUser() {
  user = getCurrentUser();
  if (!user?.id || !user?.email) {
    showView("authView");
    return false;
  }
  return true;
}

async function loadRankings() {
  if (!user) return;
  const data = await fetchRankings(user.email);
  renderRanking(personalRanking, data.personalTop3, "Todavia no tenes trofeos.");
  renderRanking(generalRanking, data.generalTop10, "Todavia no hay cazadores en este servidor.");
  renderRanking(gameRankingList, data.generalTop10.slice(0, 5), "Todavia no hay cazadores.");

  const personalBest = data.personalTop3[0]?.score || 0;
  const serverBest = data.generalTop10[0]?.score || 0;
  bestScoreValue.textContent = Math.max(personalBest, serverBest);
  bestMatchValue.textContent = personalBest;
}

function showDashboard() {
  user = getCurrentUser();
  if (!user) {
    showView("authView");
    return;
  }
  userEmail.textContent = user.email;
  playerEmailShort.textContent = user.email.split("@")[0] || "Julian Alvarez";
  showView("dashboardView");
  loadRankings().catch((error) => showToast(error.message, "error"));
  askRankings(user.email);
}

function setPauseButton(isPaused, enabled = controlsActive) {
  paused = isPaused;
  pauseBtn.disabled = !enabled;
  pauseBtn.textContent = isPaused ? "Seguir" : "Pausa";
  pauseBtn.classList.toggle("paused", isPaused);
}

function togglePause() {
  if (!game || !controlsActive || game.gameOver) return;
  setPauseButton(!paused);
  game.setActive(!paused);
  if (paused) {
    setGameStatus("Pausa");
  } else {
    setGameStatus(currentMode === "singleplayer" ? "Caza trofeos con Julian" : "Tu turno: caza trofeos hasta caer");
    game.start();
  }
}

async function toggleMusic() {
  if (!gameMusic) return;

  if (musicPlaying) {
    gameMusic.pause();
    musicPlaying = false;
    setMusicState(false);
    return;
  }

  gameMusic.volume = 0.42;
  try {
    await gameMusic.play();
    musicPlaying = true;
    setMusicState(true);
  } catch (error) {
    musicPlaying = false;
    setMusicState(false);
    showToast("El navegador bloqueo la musica. Toca el boton de musica otra vez.", "error");
  }
}

function setupGame({ mode, status, controls = true }) {
  game?.stop();
  turnFinished = false;
  controlsActive = controls;
  currentMode = mode;
  setGameMode(mode === "singleplayer" ? "Caza individual" : "Duelo por turnos");
  setGameStatus(status);
  setScore(0);
  setControlsEnabled(controls);
  setPauseButton(false, controls);
  restartBtn.classList.toggle("hidden", mode !== "singleplayer");
  showView("gameView");
}

function startSingleplayer() {
  if (!requireUser()) return;
  activeRoomCode = null;
  multiplayerActiveTurn = false;
  setupGame({ mode: "singleplayer", status: "Caza trofeos con Julian", controls: true });
  game = new SnakeGame(canvas, {
    onScore: setScore,
    onGameOver: async (score) => {
      setGameStatus(`Fin de la caza. Score final: ${score}`);
      setControlsEnabled(false);
      setPauseButton(false, false);
      try {
        await saveSingleplayerScore(user.email, score);
        await loadRankings();
        showToast("Score guardado para Julian Trophy Hunter.");
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
  setupGame({ mode: "multiplayer", status: "Tu turno: caza trofeos hasta caer", controls: true });
  game = new SnakeGame(canvas, {
    onScore: setScore,
    onState: (state) => sendSnakeState(activeRoomCode, state),
    onGameOver: async (score) => {
      if (turnFinished) return;
      turnFinished = true;
      setControlsEnabled(false);
      setPauseButton(false, false);
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
  controlsActive = false;
  setPauseButton(false, false);
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
    showToast("Codigo enviado. Revisa email o consola del servidor.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    user = await verifyCode(pendingEmail, codeInput.value.trim(), authType);
    codeInput.value = "";
    showToast("Sesion iniciada.");
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
    title: "Codigo de sala",
    message: "Compartilo con el segundo jugador. La partida empieza cuando se una.",
    code: activeRoomCode
  });
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  if (!requireUser()) return;
  openRoomModal({
    title: "Unirse a sala",
    message: "Ingresa el codigo de 5 caracteres que creo el otro jugador.",
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
  logout().finally(() => {
    user = null;
    showView("authView");
  });
});

document.getElementById("themeToggle").addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  game?.draw();
});

musicToggle.addEventListener("click", toggleMusic);
gameMusic.addEventListener("pause", () => {
  if (!musicPlaying) return;
  musicPlaying = false;
  setMusicState(false);
});

document.getElementById("closeModalBtn").addEventListener("click", closeRoomModal);
document.getElementById("roomModal").addEventListener("click", (event) => {
  if (event.target.id === "roomModal") closeRoomModal();
});

restartBtn.addEventListener("click", startSingleplayer);
backMenuBtn.addEventListener("click", returnToMenu);
pauseBtn.addEventListener("click", togglePause);

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
  if (event.key === "p" || event.key === "P") {
    event.preventDefault();
    togglePause();
    return;
  }
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
  showToast("El segundo jugador se unio.");
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
  showToast(`${jugador} termino con ${score} puntos.`);
});

socket.on("partida-finalizada-snake", async ({ room, winner, empate }) => {
  game?.stop();
  setControlsEnabled(false);
  setPauseButton(false, false);
  const j1 = room.jugador1;
  const j2 = room.jugador2;
  const result = empate ? "Empate" : `Gano ${winner}`;
  setGameStatus(`${result}. ${j1.email}: ${j1.score} / ${j2.email}: ${j2.score}`);
  showToast("Partida finalizada. Rankings actualizados.");
  activeRoomCode = null;
  await loadRankings().catch(() => {});
});

socket.on("rival-desconectado", ({ message }) => {
  game?.stop();
  setControlsEnabled(false);
  setPauseButton(false, false);
  setGameStatus(message || "El rival se desconecto.");
  showToast(message || "La partida fue cancelada.", "error");
  activeRoomCode = null;
});

socket.on("error-partida", ({ message }) => {
  showToast(message || "Error de partida.", "error");
});

socket.on("rankings-actualizados", () => {
  if (user) loadRankings().catch(() => {});
});

applyTheme(localStorage.getItem("snakeTheme") || "dark");
setMusicState(false);
if (user?.id && user?.email) {
  showDashboard();
} else {
  showView("authView");
}
