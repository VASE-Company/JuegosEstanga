const PacmanGame = {
  canvas: null,
  ctx: null,
  mode: "singleplayer",
  role: "pacman",
  state: null,
  input: "left",
  timer: null,
  multiplayerCode: null,
  lastSingleTick: 0,

  init() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    window.addEventListener("resize", () => this.render());
    document.addEventListener("keydown", (event) => {
      const map = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
        W: "up",
        S: "down",
        A: "left",
        D: "right"
      };
      if (map[event.key]) {
        event.preventDefault();
        this.setInput(map[event.key]);
      }
    });
    document.querySelectorAll(".touch-controls button").forEach((button) => {
      button.addEventListener("click", () => this.setInput(button.dataset.dir));
    });
  },

  setInput(direction) {
    this.input = direction;
    if (this.mode === "multiplayer" && this.multiplayerCode) {
      Multiplayer.sendInput(this.multiplayerCode, direction);
    }
  },

  startSingle(role) {
    this.stop();
    this.mode = "singleplayer";
    this.role = role;
    this.multiplayerCode = null;
    this.loadSingleLevel(1, 0, null);
    UI.show("game");
    UI.updateHud(this.state, `1 jugador como ${role === "pacman" ? "Pac-Man" : "Fantasma"}`);
    this.timer = setInterval(() => this.tickSingle(), 1000 / 9);
    this.render();
  },

  loadSingleLevel(levelId, scoreCarry, livesCarry) {
    const level = LEVELS[levelId - 1] || LEVELS[0];
    const parsed = parseLevel(level);
    const ghostStarts = parsed.ghostStarts.length ? parsed.ghostStarts : [{ x: 8, y: 4 }];
    this.state = {
      status: "playing",
      level: level.id,
      levelName: level.name,
      width: parsed.width,
      height: parsed.height,
      walls: parsed.walls,
      scorePacman: scoreCarry || 0,
      livesPacman: livesCarry ?? level.lives,
      pellets: parsed.pellets,
      powerPellets: parsed.powerPellets,
      pelletsRemaining: parsed.pellets.length + parsed.powerPellets.length,
      vulnerableUntil: 0,
      pacman: {
        x: parsed.pacmanStart.x,
        y: parsed.pacmanStart.y,
        startX: parsed.pacmanStart.x,
        startY: parsed.pacmanStart.y,
        direction: "left",
        email: this.role === "pacman" ? Auth.user.email : "Pac-Man Bot",
        isBot: this.role !== "pacman"
      },
      ghosts: ghostStarts.slice(0, Math.min(5, ghostStarts.length)).map((start, index) => ({
        id: `ghost_${index + 1}`,
        x: start.x,
        y: start.y,
        startX: start.x,
        startY: start.y,
        direction: index % 2 ? "left" : "right",
        vulnerable: false,
        isBot: !(this.role === "ghost" && index === 0),
        email: this.role === "ghost" && index === 0 ? Auth.user.email : `Bot ${index + 1}`,
        score: 0
      })),
      winner: null,
      message: ""
    };
  },

  tickSingle() {
    const state = this.state;
    if (!state || state.status !== "playing") return;
    state.ghosts.forEach((ghost) => {
      ghost.vulnerable = Date.now() < state.vulnerableUntil;
    });

    if (this.role === "pacman") {
      this.move(state.pacman, this.input);
    } else {
      const danger = state.ghosts.find((ghost) => !ghost.vulnerable && BotAI.distance(ghost, state.pacman) <= 3);
      const target = danger || BotAI.nearestPellet(state, state.pacman);
      this.move(state.pacman, BotAI.choose(state, state.pacman, target, Boolean(danger)));
    }

    state.ghosts.forEach((ghost, index) => {
      if (this.role === "ghost" && index === 0) this.move(ghost, this.input);
      else this.move(ghost, BotAI.choose(state, ghost, state.pacman, ghost.vulnerable));
    });

    if (this.eat(state.pellets, state.pacman.x, state.pacman.y)) state.scorePacman += 10;
    if (this.eat(state.powerPellets, state.pacman.x, state.pacman.y)) {
      state.scorePacman += 50;
      state.vulnerableUntil = Date.now() + 6500;
    }
    state.pelletsRemaining = state.pellets.length + state.powerPellets.length;

    for (const ghost of state.ghosts) {
      if (ghost.x === state.pacman.x && ghost.y === state.pacman.y) {
        if (ghost.vulnerable) {
          state.scorePacman += 200;
          ghost.x = ghost.startX;
          ghost.y = ghost.startY;
        } else if (this.role === "ghost") {
          ghost.score += ghost.email === Auth.user.email ? 300 : 0;
          this.finishSingle("ganó", Math.max(300, ghost.score + state.level * 120), "Atrapaste al Pac-Man bot.");
          return;
        } else {
          state.livesPacman -= 1;
          if (state.livesPacman <= 0) {
            this.finishSingle("perdió", state.scorePacman, "Te quedaste sin vidas.");
            return;
          }
          this.resetPositions();
          break;
        }
      }
    }

    if (state.pelletsRemaining <= 0) {
      if (this.role === "ghost") {
        this.finishSingle("perdió", Math.max(0, state.ghosts[0].score), "El Pac-Man bot limpio el nivel.");
        return;
      }
      if (state.level >= 5) {
        this.finishSingle("ganó", state.scorePacman + state.livesPacman * 250 + 1000, "Completaste los 5 niveles.");
        return;
      }
      const nextScore = state.scorePacman + 500;
      const lives = state.livesPacman;
      this.loadSingleLevel(state.level + 1, nextScore, lives);
    }

    UI.updateHud(state, `1 jugador como ${this.role === "pacman" ? "Pac-Man" : "Fantasma"}`);
    this.render();
  },

  async finishSingle(result, score, message) {
    this.state.status = "finished";
    this.state.message = message;
    this.state.winner = result === "ganó" ? (this.role === "pacman" ? "Pac-Man" : "Fantasma") : "Rival";
    this.stopTimerOnly();
    UI.updateHud(this.state, "resultado");
    this.render();
    try {
      await fetch("/api/scores/pacman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: Auth.user.email,
          score: Math.max(0, Math.round(score)),
          mode: "singleplayer",
          role: this.role,
          level: this.state.level,
          result
        })
      });
      Rankings.load(Auth.user.email);
    } catch {
      UI.message("gameMessage", "Partida finalizada, pero no se pudo guardar el score.", true);
    }
  },

  startMultiplayer(state, code) {
    this.stop();
    this.mode = "multiplayer";
    this.multiplayerCode = code;
    this.applyServerState(state);
    UI.show("game");
  },

  applyServerState(serverState) {
    if (!serverState) return;
    this.state = {
      ...serverState,
      walls: new Set(serverState.walls || [])
    };
    UI.updateHud(this.state, `multijugador ${serverState.codigo}`);
    this.render();
  },

  stop() {
    this.stopTimerOnly();
    this.multiplayerCode = null;
  },

  stopTimerOnly() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  move(actor, direction) {
    const delta = BotAI.dirs[direction] || BotAI.dirs[actor.direction] || BotAI.dirs.left;
    const nx = actor.x + delta.x;
    const ny = actor.y + delta.y;
    if (nx < 0 || ny < 0 || nx >= this.state.width || ny >= this.state.height) return;
    if (this.state.walls.has(`${nx},${ny}`)) return;
    actor.x = nx;
    actor.y = ny;
    actor.direction = direction;
  },

  eat(list, x, y) {
    const index = list.findIndex((dot) => dot.x === x && dot.y === y);
    if (index < 0) return false;
    list.splice(index, 1);
    return true;
  },

  resetPositions() {
    this.state.pacman.x = this.state.pacman.startX;
    this.state.pacman.y = this.state.pacman.startY;
    this.state.ghosts.forEach((ghost) => {
      ghost.x = ghost.startX;
      ghost.y = ghost.startY;
    });
  },

  render() {
    const state = this.state;
    if (!state || !this.ctx) return;
    const ctx = this.ctx;
    const wrapWidth = this.canvas.clientWidth || 840;
    const tile = Math.max(12, Math.floor(wrapWidth / state.width));
    this.canvas.width = tile * state.width;
    this.canvas.height = tile * state.height;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#080a12";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const walls = state.walls instanceof Set ? state.walls : new Set(state.walls || []);
    walls.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--wall").trim() || "#2148b9";
      ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x * tile + 3, y * tile + 3, tile - 6, 2);
    });

    ctx.fillStyle = "#ffe680";
    (state.pellets || []).forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x * tile + tile / 2, dot.y * tile + tile / 2, Math.max(2, tile * 0.12), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#7cf7d4";
    (state.powerPellets || []).forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x * tile + tile / 2, dot.y * tile + tile / 2, Math.max(4, tile * 0.24), 0, Math.PI * 2);
      ctx.fill();
    });

    this.drawPacman(ctx, state.pacman, tile);
    (state.ghosts || []).forEach((ghost, index) => this.drawGhost(ctx, ghost, tile, index));

    if (state.status !== "playing" && state.message) {
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(20, tile)}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(state.message, this.canvas.width / 2, this.canvas.height / 2);
    }
  },

  drawPacman(ctx, pacman, tile) {
    const cx = pacman.x * tile + tile / 2;
    const cy = pacman.y * tile + tile / 2;
    const angleByDir = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const base = angleByDir[pacman.direction] || 0;
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, tile * 0.42, base + 0.45, base + Math.PI * 2 - 0.45);
    ctx.closePath();
    ctx.fill();
  },

  drawGhost(ctx, ghost, tile, index) {
    const colors = ["#ff5c8a", "#52d1ff", "#ff9f43", "#b983ff", "#6ee7a8"];
    const x = ghost.x * tile;
    const y = ghost.y * tile;
    ctx.fillStyle = ghost.vulnerable ? "#5771d9" : colors[index % colors.length];
    ctx.beginPath();
    ctx.arc(x + tile / 2, y + tile * 0.42, tile * 0.36, Math.PI, 0);
    ctx.lineTo(x + tile * 0.86, y + tile * 0.84);
    for (let i = 0; i < 3; i += 1) {
      ctx.lineTo(x + tile * (0.68 - i * 0.18), y + tile * 0.68);
      ctx.lineTo(x + tile * (0.58 - i * 0.18), y + tile * 0.84);
    }
    ctx.lineTo(x + tile * 0.14, y + tile * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + tile * 0.38, y + tile * 0.42, tile * 0.08, 0, Math.PI * 2);
    ctx.arc(x + tile * 0.62, y + tile * 0.42, tile * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
};
