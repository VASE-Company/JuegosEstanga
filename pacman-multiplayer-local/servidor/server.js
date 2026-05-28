require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const nodemailer = require("nodemailer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const CLIENT_DIR = path.join(__dirname, "..", "cliente");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const CODES_FILE = path.join(DATA_DIR, "verificationCodes.json");
const MATCHES_FILE = path.join(DATA_DIR, "matches.txt");
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const LEVELS = [
  {
    id: 1,
    name: "Nivel 1 - Inicio",
    speed: 1,
    ghostSpeed: 1,
    lives: 3,
    map: [
      "#####################",
      "#P........#........G#",
      "#.###.###.#.###.###.#",
      "#o#.....#...#.....#o#",
      "#.###.#.#####.#.###.#",
      "#.....#...G...#.....#",
      "#.###.###.#.###.###.#",
      "#...........#.......#",
      "#####################"
    ]
  },
  {
    id: 2,
    name: "Nivel 2 - Cruces",
    speed: 1,
    ghostSpeed: 1.1,
    lives: 3,
    map: [
      "#######################",
      "#P....#.......#......G#",
      "#.###.#.#####.#.####..#",
      "#...#...#...#...#.....#",
      "###.#####.#.#####.###.#",
      "#o..#.....#.....#...#o#",
      "#.#.#.### G ###.#.#.#.#",
      "#.#.....#...#.....#...#",
      "#.#####.#####.#####.#.#",
      "#.......G.....#.......#",
      "#######################"
    ]
  },
  {
    id: 3,
    name: "Nivel 3 - Tuneles",
    speed: 1.05,
    ghostSpeed: 1.18,
    lives: 3,
    map: [
      "#########################",
      "#P......#.........#....G#",
      "#.####..#.#######.#.###.#",
      "#o...#....#.....#...#...#",
      "####.#.####.###.#####.#.#",
      "#....#......# #.......#.#",
      "#.#########.#G#.#######.#",
      "#.....#.....# #.....#...#",
      "#.###.#.#######.###.#.###",
      "#...#...#..G..#...#....o#",
      "#.#.#####.###.#####.###.#",
      "#G#.................#...#",
      "#########################"
    ]
  },
  {
    id: 4,
    name: "Nivel 4 - Presion",
    speed: 1.08,
    ghostSpeed: 1.28,
    lives: 3,
    map: [
      "###########################",
      "#P..#.......#.......#....G#",
      "###.#.#####.#.#####.#.###.#",
      "#...#.#...#...#...#.#...#.#",
      "#.###.#.#.#####.#.#.###.#.#",
      "#.....#.#...o...#.#.....#.#",
      "#.#####.#### ####.#####.#.#",
      "#.#.....#...G...#.....#...#",
      "#.#.###.#.#####.#.###.###.#",
      "#...#...#...G...#...#.....#",
      "#.###.#####.#.#####.###.#.#",
      "#o......G...#.........#...#",
      "###########################"
    ]
  },
  {
    id: 5,
    name: "Nivel 5 - Final",
    speed: 1.12,
    ghostSpeed: 1.38,
    lives: 3,
    map: [
      "#############################",
      "#P....#.........#.........G.#",
      "#.###.#.#######.#.#######.#.#",
      "#...#.#...#.....#.....#...#.#",
      "###.#.###.#.#########.#.###.#",
      "#...#.....#.....o.....#.....#",
      "#.#######.##### # #####.###.#",
      "#.#.....#.....#G#.....#...#.#",
      "#.#.###.#####.# #.###.###.#.#",
      "#...#...#...G.# #...#.....#.#",
      "#.###.###.#.#######.#.#####.#",
      "#.....#...#....G....#.....#o#",
      "#.#####.###########.#####.#.#",
      "#G..........................#",
      "#############################"
    ]
  }
];

const rooms = new Map();

app.use(express.json());
app.use(express.static(CLIENT_DIR));

async function ensureDataFiles() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const defaults = [
    [USERS_FILE, "[]"],
    [SCORES_FILE, "[]"],
    [CODES_FILE, "[]"],
    [MATCHES_FILE, ""]
  ];
  for (const [file, value] of defaults) {
    if (!fs.existsSync(file)) await fsp.writeFile(file, value, "utf8");
  }
}

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await writeJson(filePath, []);
    return [];
  }
}

async function writeJson(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function appendTxt(filePath, text) {
  await fsp.appendFile(filePath, text, "utf8");
}

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateRoomCode() {
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isCode(code) {
  return /^\d{6}$/.test(String(code || ""));
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getUserByEmail(email) {
  const users = await readJson(USERS_FILE);
  return users.find((user) => user.email === normalizeEmail(email)) || null;
}

async function getTop3UserScores(email) {
  const scores = await readJson(SCORES_FILE);
  return scores
    .filter((score) => score.game === "pacman" && score.email === normalizeEmail(email))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

async function getTop10GeneralScores() {
  const scores = await readJson(SCORES_FILE);
  return scores
    .filter((score) => score.game === "pacman")
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
  const score = {
    id: generateId("score"),
    game: "pacman",
    mode: scoreData.mode || "singleplayer",
    role: scoreData.role || "pacman",
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

function getLevel(id) {
  return LEVELS.find((level) => level.id === Number(id)) || LEVELS[0];
}

function parseLevel(level) {
  const walls = new Set();
  const pellets = [];
  const powerPellets = [];
  const ghosts = [];
  let pacmanStart = { x: 1, y: 1 };
  level.map.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "#") walls.add(`${x},${y}`);
      if (cell === ".") pellets.push({ x, y });
      if (cell === "o") powerPellets.push({ x, y });
      if (cell === "P") pacmanStart = { x, y };
      if (cell === "G") ghosts.push({ x, y });
    });
  });
  return {
    width: Math.max(...level.map.map((row) => row.length)),
    height: level.map.length,
    walls,
    pellets,
    powerPellets,
    pacmanStart,
    ghostStarts: ghosts.length ? ghosts : [{ x: 10, y: 5 }]
  };
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
  const level = getLevel(room.nivelActual);
  const parsed = parseLevel(level);
  const pacmanPlayer = room.jugadores.pacman;
  const humanGhosts = room.jugadores.fantasmas.slice(0, room.maxFantasmasHumanos);
  const totalGhosts = room.allowBots ? Math.min(5, Math.max(parsed.ghostStarts.length, humanGhosts.length)) : humanGhosts.length;
  const ghosts = [];
  for (let i = 0; i < totalGhosts; i += 1) {
    const start = parsed.ghostStarts[i % parsed.ghostStarts.length];
    const human = humanGhosts[i] || null;
    ghosts.push({
      id: `ghost_${i + 1}`,
      x: start.x,
      y: start.y,
      startX: start.x,
      startY: start.y,
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
    if (room.sockets[socketId]) return room;
  }
  return null;
}

app.post("/api/auth/request-code", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const type = req.body.type;
  if (!isEmail(email)) return res.status(400).json({ ok: false, message: "Email invalido." });
  if (!["register", "login"].includes(type)) return res.status(400).json({ ok: false, message: "Tipo invalido." });
  const existing = await getUserByEmail(email);
  if (type === "register" && existing) return res.status(409).json({ ok: false, message: "El usuario ya existe. Inicia sesion." });
  if (type === "login" && !existing) return res.status(404).json({ ok: false, message: "El usuario no existe. Registrate primero." });
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
  if (!isEmail(email)) return res.status(400).json({ ok: false, message: "Email invalido." });
  if (!isCode(code)) return res.status(400).json({ ok: false, message: "El codigo debe tener 6 digitos." });
  const codes = await readJson(CODES_FILE);
  const found = codes.find((item) => item.email === email && item.code === code && item.type === type);
  if (!found) return res.status(400).json({ ok: false, message: "Codigo incorrecto." });
  if (new Date(found.expiresAt).getTime() < Date.now()) return res.status(400).json({ ok: false, message: "El codigo vencio." });
  let users = await readJson(USERS_FILE);
  let user = users.find((item) => item.email === email);
  if (type === "register") {
    if (user) return res.status(409).json({ ok: false, message: "El usuario ya existe. Inicia sesion." });
    user = { id: generateId("user"), email, createdAt: new Date().toISOString(), verified: true };
    users.push(user);
    await writeJson(USERS_FILE, users);
  }
  if (type === "login" && !user) return res.status(404).json({ ok: false, message: "El usuario no existe. Registrate primero." });
  await writeJson(CODES_FILE, codes.filter((item) => item !== found));
  res.json({ ok: true, user });
});

app.get("/api/rankings/pacman", async (req, res) => {
  const email = normalizeEmail(req.query.email);
  res.json({ personalTop3: await getTop3UserScores(email), generalTop10: await getTop10GeneralScores() });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Servidor funcionando" });
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
      personalTop3: await getTop3UserScores(saved.email),
      generalTop10: await getTop10GeneralScores()
    });
    res.json({ ok: true, score: saved });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

io.on("connection", (socket) => {
  socket.on("pedir-rankings", async ({ email } = {}) => {
    socket.emit("rankings-actualizados", {
      personalTop3: await getTop3UserScores(normalizeEmail(email)),
      generalTop10: await getTop10GeneralScores()
    });
  });

  socket.on("crear-partida-pacman", async (payload = {}) => {
    try {
      const user = await assertRegistered(payload.userId, payload.email);
      const role = payload.role === "ghost" ? "ghost" : "pacman";
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
      const player = { userId: user.id, email: user.email, socketId: socket.id };
      if (role === "pacman") room.jugadores.pacman = player;
      else room.jugadores.fantasmas.push(player);
      room.sockets[socket.id] = { userId: user.id, email: user.email, role };
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
      const player = { userId: user.id, email: user.email, socketId: socket.id };
      if (role === "pacman") {
        if (room.jugadores.pacman) throw new Error("Ya hay un Pac-Man humano.");
        room.jugadores.pacman = player;
      } else {
        if (room.jugadores.fantasmas.length >= room.maxFantasmasHumanos || room.jugadores.fantasmas.length >= 5) {
          throw new Error("La sala ya alcanzo el limite de fantasmas humanos.");
        }
        room.jugadores.fantasmas.push(player);
      }
      room.sockets[socket.id] = { userId: user.id, email: user.email, role };
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

  socket.on("disconnect", () => {
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
