const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const http = require("http");
const nodemailer = require("nodemailer");
const { Server } = require("socket.io");
const {
  DATA_DIR,
  USERS_FILE,
  SCORES_FILE,
  CODES_FILE,
  MATCHES_FILE,
  ensureDataFiles,
  readJson,
  writeJson,
  appendTxt
} = require("./lib/storage");
const {
  ROOM_CODE_CHARS,
  DIRECTIONS,
  LEVELS,
  parseLevel
} = require("./game/levels");
const {
  isEmail,
  normalizeEmail,
  isCode,
  createVerificationCode,
  generateId
} = require("./lib/validation");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const PACMAN_CLIENT_DIR = path.join(__dirname, "..", "..", "cliente");
const SNAKE_CLIENT_DIR = path.join(__dirname, "..", "..", "..", "snake-multiplayer-local", "cliente");
const PORTAL_DIR = path.join(__dirname, "..", "..", "..", "arcade-portal");

const rooms = new Map();
const socketUsers = new Map();
const sessions = new Map();

app.use(express.json());
app.use(express.static(PORTAL_DIR));
app.use("/pacman", express.static(PACMAN_CLIENT_DIR));
app.use("/snake", express.static(SNAKE_CLIENT_DIR));

function generateRoomCode() {
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function createSession(user) {
  const token = generateId("sess");
  sessions.set(token, {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7
  });
  return token;
}

function sessionFromRequest(req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

async function getUserByEmail(email) {
  const users = await readJson(USERS_FILE);
  return users.find((user) => user.email === normalizeEmail(email)) || null;
}

async function getTop3UserScoresByGame(email, game) {
  const scores = await readJson(SCORES_FILE);
  return scores
    .filter((score) => score.game === game && score.email === normalizeEmail(email))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

async function getTop10GeneralScoresByGame(game) {
  const scores = await readJson(SCORES_FILE);
  return scores
    .filter((score) => score.game === game)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function saveScore(scoreData) {
  const numericScore = Number(scoreData.score);
  if (!Number.isFinite(numericScore) || numericScore < 0) {
    throw new Error("Score invalido");
  }
  const user = await getUserByEmail(scoreData.email);
  if (!user) throw new Error("Usuario no registrado");
  const scores = await readJson(SCORES_FILE);
  const game = scoreData.game || "pacman";
  const score = {
    id: generateId("score"),
    game,
    mode: scoreData.mode || "singleplayer",
    role: scoreData.role || (game === "snake" ? "snake" : "pacman"),
    level: Number(scoreData.level) || 1,
    matchCode: scoreData.matchCode || null,
    userId: scoreData.userId || user.id,
    email: user.email,
    score: Math.round(numericScore),
    result: scoreData.result || "finalizado",
    createdAt: new Date().toISOString()
  };
  scores.push(score);
  await writeJson(SCORES_FILE, scores);
  return score;
}

async function saveMatchLog(matchData) {
  const ghosts = (matchData.ghosts || []).join(", ") || "sin fantasmas";
  const line = `[${new Date().toISOString()}] PACMAN MULTIPLAYER | Codigo: ${matchData.codigo} | Nivel inicial: ${matchData.nivelInicial} | PacMan: ${matchData.pacmanEmail || "sin pacman"} Score: ${matchData.scorePacman || 0} | Fantasmas: ${ghosts} | Ganador: ${matchData.winner || "Sin ganador"}\n`;
  await appendTxt(MATCHES_FILE, line);
}

async function sendCode(email, code, type) {
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtp) {
    console.log(`[DEV] Codigo ${type} para ${email}: ${code}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Codigo de acceso - Laberinto Arcade",
    text: `Tu codigo de ${type === "register" ? "registro" : "inicio de sesion"} es ${code}. Vence en 10 minutos.`
  });
}

function isWall(state, x, y) {
  return x < 0 || y < 0 || x >= state.width || y >= state.height || state.walls.includes(`${x},${y}`);
}

function legalDirections(state, actor) {
  return Object.keys(DIRECTIONS).filter((dir) => {
    const next = { x: actor.x + DIRECTIONS[dir].x, y: actor.y + DIRECTIONS[dir].y };
    return !isWall(state, next.x, next.y);
  });
}

function moveActor(state, actor, desiredDirection) {
  const direction = DIRECTIONS[desiredDirection] ? desiredDirection : actor.direction;
  const delta = DIRECTIONS[direction] || DIRECTIONS.left;
  if (!isWall(state, actor.x + delta.x, actor.y + delta.y)) {
    actor.x += delta.x;
    actor.y += delta.y;
    actor.direction = direction;
  }
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function chooseBotDirection(state, actor, target, flee = false) {
  const dirs = legalDirections(state, actor);
  if (!dirs.length) return actor.direction || "left";
  dirs.sort((a, b) => {
    const na = { x: actor.x + DIRECTIONS[a].x, y: actor.y + DIRECTIONS[a].y };
    const nb = { x: actor.x + DIRECTIONS[b].x, y: actor.y + DIRECTIONS[b].y };
    return flee ? distance(nb, target) - distance(na, target) : distance(na, target) - distance(nb, target);
  });
  if (Math.random() < 0.15 && dirs.length > 1) return dirs[1];
  return dirs[0];
}

function nearestPellet(state, from) {
  const dots = [...state.pellets, ...state.powerPellets];
  if (!dots.length) return from;
  return dots.reduce((best, dot) => (distance(from, dot) < distance(from, best) ? dot : best), dots[0]);
}

function createGameState(room) {
  const level = LEVELS.find((item) => item.id === Number(room.nivelActual)) || LEVELS[0];
  const parsed = parseLevel(level);
  const pacmanPlayer = room.jugadores.pacman;
  const humanGhosts = room.jugadores.fantasmas.slice(0, room.maxFantasmasHumanos);
  const totalGhosts = room.allowBots ? Math.min(5, Math.max(parsed.ghostStarts.length, humanGhosts.length)) : humanGhosts.length;
  
  const ghostClubs = ["boca", "independiente", "racing", "sanlorenzo"];
  const humanChosenClubs = humanGhosts.map(h => h.character).filter(Boolean);
  const availableClubsForBots = ghostClubs.filter(club => !humanChosenClubs.includes(club));

  const ghosts = [];
  for (let i = 0; i < totalGhosts; i += 1) {
    const start = parsed.ghostStarts[i % parsed.ghostStarts.length];
    const human = humanGhosts[i] || null;
    let club = "";
    if (human) {
      club = human.character || "boca";
    } else {
      club = availableClubsForBots.shift() || ghostClubs[i % ghostClubs.length];
    }
    ghosts.push({
      id: `ghost_${i + 1}`,
      x: start.x,
      y: start.y,
      startX: start.x,
      startY: start.y,
      club: club,
      direction: ["left", "right", "up", "down"][i % 4],
      vulnerable: false,
      isBot: !human,
      userId: human ? human.userId : null,
      email: human ? human.email : `Bot ${i + 1}`,
      socketId: human ? human.socketId : null,
      score: 0
    });
  }
  return {
    codigo: room.codigo,
    status: "playing",
    level: level.id,
    levelName: level.name,
    scorePacman: 0,
    livesPacman: level.lives,
    pelletsRemaining: parsed.pellets.length + parsed.powerPellets.length,
    width: parsed.width,
    height: parsed.height,
    walls: [...parsed.walls],
    pacman: {
      x: parsed.pacmanStart.x,
      y: parsed.pacmanStart.y,
      startX: parsed.pacmanStart.x,
      startY: parsed.pacmanStart.y,
      direction: "left",
      userId: pacmanPlayer ? pacmanPlayer.userId : null,
      email: pacmanPlayer ? pacmanPlayer.email : "Pac-Man Bot",
      socketId: pacmanPlayer ? pacmanPlayer.socketId : null,
      isBot: !pacmanPlayer
    },
    ghosts,
    pellets: parsed.pellets,
    powerPellets: parsed.powerPellets,
    vulnerableUntil: 0,
    winner: null,
    message: "",
    startedAt: Date.now()
  };
}

function resetPositions(state) {
  state.pacman.x = state.pacman.startX;
  state.pacman.y = state.pacman.startY;
  state.pacman.direction = "left";
  state.ghosts.forEach((ghost) => {
    ghost.x = ghost.startX;
    ghost.y = ghost.startY;
    ghost.vulnerable = false;
  });
}

async function finishRoom(room, winner, message) {
  if (!room || room.estado === "finalizada" || room.estado === "cancelada") return;
  room.estado = winner === "Cancelada" ? "cancelada" : "finalizada";
  if (room.interval) clearInterval(room.interval);
  const state = room.gameState;
  if (state) {
    state.status = room.estado;
    state.winner = winner;
    state.message = message;
  }
  const pacmanScore = state ? state.scorePacman + state.level * 100 + Math.max(0, state.livesPacman) * 150 : 0;
  const pacman = room.jugadores.pacman;
  const ghosts = room.jugadores.fantasmas;
  try {
    if (pacman) {
      await saveScore({
        mode: "multiplayer",
        role: "pacman",
        level: state ? state.level : room.nivelActual,
        matchCode: room.codigo,
        userId: pacman.userId,
        email: pacman.email,
        score: pacmanScore,
        result: winner === "Pac-Man" ? "ganó" : "perdió"
      });
    }
    for (const ghost of ghosts) {
      const ghostState = state ? state.ghosts.find((g) => g.userId === ghost.userId) : null;
      await saveScore({
        mode: "multiplayer",
        role: "ghost",
        level: state ? state.level : room.nivelActual,
        matchCode: room.codigo,
        userId: ghost.userId,
        email: ghost.email,
        score: Math.max(0, (ghostState ? ghostState.score : 0) + (winner === "Fantasmas" ? 200 : 50)),
        result: winner === "Fantasmas" ? "ganó" : "perdió"
      });
    }
    await saveMatchLog({
      codigo: room.codigo,
      nivelInicial: room.nivelInicial,
      pacmanEmail: pacman ? pacman.email : "",
      scorePacman: pacmanScore,
      ghosts: ghosts.map((g) => g.email),
      winner
    });
  } catch (error) {
    console.error("Error guardando cierre multiplayer:", error.message);
  }
  io.to(room.codigo).emit("partida-finalizada-pacman", state || { winner, message });
  io.to(room.codigo).emit("game-state-pacman", state);
  setTimeout(() => rooms.delete(room.codigo), 30000);
}

function eatAt(list, x, y) {
  const index = list.findIndex((dot) => dot.x === x && dot.y === y);
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}

async function advanceLevel(room) {
  const state = room.gameState;
  if (state.level >= 5) {
    await finishRoom(room, "Pac-Man", "Pac-Man completo los 5 niveles.");
    return;
  }
  room.nivelActual = state.level + 1;
  room.gameState = createGameState(room);
  room.gameState.scorePacman = state.scorePacman + 500;
  room.gameState.livesPacman = state.livesPacman;
  io.to(room.codigo).emit("nivel-completado-pacman", { level: state.level, nextLevel: room.nivelActual });
}

async function tickRoom(room) {
  if (!room || room.estado !== "jugando" || !room.gameState) return;
  const state = room.gameState;
  const now = Date.now();
  state.ghosts.forEach((ghost) => {
    ghost.vulnerable = now < state.vulnerableUntil;
  });

  const pacInput = state.pacman.socketId ? room.inputs[state.pacman.socketId] : null;
  if (pacInput) {
    moveActor(state, state.pacman, pacInput);
  } else if (state.pacman.isBot) {
    const danger = state.ghosts.find((ghost) => distance(ghost, state.pacman) <= 3 && !ghost.vulnerable);
    const target = danger || nearestPellet(state, state.pacman);
    moveActor(state, state.pacman, chooseBotDirection(state, state.pacman, target, Boolean(danger)));
  }

  for (const ghost of state.ghosts) {
    const input = ghost.socketId ? room.inputs[ghost.socketId] : null;
    if (input && !ghost.isBot) {
      moveActor(state, ghost, input);
    } else {
      moveActor(state, ghost, chooseBotDirection(state, ghost, state.pacman, ghost.vulnerable));
    }
  }

  if (eatAt(state.pellets, state.pacman.x, state.pacman.y)) state.scorePacman += 10;
  if (eatAt(state.powerPellets, state.pacman.x, state.pacman.y)) {
    state.scorePacman += 50;
    state.vulnerableUntil = Date.now() + 6500;
    state.ghosts.forEach((ghost) => {
      ghost.vulnerable = true;
    });
  }
  state.pelletsRemaining = state.pellets.length + state.powerPellets.length;

  for (const ghost of state.ghosts) {
    if (ghost.x === state.pacman.x && ghost.y === state.pacman.y) {
      if (ghost.vulnerable) {
        state.scorePacman += 200;
        ghost.score += 0;
        ghost.x = ghost.startX;
        ghost.y = ghost.startY;
        ghost.vulnerable = false;
      } else {
        state.livesPacman -= 1;
        ghost.score += 100;
        if (state.livesPacman <= 0) {
          await finishRoom(room, "Fantasmas", "Los fantasmas atraparon a Pac-Man.");
          return;
        }
        resetPositions(state);
        break;
      }
    }
  }

  if (state.pelletsRemaining <= 0) {
    await advanceLevel(room);
    return;
  }

  io.to(room.codigo).emit("game-state-pacman", publicState(room.gameState));
}

function publicState(state) {
  if (!state) return null;
  return {
    codigo: state.codigo,
    status: state.status,
    level: state.level,
    levelName: state.levelName,
    scorePacman: state.scorePacman,
    livesPacman: state.livesPacman,
    pelletsRemaining: state.pelletsRemaining,
    width: state.width,
    height: state.height,
    walls: state.walls,
    pacman: {
      x: state.pacman.x,
      y: state.pacman.y,
      direction: state.pacman.direction,
      userId: state.pacman.userId,
      email: state.pacman.email,
      isBot: state.pacman.isBot
    },
    ghosts: state.ghosts.map((ghost) => ({
      id: ghost.id,
      x: ghost.x,
      y: ghost.y,
      direction: ghost.direction,
      vulnerable: ghost.vulnerable,
      isBot: ghost.isBot,
      userId: ghost.userId,
      email: ghost.email,
      score: ghost.score
    })),
    pellets: state.pellets,
    powerPellets: state.powerPellets,
    winner: state.winner,
    message: state.message
  };
}

function lobbyPayload(room) {
  return {
    codigo: room.codigo,
    estado: room.estado,
    nivelInicial: room.nivelInicial,
    nivelActual: room.nivelActual,
    maxFantasmasHumanos: room.maxFantasmasHumanos,
    allowBots: room.allowBots,
    hostUserId: room.hostUserId,
    jugadores: room.jugadores,
    ready: Boolean(room.jugadores.pacman && room.jugadores.fantasmas.length >= 1),
    message: !room.jugadores.pacman
      ? "Falta un Pac-Man."
      : room.jugadores.fantasmas.length < 1
        ? "Falta al menos un fantasma."
        : "La partida ya puede iniciar."
  };
}

async function assertRegistered(userId, email) {
  const user = await getUserByEmail(email);
  if (!user || user.id !== userId) throw new Error("Debes iniciar sesion con un usuario valido.");
  return user;
}

function findPlayerRoom(socketId) {
  for (const room of rooms.values()) {
    if (room.sockets?.[socketId]) return room;
  }
  return null;
}

app.post("/api/auth/request-code", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const type = req.body.type;
  if (!isEmail(email)) return res.status(400).json({ ok: false, message: "Email invalido.", error: "Email invalido." });
  if (!["register", "login"].includes(type)) return res.status(400).json({ ok: false, message: "Tipo invalido.", error: "Tipo invalido." });
  const existing = await getUserByEmail(email);
  if (type === "register" && existing) return res.status(409).json({ ok: false, message: "El usuario ya existe. Inicia sesion.", error: "El usuario ya existe. Inicia sesion." });
  if (type === "login" && !existing) return res.status(404).json({ ok: false, message: "El usuario no existe. Registrate primero.", error: "El usuario no existe. Registrate primero." });
  const codes = await readJson(CODES_FILE);
  const clean = codes.filter((item) => !(item.email === email && item.type === type));
  const code = createVerificationCode();
  clean.push({ email, code, type, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
  await writeJson(CODES_FILE, clean);
  await sendCode(email, code, type);
  res.json({ ok: true, message: "Codigo enviado. Si no hay SMTP, revisa la consola del servidor." });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "");
  const type = req.body.type;
  if (!isEmail(email)) return res.status(400).json({ ok: false, message: "Email invalido.", error: "Email invalido." });
  if (!isCode(code)) return res.status(400).json({ ok: false, message: "El codigo debe tener 6 digitos.", error: "El codigo debe tener 6 digitos." });
  const codes = await readJson(CODES_FILE);
  const found = codes.find((item) => item.email === email && item.code === code && item.type === type);
  if (!found) return res.status(400).json({ ok: false, message: "Codigo incorrecto.", error: "Codigo incorrecto." });
  if (new Date(found.expiresAt).getTime() < Date.now()) return res.status(400).json({ ok: false, message: "El codigo vencio.", error: "El codigo vencio." });
  let users = await readJson(USERS_FILE);
  let user = users.find((item) => item.email === email);
  if (type === "register") {
    if (user) return res.status(409).json({ ok: false, message: "El usuario ya existe. Inicia sesion.", error: "El usuario ya existe. Inicia sesion." });
    user = { id: generateId("user"), email, createdAt: new Date().toISOString(), verified: true };
    users.push(user);
    await writeJson(USERS_FILE, users);
  }
  if (type === "login" && !user) return res.status(404).json({ ok: false, message: "El usuario no existe. Registrate primero.", error: "El usuario no existe. Registrate primero." });
  await writeJson(CODES_FILE, codes.filter((item) => item !== found));
  const token = createSession(user);
  res.json({ ok: true, message: "Sesion iniciada.", user, token });
});

app.get("/api/auth/me", async (req, res) => {
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ ok: false, message: "No autenticado.", error: "No autenticado." });
  const users = await readJson(USERS_FILE);
  const user = users.find((item) => item.id === session.userId && item.email === session.email);
  if (!user) return res.status(401).json({ ok: false, message: "Sesion invalida.", error: "Sesion invalida." });
  res.json({ ok: true, user });
});

app.post("/api/auth/logout", (req, res) => {
  const session = sessionFromRequest(req);
  if (session) sessions.delete(session.token);
  res.json({ ok: true, message: "Sesion cerrada." });
});

app.get("/api/rankings/pacman", async (req, res) => {
  const email = normalizeEmail(req.query.email);
  res.json({
    personalTop3: await getTop3UserScoresByGame(email, "pacman"),
    generalTop10: await getTop10GeneralScoresByGame("pacman")
  });
});

app.get("/api/rooms/check", (req, res) => {
  const codigo = String(req.query.codigo || "").trim().toUpperCase();
  const room = rooms.get(codigo);
  if (!room) {
    return res.status(404).json({ error: "La sala no existe." });
  }
  if (room.estado !== "lobby") {
    return res.status(400).json({ error: "La partida ya inicio." });
  }
  const takenCharacters = [];
  if (room.jugadores.pacman) {
    takenCharacters.push(room.jugadores.pacman.character || "pacman");
  }
  (room.jugadores.fantasmas || []).forEach((ghost) => {
    if (ghost.character) {
      takenCharacters.push(ghost.character);
    }
  });
  res.json({
    codigo: room.codigo,
    takenCharacters,
    maxGhosts: room.maxFantasmasHumanos,
    currentGhosts: room.jugadores.fantasmas.length
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Servidor funcionando" });
});

app.get("/api/rankings/snake", async (req, res) => {
  const email = normalizeEmail(req.query.email);
  res.json({
    personalTop3: email ? await getTop3UserScoresByGame(email, "snake") : [],
    generalTop10: await getTop10GeneralScoresByGame("snake")
  });
});

app.post("/api/scores/snake", async (req, res) => {
  try {
    const saved = await saveScore({
      game: "snake",
      email: req.body.email,
      score: req.body.score,
      mode: req.body.mode || "singleplayer",
      matchCode: req.body.matchCode || null,
      result: req.body.result || "finalizado",
      role: "snake",
      level: 1
    });
    io.emit("rankings-actualizados", {
      personalTop3: await getTop3UserScoresByGame(saved.email, "snake"),
      generalTop10: await getTop10GeneralScoresByGame("snake")
    });
    res.json({ ok: true, score: saved });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message, error: error.message });
  }
});

app.post("/api/scores/pacman", async (req, res) => {
  try {
    const saved = await saveScore({
      email: req.body.email,
      score: req.body.score,
      mode: "singleplayer",
      role: req.body.role,
      level: req.body.level,
      result: req.body.result
    });
    io.emit("rankings-actualizados", {
      personalTop3: await getTop3UserScoresByGame(saved.email, "pacman"),
      generalTop10: await getTop10GeneralScoresByGame("pacman")
    });
    res.json({ ok: true, score: saved });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(PORTAL_DIR, "index.html"));
});

app.get("/pacman", (req, res) => {
  res.sendFile(path.join(PACMAN_CLIENT_DIR, "index.html"));
});

app.get("/snake", (req, res) => {
  res.sendFile(path.join(SNAKE_CLIENT_DIR, "index.html"));
});

function getSnakeRoomPlayer(room, socketId) {
  if (room.jugador1?.socketId === socketId) return "jugador1";
  if (room.jugador2?.socketId === socketId) return "jugador2";
  return null;
}

function publicSnakeRoom(room) {
  return {
    codigo: room.codigo,
    estado: room.estado,
    jugador1: room.jugador1,
    jugador2: room.jugador2,
    turnoActual: room.turnoActual,
    currentSnakeState: room.currentSnakeState
  };
}

function emitSnakeTurn(room) {
  const active = room[room.turnoActual];
  const spectatorKey = room.turnoActual === "jugador1" ? "jugador2" : "jugador1";
  const spectator = room[spectatorKey];
  io.to(active.socketId).emit("turno-snake", { room: publicSnakeRoom(room), activo: true, jugadorActivo: active.email });
  io.to(spectator.socketId).emit("turno-snake", { room: publicSnakeRoom(room), activo: false, jugadorActivo: active.email });
  io.to(spectator.socketId).emit("esperar-rival-snake", { message: "Esperando tu turno...", jugadorActivo: active.email });
}

function cancelSnakeRoom(room, reason) {
  room.estado = "cancelada";
  rooms.delete(room.codigo);
  const rivalSockets = [room.jugador1?.socketId, room.jugador2?.socketId].filter(Boolean);
  rivalSockets.forEach((socketId) => io.to(socketId).emit("rival-desconectado", { message: reason }));
}

io.on("connection", (socket) => {
  socket.on("pedir-rankings", async ({ email } = {}) => {
    socket.emit("rankings-actualizados", {
      personalTop3: await getTop3UserScoresByGame(normalizeEmail(email), "pacman"),
      generalTop10: await getTop10GeneralScoresByGame("pacman")
    });
  });

  socket.on("pedir-rankings-snake", async ({ email } = {}) => {
    socket.emit("rankings-actualizados", {
      personalTop3: await getTop3UserScoresByGame(normalizeEmail(email), "snake"),
      generalTop10: await getTop10GeneralScoresByGame("snake")
    });
  });

  socket.on("crear-partida-pacman", async (payload = {}) => {
    try {
      const user = await assertRegistered(payload.userId, payload.email);
      const role = payload.role === "ghost" ? "ghost" : "pacman";
      const character = payload.character || (role === "pacman" ? "pacman" : "boca");
      const codigo = generateRoomCode();
      const room = {
        codigo,
        game: "pacman",
        mode: "multiplayer",
        estado: "lobby",
        nivelInicial: Math.min(5, Math.max(1, Number(payload.nivelInicial) || 1)),
        nivelActual: Math.min(5, Math.max(1, Number(payload.nivelInicial) || 1)),
        maxFantasmasHumanos: Math.min(5, Math.max(1, Number(payload.maxFantasmasHumanos) || 5)),
        allowBots: Boolean(payload.allowBots),
        hostUserId: user.id,
        jugadores: { pacman: null, fantasmas: [] },
        sockets: {},
        inputs: {},
        gameState: null,
        interval: null,
        createdAt: new Date().toISOString()
      };
      const player = { userId: user.id, email: user.email, socketId: socket.id, character };
      if (role === "pacman") room.jugadores.pacman = player;
      else room.jugadores.fantasmas.push(player);
      room.sockets[socket.id] = { userId: user.id, email: user.email, role, character };
      rooms.set(codigo, room);
      socket.join(codigo);
      socket.emit("partida-creada-pacman", lobbyPayload(room));
      io.to(codigo).emit("lobby-actualizado-pacman", lobbyPayload(room));
    } catch (error) {
      socket.emit("error-partida", { message: error.message });
    }
  });

  socket.on("unirse-partida-pacman", async (payload = {}) => {
    try {
      const user = await assertRegistered(payload.userId, payload.email);
      const codigo = String(payload.codigo || "").trim().toUpperCase();
      const room = rooms.get(codigo);
      if (!room) throw new Error("La sala no existe.");
      if (room.estado !== "lobby") throw new Error("La partida ya inicio.");
      if (Object.values(room.sockets).some((player) => player.userId === user.id)) throw new Error("Ya estas en esta sala.");
      
      const role = payload.role === "ghost" ? "ghost" : "pacman";
      const character = payload.character || (role === "pacman" ? "pacman" : "boca");
      
      const isTaken = (room.jugadores.pacman && room.jugadores.pacman.character === character) ||
        (room.jugadores.fantasmas || []).some(ghost => ghost.character === character);
      if (isTaken) throw new Error(`El personaje ${character} ya esta siendo usado por otro jugador.`);

      const player = { userId: user.id, email: user.email, socketId: socket.id, character };
      if (role === "pacman") {
        if (room.jugadores.pacman) throw new Error("Ya hay un Pac-Man humano.");
        room.jugadores.pacman = player;
      } else {
        if (room.jugadores.fantasmas.length >= room.maxFantasmasHumanos || room.jugadores.fantasmas.length >= 5) {
          throw new Error("La sala ya alcanzo el limite de fantasmas humanos.");
        }
        room.jugadores.fantasmas.push(player);
      }
      room.sockets[socket.id] = { userId: user.id, email: user.email, role, character };
      socket.join(codigo);
      socket.emit("jugador-unido-pacman", lobbyPayload(room));
      io.to(codigo).emit("lobby-actualizado-pacman", lobbyPayload(room));
    } catch (error) {
      socket.emit("error-partida", { message: error.message });
    }
  });

  socket.on("iniciar-partida-pacman", async ({ codigo, userId } = {}) => {
    try {
      const room = rooms.get(String(codigo || "").trim().toUpperCase());
      if (!room) throw new Error("La sala no existe.");
      if (room.estado !== "lobby") throw new Error("La sala no esta en lobby.");
      if (!room.sockets[socket.id] || room.sockets[socket.id].userId !== userId) throw new Error("No perteneces a la sala.");
      if (room.hostUserId !== userId) throw new Error("Solo el creador puede iniciar.");
      if (!room.jugadores.pacman) throw new Error("Falta un Pac-Man.");
      if (room.jugadores.fantasmas.length < 1) throw new Error("Falta al menos un fantasma.");
      room.estado = "jugando";
      room.gameState = createGameState(room);
      room.interval = setInterval(() => tickRoom(room), 1000 / 12);
      io.to(room.codigo).emit("partida-iniciada-pacman", publicState(room.gameState));
      io.to(room.codigo).emit("game-state-pacman", publicState(room.gameState));
    } catch (error) {
      socket.emit("error-partida", { message: error.message });
    }
  });

  socket.on("input-pacman", ({ codigo, direction } = {}) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (!room || room.estado !== "jugando") return;
    if (!room.sockets[socket.id]) return;
    if (!DIRECTIONS[direction]) return;
    room.inputs[socket.id] = direction;
  });

  socket.on("salir-lobby-pacman", ({ codigo } = {}) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (!room || room.estado !== "lobby") return;
    removeSocketFromRoom(socket, room, "El jugador salio del lobby.");
  });

  socket.on("abandonar-partida-pacman", ({ codigo } = {}) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (!room) return;
    removeSocketFromRoom(socket, room, "Un jugador abandono la partida.");
  });

  socket.on("crear-partida-snake", async (user, ack) => {
    try {
      const email = normalizeEmail(user?.email);
      const dbUser = await getUserByEmail(email);
      if (!dbUser || dbUser.id !== user?.id) throw new Error("Debes iniciar sesion para crear una partida.");
      for (const room of rooms.values()) {
        if (room.game !== "snake") continue;
        if (room.estado !== "finalizada" && room.estado !== "cancelada" && (room.jugador1.email === email || room.jugador2?.email === email)) {
          throw new Error("Ya tienes una sala activa de Snake.");
        }
      }
      const codigo = generateRoomCode();
      const room = {
        codigo,
        game: "snake",
        mode: "multiplayer",
        estado: "esperando_jugador",
        jugador1: { userId: dbUser.id, email, socketId: socket.id, score: null },
        jugador2: null,
        turnoActual: null,
        currentSnakeState: null,
        createdAt: new Date().toISOString()
      };
      rooms.set(codigo, room);
      socket.join(codigo);
      socketUsers.set(socket.id, { email, userId: dbUser.id, roomCode: codigo, game: "snake" });
      socket.emit("partida-creada-snake", publicSnakeRoom(room));
      ack?.({ ok: true, room: publicSnakeRoom(room) });
    } catch (error) {
      socket.emit("error-partida", { message: error.message });
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("unirse-partida-snake", async ({ user, codigo }, ack) => {
    try {
      const email = normalizeEmail(user?.email);
      const code = String(codigo || "").trim().toUpperCase();
      const dbUser = await getUserByEmail(email);
      const room = rooms.get(code);
      if (!dbUser || dbUser.id !== user?.id) throw new Error("Debes iniciar sesion para unirte.");
      if (!room || room.game !== "snake") throw new Error("No existe una sala de Snake con ese codigo.");
      if (room.estado !== "esperando_jugador") throw new Error("La sala no esta disponible.");
      if (room.jugador2) throw new Error("La sala ya esta llena.");
      if (room.jugador1.email === email) throw new Error("No puedes unirte a tu propia sala.");
      room.jugador2 = { userId: dbUser.id, email, socketId: socket.id, score: null };
      room.estado = "jugando_jugador1";
      room.turnoActual = "jugador1";
      socket.join(code);
      socketUsers.set(socket.id, { email, userId: dbUser.id, roomCode: code, game: "snake" });
      io.to(code).emit("jugador-unido-snake", publicSnakeRoom(room));
      io.to(code).emit("partida-iniciada-snake", publicSnakeRoom(room));
      emitSnakeTurn(room);
      ack?.({ ok: true, room: publicSnakeRoom(room) });
    } catch (error) {
      socket.emit("error-partida", { message: error.message });
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("estado-snake", ({ codigo, state }) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (!room || room.game !== "snake") return socket.emit("error-partida", { message: "La sala no existe." });
    const playerKey = getSnakeRoomPlayer(room, socket.id);
    if (!playerKey || playerKey !== room.turnoActual) return socket.emit("error-partida", { message: "No es tu turno." });
    room.currentSnakeState = state;
    const spectatorKey = playerKey === "jugador1" ? "jugador2" : "jugador1";
    if (room[spectatorKey]) {
      io.to(room[spectatorKey].socketId).emit("estado-snake-espectador", { state, jugadorActivo: room[playerKey].email });
    }
  });

  socket.on("finalizar-turno-snake", async ({ codigo, score }, ack) => {
    try {
      const room = rooms.get(String(codigo || "").trim().toUpperCase());
      const finalScore = Number(score);
      if (!room || room.game !== "snake") throw new Error("La sala no existe.");
      const playerKey = getSnakeRoomPlayer(room, socket.id);
      if (!playerKey || playerKey !== room.turnoActual) throw new Error("No puedes finalizar el turno de otro jugador.");
      if (!Number.isFinite(finalScore) || finalScore < 0) throw new Error("Score invalido.");
      room[playerKey].score = Math.floor(finalScore);
      io.to(room.codigo).emit("turno-finalizado-snake", { room: publicSnakeRoom(room), jugador: room[playerKey].email, score: room[playerKey].score });
      if (playerKey === "jugador1") {
        room.estado = "jugando_jugador2";
        room.turnoActual = "jugador2";
        room.currentSnakeState = null;
        emitSnakeTurn(room);
      } else {
        room.estado = "finalizada";
        room.turnoActual = null;
        let winner = null;
        let result1 = "empate";
        let result2 = "empate";
        if (room.jugador1.score > room.jugador2.score) {
          winner = room.jugador1.email;
          result1 = "gano";
          result2 = "perdio";
        } else if (room.jugador2.score > room.jugador1.score) {
          winner = room.jugador2.email;
          result1 = "perdio";
          result2 = "gano";
        }
        await saveScore({ game: "snake", email: room.jugador1.email, score: room.jugador1.score, mode: "multiplayer", matchCode: room.codigo, result: result1, role: "snake", level: 1 });
        await saveScore({ game: "snake", email: room.jugador2.email, score: room.jugador2.score, mode: "multiplayer", matchCode: room.codigo, result: result2, role: "snake", level: 1 });
        io.to(room.codigo).emit("partida-finalizada-snake", { room: publicSnakeRoom(room), winner, empate: !winner });
        rooms.delete(room.codigo);
      }
      ack?.({ ok: true });
    } catch (error) {
      socket.emit("error-partida", { message: error.message });
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("abandonar-partida", ({ codigo }) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (room && room.game === "snake") cancelSnakeRoom(room, "un jugador abandono la partida");
  });

  socket.on("disconnect", () => {
    const meta = socketUsers.get(socket.id);
    socketUsers.delete(socket.id);
    if (meta?.game === "snake") {
      const snakeRoom = rooms.get(meta.roomCode);
      if (snakeRoom && snakeRoom.game === "snake" && snakeRoom.estado !== "finalizada" && snakeRoom.estado !== "cancelada") {
        cancelSnakeRoom(snakeRoom, "rival desconectado");
      }
    }
    const room = findPlayerRoom(socket.id);
    if (room) removeSocketFromRoom(socket, room, "Un rival se desconecto.");
  });
});

function removeSocketFromRoom(socket, room, message) {
  const player = room.sockets[socket.id];
  if (!player) return;
  delete room.sockets[socket.id];
  delete room.inputs[socket.id];
  socket.leave(room.codigo);

  if (room.jugadores.pacman && room.jugadores.pacman.socketId === socket.id) {
    room.jugadores.pacman = null;
    if (room.estado === "jugando") finishRoom(room, "Fantasmas", "Pac-Man se desconecto. Ganan los fantasmas.");
  }
  room.jugadores.fantasmas = room.jugadores.fantasmas.filter((ghost) => ghost.socketId !== socket.id);
  if (room.estado === "jugando" && room.jugadores.fantasmas.length === 0 && !room.allowBots) {
    finishRoom(room, "Pac-Man", "No quedan fantasmas humanos.");
  }
  if (room.estado === "lobby") {
    if (!room.jugadores.pacman && room.jugadores.fantasmas.length === 0) {
      rooms.delete(room.codigo);
    } else {
      io.to(room.codigo).emit("rival-desconectado-pacman", { message });
      io.to(room.codigo).emit("lobby-actualizado-pacman", lobbyPayload(room));
    }
  } else {
    io.to(room.codigo).emit("rival-desconectado-pacman", { message });
  }
}

ensureDataFiles().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
    console.log(`Red local: usa http://IP-DE-LA-PC:${PORT}`);
  });
});
