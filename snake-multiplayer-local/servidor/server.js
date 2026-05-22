require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const CODES_FILE = path.join(DATA_DIR, "verificationCodes.json");
const MATCHES_FILE = path.join(DATA_DIR, "matches.txt");
const CLIENT_DIR = path.join(__dirname, "..", "cliente");
const CODE_TTL_MS = 10 * 60 * 1000;
const rooms = new Map();
const socketUsers = new Map();

app.use(express.json({ limit: "64kb" }));
app.use(express.static(CLIENT_DIR));

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = [
    [USERS_FILE, "[]"],
    [SCORES_FILE, "[]"],
    [CODES_FILE, "[]"],
    [MATCHES_FILE, ""]
  ];
  for (const [filePath, initial] of files) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, initial, "utf8");
    }
  }
}

async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    if (!content.trim()) return [];
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`JSON inválido o inaccesible en ${path.basename(filePath)}. Se reinicia con [].`);
    await writeJson(filePath, []);
    return [];
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function appendTxt(filePath, text) {
  await fs.appendFile(filePath, `${text}\n`, "utf8");
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCode(code) {
  return /^\d{6}$/.test(String(code || ""));
}

function safeScore(score) {
  const value = Number(score);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

async function findUserByEmail(email) {
  const users = await readJson(USERS_FILE);
  return users.find((user) => user.email === email) || null;
}

async function getTop3UserScores(email) {
  const scores = await readJson(SCORES_FILE);
  return scores
    .filter((score) => score.game === "snake" && score.email === email)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

async function getTop10GeneralScores() {
  const scores = await readJson(SCORES_FILE);
  return scores
    .filter((score) => score.game === "snake")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function saveScore(scoreData) {
  const email = normalizeEmail(scoreData.email);
  const user = await findUserByEmail(email);
  const score = safeScore(scoreData.score);
  if (!user) throw new Error("El usuario no existe.");
  if (score === null) throw new Error("El score debe ser un número mayor o igual a 0.");
  const scores = await readJson(SCORES_FILE);
  const record = {
    id: generateId("score"),
    game: "snake",
    mode: scoreData.mode === "multiplayer" ? "multiplayer" : "singleplayer",
    matchCode: scoreData.matchCode || null,
    userId: user.id,
    email,
    score,
    result: scoreData.result || "finalizado",
    createdAt: new Date().toISOString()
  };
  scores.push(record);
  await writeJson(SCORES_FILE, scores);
  return record;
}

async function saveMatchLog(matchData) {
  const line = `[${new Date().toISOString()}] SNAKE MULTIPLAYER | Código: ${matchData.codigo} | J1: ${matchData.jugador1.email} Score: ${matchData.jugador1.score ?? "-"} | J2: ${matchData.jugador2?.email || "-"} Score: ${matchData.jugador2?.score ?? "-"} | ${matchData.resultado}`;
  await appendTxt(MATCHES_FILE, line);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendVerificationCode(email, code, type) {
  if (!smtpConfigured()) {
    console.log(`[DESARROLLO SIN SMTP] Código ${type} para ${email}: ${code}`);
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
    subject: "Tu código para Snake",
    text: `Tu código de ${type === "register" ? "registro" : "acceso"} es ${code}. Vence en 10 minutos.`
  });
}

async function emitRankings(email) {
  const payload = {
    personalTop3: email ? await getTop3UserScores(email) : [],
    generalTop10: await getTop10GeneralScores()
  };
  io.emit("rankings-actualizados", payload);
  return payload;
}

app.post("/api/auth/request-code", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const type = req.body.type;
  if (!isValidEmail(email)) return res.status(400).json({ error: "Ingresá un email válido." });
  if (!["register", "login"].includes(type)) return res.status(400).json({ error: "Tipo de código inválido." });

  const user = await findUserByEmail(email);
  if (type === "register" && user) return res.status(409).json({ error: "Ese email ya está registrado. Podés iniciar sesión." });
  if (type === "login" && !user) return res.status(404).json({ error: "Ese email no existe. Registrate primero." });

  const codes = (await readJson(CODES_FILE)).filter((item) => item.email !== email || item.type !== type);
  const code = String(crypto.randomInt(100000, 1000000));
  codes.push({ email, code, type, expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString() });
  await writeJson(CODES_FILE, codes);
  await sendVerificationCode(email, code, type);
  res.json({ ok: true, message: "Código enviado. Si no configuraste SMTP, mirá la consola del servidor." });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  const type = req.body.type;
  if (!isValidEmail(email)) return res.status(400).json({ error: "Ingresá un email válido." });
  if (!isValidCode(code)) return res.status(400).json({ error: "El código debe tener 6 dígitos." });
  if (!["register", "login"].includes(type)) return res.status(400).json({ error: "Tipo de código inválido." });

  const codes = await readJson(CODES_FILE);
  const entry = codes.find((item) => item.email === email && item.code === code && item.type === type);
  if (!entry) return res.status(400).json({ error: "Código incorrecto." });
  if (new Date(entry.expiresAt).getTime() < Date.now()) return res.status(400).json({ error: "El código venció. Pedí uno nuevo." });

  let users = await readJson(USERS_FILE);
  let user = users.find((item) => item.email === email);
  if (type === "login" && !user) return res.status(404).json({ error: "Ese email no existe. Registrate primero." });
  if (type === "register" && !user) {
    user = { id: generateId("user"), email, createdAt: new Date().toISOString(), verified: true };
    users.push(user);
    await writeJson(USERS_FILE, users);
  }
  await writeJson(CODES_FILE, codes.filter((item) => item !== entry));
  res.json({ ok: true, user });
});

app.get("/api/rankings/snake", async (req, res) => {
  const email = normalizeEmail(req.query.email);
  res.json({
    personalTop3: email ? await getTop3UserScores(email) : [],
    generalTop10: await getTop10GeneralScores()
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Servidor funcionando" });
});

app.post("/api/scores/snake", async (req, res) => {
  try {
    const record = await saveScore({ email: req.body.email, score: req.body.score, mode: "singleplayer", result: "finalizado" });
    await emitRankings(record.email);
    res.json({ ok: true, score: record });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function getRoomPlayer(room, socketId) {
  if (room.jugador1?.socketId === socketId) return "jugador1";
  if (room.jugador2?.socketId === socketId) return "jugador2";
  return null;
}

function publicRoom(room) {
  return {
    codigo: room.codigo,
    estado: room.estado,
    jugador1: room.jugador1,
    jugador2: room.jugador2,
    turnoActual: room.turnoActual,
    currentSnakeState: room.currentSnakeState
  };
}

function emitTurn(room) {
  const active = room[room.turnoActual];
  const spectatorKey = room.turnoActual === "jugador1" ? "jugador2" : "jugador1";
  const spectator = room[spectatorKey];
  io.to(active.socketId).emit("turno-snake", { room: publicRoom(room), activo: true, jugadorActivo: active.email });
  io.to(spectator.socketId).emit("turno-snake", { room: publicRoom(room), activo: false, jugadorActivo: active.email });
  io.to(spectator.socketId).emit("esperar-rival-snake", { message: "Esperando tu turno...", jugadorActivo: active.email });
}

function cancelRoom(room, reason) {
  room.estado = "cancelada";
  rooms.delete(room.codigo);
  const rivalSockets = [room.jugador1?.socketId, room.jugador2?.socketId].filter(Boolean);
  rivalSockets.forEach((socketId) => io.to(socketId).emit("rival-desconectado", { message: reason }));
  saveMatchLog({ codigo: room.codigo, jugador1: room.jugador1, jugador2: room.jugador2, resultado: `Cancelada: ${reason}` }).catch(console.error);
}

io.on("connection", (socket) => {
  console.log(`Jugador conectado: ${socket.id}`);

  socket.on("crear-partida-snake", async (user, ack) => {
    try {
      const email = normalizeEmail(user?.email);
      const dbUser = await findUserByEmail(email);
      if (!dbUser || dbUser.id !== user?.id) throw new Error("Debés iniciar sesión para crear una partida.");
      for (const room of rooms.values()) {
        if (room.estado !== "finalizada" && room.estado !== "cancelada" && (room.jugador1.email === email || room.jugador2?.email === email)) {
          throw new Error("Ya tenés una sala activa. Cerrala o esperá a que termine.");
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
      socketUsers.set(socket.id, { email, userId: dbUser.id, roomCode: codigo });
      console.log(`Sala creada: ${codigo} por ${email}`);
      socket.emit("partida-creada-snake", publicRoom(room));
      ack?.({ ok: true, room: publicRoom(room) });
    } catch (error) {
      console.log(`Error de sala: ${error.message}`);
      socket.emit("error-partida", { message: error.message });
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("unirse-partida-snake", async ({ user, codigo }, ack) => {
    try {
      const email = normalizeEmail(user?.email);
      const code = String(codigo || "").trim().toUpperCase();
      const dbUser = await findUserByEmail(email);
      const room = rooms.get(code);
      if (!dbUser || dbUser.id !== user?.id) throw new Error("Debés iniciar sesión para unirte.");
      if (!room) throw new Error("No existe una sala con ese código.");
      if (room.estado !== "esperando_jugador") throw new Error("La sala no está disponible.");
      if (room.jugador2) throw new Error("La sala ya está llena.");
      if (room.jugador1.email === email) throw new Error("No podés unirte a tu propia sala.");
      room.jugador2 = { userId: dbUser.id, email, socketId: socket.id, score: null };
      room.estado = "jugando_jugador1";
      room.turnoActual = "jugador1";
      socket.join(code);
      socketUsers.set(socket.id, { email, userId: dbUser.id, roomCode: code });
      console.log(`Jugador unido: ${email} a sala ${code}`);
      io.to(code).emit("jugador-unido-snake", publicRoom(room));
      io.to(code).emit("partida-iniciada-snake", publicRoom(room));
      console.log(`Partida iniciada: ${code}`);
      emitTurn(room);
      ack?.({ ok: true, room: publicRoom(room) });
    } catch (error) {
      console.log(`Error de sala: ${error.message}`);
      socket.emit("error-partida", { message: error.message });
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("estado-snake", ({ codigo, state }) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (!room) return socket.emit("error-partida", { message: "La sala no existe." });
    const playerKey = getRoomPlayer(room, socket.id);
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
      const finalScore = safeScore(score);
      if (!room) throw new Error("La sala no existe.");
      const playerKey = getRoomPlayer(room, socket.id);
      if (!playerKey || playerKey !== room.turnoActual) throw new Error("No podés finalizar el turno de otro jugador.");
      if (finalScore === null) throw new Error("Score inválido.");
      room[playerKey].score = finalScore;
      console.log(`Turno finalizado: ${room.codigo} ${playerKey} score ${finalScore}`);
      io.to(room.codigo).emit("turno-finalizado-snake", { room: publicRoom(room), jugador: room[playerKey].email, score: finalScore });
      if (playerKey === "jugador1") {
        room.estado = "jugando_jugador2";
        room.turnoActual = "jugador2";
        room.currentSnakeState = null;
        emitTurn(room);
      } else {
        if (room.jugador1.score === null || room.jugador2.score === null) throw new Error("Ambos jugadores deben jugar antes de finalizar.");
        room.estado = "finalizada";
        room.turnoActual = null;
        let winner = null;
        let result1 = "empate";
        let result2 = "empate";
        if (room.jugador1.score > room.jugador2.score) {
          winner = room.jugador1.email;
          result1 = "ganó";
          result2 = "perdió";
        } else if (room.jugador2.score > room.jugador1.score) {
          winner = room.jugador2.email;
          result1 = "perdió";
          result2 = "ganó";
        }
        await saveScore({ email: room.jugador1.email, score: room.jugador1.score, mode: "multiplayer", matchCode: room.codigo, result: result1 });
        await saveScore({ email: room.jugador2.email, score: room.jugador2.score, mode: "multiplayer", matchCode: room.codigo, result: result2 });
        await saveMatchLog({ codigo: room.codigo, jugador1: room.jugador1, jugador2: room.jugador2, resultado: winner ? `Ganador: ${winner}` : "Empate" });
        io.to(room.codigo).emit("partida-finalizada-snake", { room: publicRoom(room), winner, empate: !winner });
        await emitRankings();
        rooms.delete(room.codigo);
        console.log(`Partida finalizada: ${room.codigo}`);
      }
      ack?.({ ok: true });
    } catch (error) {
      console.log(`Error de sala: ${error.message}`);
      socket.emit("error-partida", { message: error.message });
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("abandonar-partida", ({ codigo }) => {
    const room = rooms.get(String(codigo || "").trim().toUpperCase());
    if (room) cancelRoom(room, "un jugador abandonó la partida");
  });

  socket.on("pedir-rankings", async ({ email } = {}) => {
    socket.emit("rankings-actualizados", await emitRankings(normalizeEmail(email)));
  });

  socket.on("disconnect", () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    const meta = socketUsers.get(socket.id);
    socketUsers.delete(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (room && room.estado !== "finalizada" && room.estado !== "cancelada") {
      cancelRoom(room, "rival desconectado");
    }
  });
});

ensureDataFiles().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log("Para otros dispositivos, usá la IP local de esta PC.");
  });
});
