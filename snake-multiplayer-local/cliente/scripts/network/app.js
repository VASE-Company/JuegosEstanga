import { getCurrentUser, logout, requestCode, verifyCode } from "../core/auth.js";
import { fetchRankings, renderRanking, saveSingleplayerScore } from "../core/rankings.js";
import { askRankings, createRoom, finishTurn, getSocket, joinRoom, leaveRoom, sendSnakeState } from "./socket.js";
import { SnakeGame } from "../game/snake.js";
import {
  applyTheme,
  closeRoomModal,
  openRoomModal,
  setControlsEnabled,
  setFullscreenState,
  setGameMode,
  setGameStatus,
  setMusicState,
  setScore,
  showToast,
  showView
} from "../core/ui.js";

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
const localPlayerLabel = document.getElementById("localPlayerLabel");
const rivalPlayerRow = document.getElementById("rivalPlayerRow");
const rivalPlayerLabel = document.getElementById("rivalPlayerLabel");
const gameView = document.getElementById("gameView");
const canvas = document.getElementById("snakeCanvas");
const restartBtn = document.getElementById("restartBtn");
const backMenuBtn = document.getElementById("backMenuBtn");
const pauseBtn = document.getElementById("pauseBtn");
const gameFullscreenBtn = document.getElementById("gameFullscreenBtn");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const musicToggle = document.getElementById("musicToggle");
const fullscreenToggle = document.getElementById("fullscreenToggle");
const gameMusic = document.getElementById("gameMusic");
const joinForm = document.getElementById("joinForm");
const joinCodeInput = document.getElementById("joinCodeInput");
const instructionsModal = document.getElementById("instructionsModal");
const appShell = document.querySelector(".app-shell");
const gameStatus = document.getElementById("gameStatus");

let authType = "register";
let pendingEmail = "";
let user = getCurrentUser();
let game = null;
let currentMode = null;
let activeRoomCode = null;
let activeRoom = null;
let multiplayerActiveTurn = false;
let turnFinished = false;
let paused = false;
let controlsActive = false;
let musicPlaying = false;
let statusTimer = null;
const keyboardHintQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

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

function shortPlayerName(email) {
  return String(email || "").split("@")[0] || "Julian Alvarez";
}

function scoreSuffix(player) {
  return Number.isFinite(player?.score) ? ` - ${player.score}` : "";
}

function updatePlayerPanel(room = activeRoom) {
  const currentEmail = user?.email || "";
  const currentShortName = shortPlayerName(currentEmail);
  playerEmailShort.textContent = currentShortName;
  localPlayerLabel.textContent = currentShortName;
  rivalPlayerRow.classList.add("hidden");
  rivalPlayerLabel.textContent = "Esperando rival";

  if (!room || currentMode !== "multiplayer") return;

  const players = [room.jugador1, room.jugador2].filter(Boolean);
  const self = players.find((player) => player.email === currentEmail);
  const other = players.find((player) => player.email !== currentEmail);

  if (self) {
    playerEmailShort.textContent = shortPlayerName(self.email);
    localPlayerLabel.textContent = `${shortPlayerName(self.email)}${scoreSuffix(self)}`;
  }

  if (other) {
    rivalPlayerLabel.textContent = `${shortPlayerName(other.email)}${scoreSuffix(other)}`;
    rivalPlayerRow.classList.remove("hidden");
  } else if (room.estado === "esperando_jugador") {
    rivalPlayerLabel.textContent = "Esperando rival";
    rivalPlayerRow.classList.remove("hidden");
  }
}

function pauseText(isPaused) {
  const action = isPaused ? "Seguir" : "Pausa";
  return keyboardHintQuery.matches ? `${action} (P)` : action;
}

function showTemporaryStatus(message, duration = 2000) {
  clearTimeout(statusTimer);
  setGameStatus(message);
  statusTimer = setTimeout(() => {
    gameStatus.classList.add("hidden");
  }, duration);
}

function setPersistentStatus(message) {
  clearTimeout(statusTimer);
  setGameStatus(message);
}

function showDashboard() {
  user = getCurrentUser();
  if (!user) {
    showView("authView");
    return;
  }
  userEmail.textContent = user.email;
  updatePlayerPanel(null);
  showView("dashboardView");
  loadRankings().catch((error) => showToast(error.message, "error"));
  askRankings(user.email);
}

function setPauseButton(isPaused, enabled = controlsActive) {
  paused = isPaused;
  pauseBtn.disabled = !enabled;
  const text = pauseText(isPaused);
  pauseBtn.textContent = text;
  pauseBtn.title = keyboardHintQuery.matches ? `${text}. Presionar P en PC.` : text;
  pauseBtn.setAttribute("aria-label", keyboardHintQuery.matches ? `${text}. Presionar P en PC.` : text);
  pauseBtn.classList.toggle("paused", isPaused);
}

function setGameFullscreenButton(isFullscreen) {
  if (!gameFullscreenBtn) return;
  gameFullscreenBtn.textContent = isFullscreen ? "Salir" : "Pantalla";
  gameFullscreenBtn.title = isFullscreen ? "Salir de pantalla completa" : "Pantalla completa";
  gameFullscreenBtn.setAttribute(
    "aria-label",
    isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
  );
  gameFullscreenBtn.classList.toggle("active", isFullscreen);
}

function announceLevelUp(level) {
  const status = currentMode === "multiplayer"
    ? `Subiste al nivel ${level}. Ahora hay muros en tu turno.`
    : `Subiste al nivel ${level}. Esquiva los muros.`;
  showTemporaryStatus(status);
  showToast(`Subiste al nivel ${level}. Esquiva los muros.`);
}

async function completeSingleplayer(score) {
  setControlsEnabled(false);
  setPauseButton(false, false);
  showTemporaryStatus(`Felicitaciones. Score final: ${score}`);
  showToast("Felicitaciones por haber completado todos los niveles. Sos un verdadero ganador.");
  try {
    await saveSingleplayerScore(user.email, score);
    await loadRankings();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function completeMultiplayerTurn(score) {
  if (turnFinished) return;
  turnFinished = true;
  setControlsEnabled(false);
  setPauseButton(false, false);
  showTemporaryStatus(`Felicitaciones. Score: ${score}`);
  showToast("Felicitaciones por haber completado todos los niveles. Sos un verdadero ganador.");
  const result = await finishTurn(activeRoomCode, score);
  if (!result?.ok) showToast(result?.error || "No se pudo finalizar el turno.", "error");
}

function togglePause() {
  if (!game || !controlsActive || game.gameOver) return;
  setPauseButton(!paused);
  game.setActive(!paused);
  if (paused) {
    setPersistentStatus("Pausa");
  } else {
    showTemporaryStatus(currentMode === "singleplayer" ? "Caza trofeos con Julian" : "Tu turno: caza trofeos hasta caer");
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

async function toggleFullscreen() {
  try {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreenElement) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      if (!exitFullscreen) throw new Error("Fullscreen no soportado");
      await exitFullscreen.call(document);
      return;
    }
    const target = appShell || document.documentElement;
    const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
    if (!requestFullscreen) throw new Error("Fullscreen no soportado");
    await requestFullscreen.call(target);
  } catch (error) {
    showToast("No se pudo cambiar pantalla completa en este navegador.", "error");
  }
}

function setupGame({ mode, status, controls = true, room = null }) {
  game?.stop();
  turnFinished = false;
  controlsActive = controls;
  currentMode = mode;
  activeRoom = room;
  setGameMode(mode === "singleplayer" ? "Caza individual" : "Duelo por turnos");
  showTemporaryStatus(status);
  setScore(0);
  setControlsEnabled(controls);
  setPauseButton(false, controls);
  updatePlayerPanel(room);
  restartBtn.classList.toggle("hidden", mode !== "singleplayer");
  showView("gameView");
}

function startSingleplayer() {
  if (!requireUser()) return;
  activeRoomCode = null;
  activeRoom = null;
  multiplayerActiveTurn = false;
  setupGame({ mode: "singleplayer", status: "Caza trofeos con Julian", controls: true });
  game = new SnakeGame(canvas, {
    onScore: setScore,
    onLevelUp: announceLevelUp,
    onGameComplete: completeSingleplayer,
    onGameOver: async (score) => {
      showTemporaryStatus(`Fin de la caza. Score final: ${score}`);
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
  activeRoom = room;
  setupGame({ mode: "multiplayer", status: "Es tu turno. Caza trofeos.", controls: true, room });
  game = new SnakeGame(canvas, {
    onScore: setScore,
    onLevelUp: announceLevelUp,
    onGameComplete: completeMultiplayerTurn,
    onState: (state) => sendSnakeState(activeRoomCode, state),
    onGameOver: async (score) => {
      if (turnFinished) return;
      turnFinished = true;
      setControlsEnabled(false);
      setPauseButton(false, false);
      showTemporaryStatus(`Turno terminado. Score: ${score}`);
      const result = await finishTurn(activeRoomCode, score);
      if (!result?.ok) showToast(result?.error || "No se pudo finalizar el turno.", "error");
    }
  });
  game.start();
}

function startSpectator(room, message) {
  multiplayerActiveTurn = false;
  activeRoomCode = room.codigo;
  activeRoom = room;
  setupGame({ mode: "multiplayer", status: message, controls: false, room });
  game = new SnakeGame(canvas, { onScore: setScore });
  game.setActive(false);
  if (room.currentSnakeState) game.renderState(room.currentSnakeState);
}

function returnToMenu() {
  game?.stop();
  if (activeRoomCode && currentMode === "multiplayer") leaveRoom(activeRoomCode);
  activeRoomCode = null;
  activeRoom = null;
  currentMode = null;
  multiplayerActiveTurn = false;
  controlsActive = false;
  setPauseButton(false, false);
  updatePlayerPanel(null);
  showDashboard();
}

function openInstructions() {
  instructionsModal.classList.remove("hidden");
  document.getElementById("closeInstructionsBtn").focus();
}

function closeInstructions() {
  instructionsModal.classList.add("hidden");
  document.getElementById("howToPlayBtn")?.focus();
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
  activeRoom = result.room;
  updatePlayerPanel(result.room);
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

document.getElementById("howToPlayBtn").addEventListener("click", openInstructions);

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
  activeRoom = result.room;
  updatePlayerPanel(result.room);
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
fullscreenToggle.addEventListener("click", toggleFullscreen);
gameFullscreenBtn.addEventListener("click", toggleFullscreen);
function updateFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  setFullscreenState(isFullscreen);
  setGameFullscreenButton(isFullscreen);
  game?.draw();
}
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
scrollTopBtn.addEventListener("click", () => {
  const target = document.fullscreenElement || document.scrollingElement || document.documentElement;
  if (target === document.documentElement || target === document.body) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  target.scrollTo?.({ top: 0, behavior: "smooth" });
});

document.getElementById("closeModalBtn").addEventListener("click", closeRoomModal);
document.getElementById("roomModal").addEventListener("click", (event) => {
  if (event.target.id === "roomModal") closeRoomModal();
});
document.getElementById("closeInstructionsBtn").addEventListener("click", closeInstructions);
instructionsModal.addEventListener("click", (event) => {
  if (event.target.id === "instructionsModal") closeInstructions();
});

restartBtn.addEventListener("click", startSingleplayer);
backMenuBtn.addEventListener("click", returnToMenu);
pauseBtn.addEventListener("click", togglePause);
if (keyboardHintQuery.addEventListener) {
  keyboardHintQuery.addEventListener("change", () => setPauseButton(paused, controlsActive));
} else {
  keyboardHintQuery.addListener(() => setPauseButton(paused, controlsActive));
}

document.querySelectorAll("[data-direction]").forEach((button) => {
  const pressDirection = (event) => {
    event.preventDefault();
    if (button.disabled) return;
    game?.setDirection(button.dataset.direction);
  };

  button.addEventListener("pointerdown", pressDirection);
  button.addEventListener("touchstart", pressDirection, { passive: false });
  button.addEventListener("click", pressDirection);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !instructionsModal.classList.contains("hidden")) {
    closeInstructions();
    return;
  }

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
  activeRoom = room;
  updatePlayerPanel(room);
});

socket.on("jugador-unido-snake", (room) => {
  activeRoom = room;
  activeRoomCode = room.codigo;
  updatePlayerPanel(room);
  showToast("El segundo jugador se unio.");
});

socket.on("partida-iniciada-snake", (room) => {
  activeRoom = room;
  activeRoomCode = room.codigo;
  updatePlayerPanel(room);
  closeRoomModal();
});

socket.on("esperar-rival-snake", ({ jugadorActivo }) => {
  showTemporaryStatus(`Turno de ${shortPlayerName(jugadorActivo)}. Espera tu turno.`);
  setControlsEnabled(false);
});

socket.on("turno-snake", ({ room, activo, jugadorActivo }) => {
  activeRoom = room;
  updatePlayerPanel(room);
  if (activo) {
    startActiveMultiplayerTurn(room);
  } else {
    startSpectator(room, `Turno de ${shortPlayerName(jugadorActivo)}. Espera tu turno.`);
  }
});

socket.on("estado-snake-espectador", ({ state }) => {
  if (!game || multiplayerActiveTurn) return;
  game.renderState(state);
});

socket.on("turno-finalizado-snake", ({ room, jugador, score }) => {
  if (room) {
    activeRoom = room;
    updatePlayerPanel(room);
  }
  showTemporaryStatus(`${shortPlayerName(jugador)} termino con ${score} puntos.`);
});

socket.on("partida-finalizada-snake", async ({ room, winner, empate }) => {
  game?.stop();
  setControlsEnabled(false);
  setPauseButton(false, false);
  activeRoom = room;
  updatePlayerPanel(room);
  const j1 = room.jugador1;
  const j2 = room.jugador2;
  const result = empate ? "Empate" : `Gano ${shortPlayerName(winner)}`;
  showTemporaryStatus(`${result}. ${shortPlayerName(j1.email)} ${j1.score} - ${j2.score} ${shortPlayerName(j2.email)}`);
  showToast("Partida finalizada. Rankings actualizados.");
  activeRoomCode = null;
  await loadRankings().catch(() => {});
});

socket.on("rival-desconectado", ({ message }) => {
  game?.stop();
  setControlsEnabled(false);
  setPauseButton(false, false);
  showTemporaryStatus(message || "El rival se desconecto.");
  showToast(message || "La partida fue cancelada.", "error");
  activeRoomCode = null;
  activeRoom = null;
  updatePlayerPanel(null);
});

socket.on("error-partida", ({ message }) => {
  showToast(message || "Error de partida.", "error");
});

socket.on("rankings-actualizados", () => {
  if (user) loadRankings().catch(() => {});
});

applyTheme(localStorage.getItem("snakeTheme") || "dark");
setMusicState(false);
setFullscreenState(false);
setGameFullscreenButton(false);
if (user?.id && user?.email) {
  showDashboard();
} else {
  showView("authView");
}
