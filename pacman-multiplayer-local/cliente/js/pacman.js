const PacmanGame = {
  canvas: null,
  ctx: null,
  mode: "singleplayer",
  role: "pacman",
  state: null,
  input: "left",
  queuedInput: null,
  timer: null,
  paused: false,
  pauseStartedAt: 0,
  multiplayerCode: null,
  singleCharacter: "pacman",
  lastSingleTick: 0,
  assets: {},
  assetReady: {},
  spriteAssets: {},
  loadingUntil: 0,
  releaseDelayMs: 2200,
  ghostProfiles: [
    { club: "boca", asset: "assets/bocafantasma.png", speed: 1.35, wobble: 0.04 },
    { club: "independiente", asset: "assets/independientefantasma.png", speed: 1.15, wobble: 0.07 },
    { club: "racing", asset: "assets/racingfantasma.png", speed: 0.98, wobble: 0.1 },
    { club: "sanlorenzo", asset: "assets/sanlorenzofantasma.png", speed: 0.84, wobble: 0.12 }
  ],

  init() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    window.addEventListener("resize", () => this.render());
    document.addEventListener("keydown", (event) => {
      if (event.key === "p" || event.key === "P" || event.key === " ") {
        event.preventDefault();
        this.togglePause();
        return;
      }
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
    const pauseButton = document.getElementById("pauseBtn");
    if (pauseButton) pauseButton.addEventListener("click", () => this.togglePause());
    [
      ["pacman", "assets/pacman.png"],
      ["fondo1", "assets/fondo1.png"],
      ["fondo2", "assets/fondo2.jpg"],
      ["hero", "assets/hero-pacman.jpg"],
      ["monumental", "assets/monumentalicono.png"],
      ...this.ghostProfiles.map((ghost) => [ghost.club, ghost.asset])
    ].forEach(([key, src]) => this.loadAsset(key, src));
  },

  loadAsset(key, src) {
    const image = new Image();
    this.assets[key] = image;
    this.assetReady[key] = false;
    image.onload = () => {
      const isSprite = key === "pacman" || this.ghostProfiles.some((ghost) => ghost.club === key);
      this.spriteAssets[key] = isSprite ? this.trimTransparentSprite(image) : image;
      this.assetReady[key] = true;
      this.render();
    };
    image.src = src;
  },

  trimTransparentSprite(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || maxY < 0) return image;
    const trimmed = document.createElement("canvas");
    trimmed.width = maxX - minX + 1;
    trimmed.height = maxY - minY + 1;
    trimmed.getContext("2d").drawImage(canvas, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
    return trimmed;
  },

  setInput(direction) {
    if (this.paused || this.isCountdownActive()) return;
    this.input = direction;
    this.queuedInput = direction;
    if (this.mode === "multiplayer" && this.multiplayerCode) {
      Multiplayer.sendInput(this.multiplayerCode, direction);
    }
  },

  async startSingle(role, character = role === "ghost" ? "boca" : "pacman") {
    this.stop();
    this.paused = false;
    this.pauseStartedAt = 0;
    this.mode = "singleplayer";
    this.role = role;
    this.singleCharacter = character;
    this.multiplayerCode = null;
    this.loadingUntil = Date.now() + 900;
    UI.setLoading(true, "Preparando el estadio y los personajes...");
    this.loadSingleLevel(1, 0, null);
    UI.updateHud(this.state, `1 jugador como ${role === "pacman" ? "Pac-Man" : "Fantasma"}`);
    this.render();
    UI.show("game");
    const pauseButton = document.getElementById("pauseBtn");
    if (pauseButton) pauseButton.textContent = "Pausar";
    const backgroundKey = this.getBackgroundKey(this.state);
    const assetKeys = [backgroundKey, "pacman", ...((this.state.ghosts || []).map((ghost) => ghost.club))];
    await Promise.all([
      this.waitForAssets(assetKeys),
      new Promise((resolve) => setTimeout(resolve, 900))
    ]);
    UI.setLoading(false);
    requestAnimationFrame(() => {
      this.render();
      this.timer = setInterval(() => this.tickSingle(), 1000 / 16);
    });
  },

  loadSingleLevel(levelId, scoreCarry, livesCarry) {
    const level = LEVELS[levelId - 1] || LEVELS[0];
    const parsed = parseLevel(level);
    const ghostHouse = this.getGhostHouse(parsed);
    const orderedGhostProfiles = this.getOrderedGhostProfiles();
    const pacmanInterval = Math.max(90, Math.round(170 / Math.max(0.95, level.speed || 1)));
    const ghostIntervalBase = Math.max(95, Math.round((this.role === "ghost" ? 210 : 220) / Math.max(0.95, level.ghostSpeed || 1)));
    const countdownMs = this.mode === "singleplayer" ? 3200 : 0;
    const introMs = this.mode === "singleplayer" ? 1300 : 0;
    this.state = {
      status: "playing",
      level: level.id,
      levelName: level.name,
      mapName: level.mapName || "Monumental",
      background: level.background || "assets/hero-pacman.jpg",
      pacmanInterval,
      ghostIntervalBase,
      introDuration: introMs,
      introEndsAt: introMs ? Date.now() + introMs : 0,
      countdownEndsAt: countdownMs ? Date.now() + countdownMs : 0,
      powerPelletDuration: level.powerPelletDuration || 6500,
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
        prevX: parsed.pacmanStart.x,
        prevY: parsed.pacmanStart.y,
        renderX: parsed.pacmanStart.x,
        renderY: parsed.pacmanStart.y,
        moveStartedAt: Date.now(),
        moveDuration: pacmanInterval,
        direction: "left",
        lastMoveAt: 0,
        email: this.role === "pacman" ? Auth.user.email : "Pac-Man Bot",
        isBot: this.role !== "pacman"
      },
      ghosts: ghostHouse.slots.slice(0, 4).map((start, index) => {
        const profile = orderedGhostProfiles[index] || orderedGhostProfiles[index % orderedGhostProfiles.length];
        return {
          id: `ghost_${index + 1}`,
          club: profile.club,
          asset: profile.asset,
          speed: profile.speed,
          wobble: profile.wobble,
          x: start.x,
          y: start.y,
          startX: start.x,
          startY: start.y,
          prevX: start.x,
          prevY: start.y,
          renderX: start.x,
          renderY: start.y,
          moveStartedAt: Date.now(),
          moveDuration: ghostIntervalBase,
          direction: index % 2 ? "left" : "right",
          lastMoveAt: 0,
          released: index === 0,
          releaseAt: index * this.releaseDelayMs,
          vulnerable: false,
          isBot: !(this.role === "ghost" && index === 0),
          email: this.role === "ghost" && index === 0 ? Auth.user.email : `Bot ${index + 1}`,
          score: 0
        };
      }),
      ghostHouse,
      winner: null,
      message: ""
    };
  },

  tickSingle() {
    const state = this.state;
    if (!state || state.status !== "playing") return;
    const now = Date.now();
    if (this.paused) {
      this.render();
      return;
    }
    if (state.introEndsAt && now < state.introEndsAt) {
      this.render();
      return;
    }
    if (this.isCountdownActive()) {
      this.render();
      return;
    }
    state.ghosts.forEach((ghost) => {
      ghost.vulnerable = Date.now() < state.vulnerableUntil;
      if (!ghost.released && now >= ghost.releaseAt) ghost.released = true;
    });

    if (this.role === "pacman") {
      this.moveSingleActor(state.pacman, this.input, state.pacman.lastMoveAt, state.pacmanInterval, true, now);
    } else {
      const danger = state.ghosts.find((ghost) => !ghost.vulnerable && BotAI.distance(ghost, state.pacman) <= 3);
      const target = danger || BotAI.nearestPellet(state, state.pacman);
      const wobble = Math.max(0.03, 0.14 - state.level * 0.015);
      this.moveSingleActor(state.pacman, BotAI.choose(state, state.pacman, target, Boolean(danger), true, wobble), state.pacman.lastMoveAt, state.pacmanInterval, true, now);
    }

    state.ghosts.forEach((ghost, index) => {
      if (!ghost.released) return;
      const moveInterval = Math.max(80, Math.round(state.ghostIntervalBase / Math.max(0.72, ghost.speed + (state.level - 1) * 0.08)));
      const needMove = now - ghost.lastMoveAt >= moveInterval;
      if (!needMove) return;
      if (this.role === "ghost" && index === 0) {
        if (this.move(ghost, this.input, true)) {
          ghost.lastMoveAt = now;
          ghost.moveStartedAt = now;
          ghost.moveDuration = moveInterval;
        }
        return;
      }
      const target = ghost.vulnerable ? state.pacman : state.pacman;
      const direction = BotAI.choose(state, ghost, target, ghost.vulnerable, false, ghost.wobble + Math.max(0, 0.05 - state.level * 0.005));
      if (this.move(ghost, direction)) {
        ghost.lastMoveAt = now;
        ghost.moveStartedAt = now;
        ghost.moveDuration = moveInterval;
      }
    });

    if (this.eat(state.pellets, state.pacman.x, state.pacman.y)) state.scorePacman += 10;
    if (this.eat(state.powerPellets, state.pacman.x, state.pacman.y)) {
      state.scorePacman += 50;
      state.vulnerableUntil = now + state.powerPelletDuration;
    }
    state.pelletsRemaining = state.pellets.length + state.powerPellets.length;

    for (const ghost of state.ghosts) {
      if (ghost.x === state.pacman.x && ghost.y === state.pacman.y) {
        if (ghost.vulnerable) {
          state.scorePacman += 200;
          ghost.x = ghost.startX;
          ghost.y = ghost.startY;
          ghost.prevX = ghost.startX;
          ghost.prevY = ghost.startY;
          ghost.renderX = ghost.startX;
          ghost.renderY = ghost.startY;
          ghost.moveStartedAt = now;
        } else if (this.role === "ghost") {
          ghost.score += ghost.email === Auth.user.email ? 300 : 0;
          this.finishSingle("ganÃ³", Math.max(300, ghost.score + state.level * 120), "Atrapaste al Pac-Man bot.");
          return;
        } else {
          state.livesPacman -= 1;
          if (state.livesPacman <= 0) {
            this.finishSingle("perdiÃ³", state.scorePacman, "Se terminaron tus vidas.");
            return;
          }
          this.resetPositions();
          break;
        }
      }
    }

    if (state.pelletsRemaining <= 0) {
      if (this.role === "ghost") {
        this.finishSingle("perdiÃ³", Math.max(0, state.ghosts[0].score), "El Pac-Man bot limpio el nivel.");
        return;
      }
      if (state.level >= 5) {
        this.finishSingle("ganÃ³", state.scorePacman + state.livesPacman * 250 + 1000, "Completaste los 5 niveles.");
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
    this.state.winner = result === "ganÃ³" ? (this.role === "pacman" ? "Pac-Man" : "Fantasma") : "Rival";
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

  async startMultiplayer(state, code) {
    this.stop();
    this.mode = "multiplayer";
    this.multiplayerCode = code;
    this.paused = false;
    this.pauseStartedAt = 0;
    this.loadingUntil = Date.now() + 900;
    UI.setLoading(true, "Sincronizando la partida...");
    this.applyServerState(state);
    UI.show("game");
    const pauseButton = document.getElementById("pauseBtn");
    if (pauseButton) pauseButton.textContent = "Pausar";
    const backgroundKey = this.getBackgroundKey(this.state);
    const assetKeys = [backgroundKey, "pacman", ...((this.state.ghosts || []).map((ghost) => ghost.club))];
    await Promise.all([
      this.waitForAssets(assetKeys),
      new Promise((resolve) => setTimeout(resolve, 900))
    ]);
    UI.setLoading(false);
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
    this.paused = false;
    this.pauseStartedAt = 0;
    this.singleCharacter = "pacman";
  },

  stopTimerOnly() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    UI.setLoading(false);
    this.loadingUntil = 0;
  },

  waitForAssets(keys) {
    const uniqueKeys = [...new Set((keys || []).filter(Boolean))];
    if (!uniqueKeys.length) return Promise.resolve();
    const timeoutMs = 1600;
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const ready = uniqueKeys.every((key) => this.assetReady[key]);
        if (ready || Date.now() - startedAt > timeoutMs) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  },

  getSceneLayout(state, canvasWidth, canvasHeight) {
    const isMobile = window.innerWidth <= 760;
    const levelScale = state.level === 1 ? 0.82 : 1;
    const outerPadding = isMobile ? 8 : 20;
    const titleHeight = isMobile ? 44 : 62;
    const plaqueWidth = isMobile ? canvasWidth - outerPadding * 2 : Math.max(200, Math.floor(canvasWidth * 0.22 * levelScale));
    const plaqueHeight = isMobile ? 108 : 236;
    const mapX = isMobile ? outerPadding : plaqueWidth + outerPadding;
    const mapY = isMobile ? plaqueHeight + outerPadding : titleHeight + 16;
    const mapPaddingRight = outerPadding;
    const mapPaddingBottom = outerPadding;
    const availableWidth = Math.max(120, canvasWidth - mapX - mapPaddingRight);
    const availableHeight = Math.max(120, canvasHeight - mapY - mapPaddingBottom);
    const tile = Math.max(isMobile ? 10 : 14, Math.floor(Math.min(availableWidth / state.width, availableHeight / state.height) * (state.level === 1 ? 0.76 : 0.72)));
    const mapHeight = tile * state.height;
    return {
      isMobile,
      outerPadding,
      canvasWidth,
      canvasHeight,
      titleHeight,
      plaqueWidth,
      plaqueHeight,
      mapX,
      mapY,
      mapWidth: tile * state.width,
      mapHeight,
      tile
    };
  },

  getBackgroundKey(state) {
    if (!state?.background) return "fondo1";
    const value = state.background.replace(/^assets\//, "");
    return value.endsWith("fondo2.jpg") ? "fondo2" : value.endsWith("fondo1.png") ? "fondo1" : value.endsWith("hero-pacman.jpg") ? "hero" : value.endsWith("monumentalicono.png") ? "monumental" : value;
  },

  getGhostStarts(parsed) {
    const starts = parsed.ghostStarts.slice(0, 4);
    if (starts.length >= 4) return starts;
    const used = new Set(starts.map((start) => `${start.x},${start.y}`));
    const candidates = [
      { x: Math.max(1, parsed.width - 2), y: 1 },
      { x: 1, y: Math.max(1, parsed.height - 2) },
      { x: Math.max(1, parsed.width - 2), y: Math.max(1, parsed.height - 2) },
      { x: Math.max(2, Math.floor(parsed.width / 2)), y: Math.max(2, Math.floor(parsed.height / 2)) },
      { x: Math.max(2, Math.floor(parsed.width / 2) - 3), y: Math.max(2, Math.floor(parsed.height / 2) + 1) },
      { x: Math.max(2, Math.floor(parsed.width / 2) + 3), y: Math.max(2, Math.floor(parsed.height / 2) - 1) }
    ];
    const isOpen = (point) => point.x >= 0 && point.y >= 0 && point.x < parsed.width && point.y < parsed.height && !parsed.walls.has(`${point.x},${point.y}`);
    candidates.forEach((candidate) => {
      if (starts.length >= 4) return;
      if (!used.has(`${candidate.x},${candidate.y}`) && isOpen(candidate)) {
        starts.push(candidate);
        used.add(`${candidate.x},${candidate.y}`);
      }
    });
    if (starts.length >= 4) return starts;
    for (let y = 1; y < parsed.height - 1 && starts.length < 4; y += 1) {
      for (let x = 1; x < parsed.width - 1 && starts.length < 4; x += 1) {
        const key = `${x},${y}`;
        if (!used.has(key) && !parsed.walls.has(key)) {
          starts.push({ x, y });
          used.add(key);
        }
      }
    }
    return starts;
  },

  move(actor, direction, useQueue = false) {
    if (useQueue && this.queuedInput) {
      const queuedDelta = BotAI.dirs[this.queuedInput];
      if (queuedDelta) {
        const qx = actor.x + queuedDelta.x;
        const qy = actor.y + queuedDelta.y;
        if (qx >= 0 && qy >= 0 && qx < this.state.width && qy < this.state.height && !this.state.walls.has(`${qx},${qy}`)) {
          direction = this.queuedInput;
          this.input = this.queuedInput;
          this.queuedInput = null;
        }
      }
    }
    const delta = BotAI.dirs[direction] || BotAI.dirs[actor.direction] || BotAI.dirs.left;
    const nx = actor.x + delta.x;
    const ny = actor.y + delta.y;
    if (nx < 0 || ny < 0 || nx >= this.state.width || ny >= this.state.height) return false;
    if (this.state.walls.has(`${nx},${ny}`)) return false;
    actor.prevX = actor.x;
    actor.prevY = actor.y;
    actor.renderX = nx;
    actor.renderY = ny;
    actor.x = nx;
    actor.y = ny;
    actor.direction = direction;
    return true;
  },

  moveSingleActor(actor, direction, lastMoveAt, interval, useQueue = false, now = Date.now()) {
    if (now - lastMoveAt < interval) return false;
    const moved = this.move(actor, direction, useQueue);
    if (moved) {
      actor.lastMoveAt = now;
      actor.moveStartedAt = now;
      actor.moveDuration = interval;
    }
    return moved;
  },

  eat(list, x, y) {
    const index = list.findIndex((dot) => dot.x === x && dot.y === y);
    if (index < 0) return false;
    list.splice(index, 1);
    return true;
  },

  resetPositions() {
    const now = Date.now();
    this.state.pacman.x = this.state.pacman.startX;
    this.state.pacman.y = this.state.pacman.startY;
    this.state.pacman.prevX = this.state.pacman.startX;
    this.state.pacman.prevY = this.state.pacman.startY;
    this.state.pacman.renderX = this.state.pacman.startX;
    this.state.pacman.renderY = this.state.pacman.startY;
    this.state.pacman.moveStartedAt = now;
    this.state.ghosts.forEach((ghost, index) => {
      ghost.x = ghost.startX;
      ghost.y = ghost.startY;
      ghost.prevX = ghost.startX;
      ghost.prevY = ghost.startY;
      ghost.renderX = ghost.startX;
      ghost.renderY = ghost.startY;
      ghost.moveStartedAt = now;
      ghost.direction = "down";
      ghost.lastMoveAt = 0;
      ghost.released = index === 0;
      ghost.releaseAt = index === 0 ? 0 : now + index * this.releaseDelayMs;
    });
  },

  render() {
    const state = this.state;
    if (!state || !this.ctx) return;
    const ctx = this.ctx;
    const wrapWidth = this.canvas.clientWidth || 840;
    const wrapHeight = this.canvas.clientHeight || window.innerHeight || 560;
    const layout = this.getSceneLayout(state, wrapWidth, wrapHeight);
    const tile = layout.tile;
    this.canvas.width = wrapWidth;
    this.canvas.height = wrapHeight;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const backgroundKey = this.getBackgroundKey(state);
    const background = this.assets[backgroundKey];
    if (background && this.assetReady[backgroundKey]) {
      ctx.globalAlpha = 0.92;
      ctx.drawImage(background, 0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
      const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
      gradient.addColorStop(0, "rgba(4, 10, 22, 0.26)");
      gradient.addColorStop(1, "rgba(4, 10, 22, 0.52)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      ctx.fillStyle = "#080a12";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.drawStageChrome(ctx, state, layout);
    if (state.ghostHouse) this.drawGhostHouse(ctx, tile, layout, state.ghostHouse);

    const walls = state.walls instanceof Set ? state.walls : new Set(state.walls || []);
    walls.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      const px = layout.mapX + x * tile;
      const py = layout.mapY + y * tile;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(255,255,255,0.97)";
      this.roundRect(ctx, px + 1, py + 1, tile - 2, tile - 2, Math.max(3, tile * 0.16));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(220,220,220,0.9)";
      this.roundRect(ctx, px + 4, py + 4, tile - 8, Math.max(2, tile * 0.14), Math.max(2, tile * 0.12));
      ctx.fill();
    });

    ctx.fillStyle = "#ffe680";
    (state.pellets || []).forEach((dot) => {
      const px = layout.mapX + dot.x * tile;
      const py = layout.mapY + dot.y * tile;
      ctx.beginPath();
      ctx.arc(px + tile / 2, py + tile / 2, Math.max(2, tile * 0.11), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#7cf7d4";
    (state.powerPellets || []).forEach((dot) => {
      const px = layout.mapX + dot.x * tile;
      const py = layout.mapY + dot.y * tile;
      ctx.beginPath();
      ctx.arc(px + tile / 2, py + tile / 2, Math.max(4, tile * 0.22), 0, Math.PI * 2);
      ctx.fill();
    });

    this.drawPacman(ctx, state.pacman, tile, layout, Date.now());
    (state.ghosts || []).forEach((ghost, index) => this.drawGhost(ctx, ghost, tile, index, layout, Date.now()));

    const countdownOverlay = document.getElementById("countdownOverlay");
    if (countdownOverlay) {
      const countdownText = this.getCountdownText();
      const paused = this.paused && state.status === "playing";
      countdownOverlay.classList.toggle("hidden", !countdownText && !paused);
      countdownOverlay.classList.toggle("is-paused", paused);
      countdownOverlay.innerHTML = countdownText ? `<span>${countdownText}</span>` : paused ? `<span>Pausa</span>` : "";
    }

    if (state.status === "playing" && state.introEndsAt && Date.now() < state.introEndsAt) {
      const introDuration = Math.max(1, state.introDuration || 1300);
      const progress = 1 - ((state.introEndsAt - Date.now()) / introDuration);
      const alpha = Math.min(1, Math.max(0, 1 - progress));
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.22 + alpha * 0.26})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${Math.max(28, tile * 1.8)}px "Montserrat", sans-serif`;
      ctx.fillText(`NIVEL ${state.level}`, this.canvas.width / 2, this.canvas.height / 2 - tile * 0.5);
      ctx.font = `700 ${Math.max(16, tile * 0.8)}px "Inter", sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(state.levelName || "Más Monumental", this.canvas.width / 2, this.canvas.height / 2 + tile * 0.5);
      ctx.restore();
    }
  },

  isCountdownActive() {
    return Boolean(this.state && this.state.status === "playing" && this.state.countdownEndsAt && Date.now() < this.state.countdownEndsAt);
  },

  getCountdownText() {
    if (!this.state || this.state.status !== "playing" || !this.state.countdownEndsAt) return "";
    const remaining = Math.ceil((this.state.countdownEndsAt - Date.now()) / 1000);
    if (remaining <= 0) return "";
    if (remaining >= 1) return String(remaining);
    return "¡Ya!";
  },

  getInterpolatedPosition(actor, now) {
    if (!actor) return { x: 0, y: 0 };
    const startX = actor.prevX ?? actor.x ?? 0;
    const startY = actor.prevY ?? actor.y ?? 0;
    const endX = actor.renderX ?? actor.x ?? 0;
    const endY = actor.renderY ?? actor.y ?? 0;
    const duration = Math.max(80, actor.moveDuration || 120);
    const progress = Math.min(1, Math.max(0, (now - (actor.moveStartedAt || now)) / duration));
    const eased = progress * (2 - progress);
    return {
      x: startX + (endX - startX) * eased,
      y: startY + (endY - startY) * eased
    };
  },

  togglePause() {
    if (!this.state || this.state.status !== "playing" || this.mode !== "singleplayer") return;
    if (this.isCountdownActive()) return;
    if (!this.paused) {
      this.paused = true;
      this.pauseStartedAt = Date.now();
    } else {
      const now = Date.now();
      const pausedDuration = now - this.pauseStartedAt;
      this.paused = false;
      this.pauseStartedAt = 0;
      this.state.pacman.lastMoveAt += pausedDuration;
      this.state.ghosts.forEach((ghost) => {
        ghost.lastMoveAt += pausedDuration;
        if (ghost.releaseAt) ghost.releaseAt += pausedDuration;
      });
      if (this.state.countdownEndsAt) this.state.countdownEndsAt += pausedDuration;
      if (this.state.vulnerableUntil) this.state.vulnerableUntil += pausedDuration;
      this.state.message = "";
    }
    const pauseButton = document.getElementById("pauseBtn");
    if (pauseButton) pauseButton.textContent = this.paused ? "Reanudar" : "Pausar";
    this.render();
  },

  drawStageChrome(ctx, state, layout) {
    const isMobile = layout.isMobile;
    const panelX = isMobile ? layout.outerPadding : layout.outerPadding;
    const panelY = isMobile ? layout.outerPadding : layout.titleHeight - 6;
    const panelW = isMobile ? layout.canvasWidth - layout.outerPadding * 2 : layout.plaqueWidth - layout.outerPadding;
    const panelH = isMobile ? layout.plaqueHeight : layout.mapHeight + 20;
    const logo = this.spriteAssets.monumental || this.assets.monumental;
    if (logo && this.assetReady.monumental) {
      const logoSize = isMobile ? Math.min(72, panelH * 0.4) : Math.min(120, panelH * 0.46);
      const lx = panelX + (panelW * 0.5) - (logoSize * 0.5);
      const ly = panelY + (isMobile ? 10 : 8);
      ctx.save();
      ctx.shadowColor = "rgba(255,72,95,0.25)";
      ctx.shadowBlur = 18;
      ctx.drawImage(logo, lx, ly, logoSize, logoSize);
      ctx.restore();
    }

    const titleText = `NIVEL ${state.level}`;
    ctx.save();
    ctx.fillStyle = "#ff485f";
    ctx.font = `900 ${isMobile ? 28 : 56}px "Montserrat", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleY = isMobile ? panelY + 30 : state.level === 1 ? 52 : 32;
    ctx.fillText(titleText, this.canvas.width / 2, titleY);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `700 ${isMobile ? 14 : 18}px "Inter", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("Más Monumental", panelX + (isMobile ? 100 : 134), panelY + (isMobile ? 52 : 64));
    ctx.restore();
  },

  getGhostHouse(parsed) {
    const centerX = Math.max(3, Math.floor(parsed.width / 2) - 1);
    const centerY = Math.max(2, Math.floor(parsed.height / 3));
    return {
      x: centerX,
      y: centerY,
      w: 4,
      h: 3,
      slots: [
        { x: centerX + 1, y: centerY },
        { x: centerX, y: centerY + 1 },
        { x: centerX + 1, y: centerY + 1 },
        { x: centerX + 2, y: centerY + 1 }
      ]
    };
  },

  getOrderedGhostProfiles() {
    const profiles = [...this.ghostProfiles];
    if (this.role !== "ghost") return profiles;
    const preferred = profiles.findIndex((ghost) => ghost.club === this.singleCharacter);
    if (preferred <= 0) return profiles;
    return [
      profiles[preferred],
      ...profiles.slice(0, preferred),
      ...profiles.slice(preferred + 1)
    ];
  },

  drawGhostHouse(ctx, tile, layout, house) {
    const x = layout.mapX + house.x * tile - tile * 0.15;
    const y = layout.mapY + house.y * tile - tile * 0.15;
    const w = house.w * tile + tile * 0.3;
    const h = house.h * tile + tile * 0.2;
    ctx.save();
    ctx.fillStyle = "rgba(8, 8, 12, 0.42)";
    this.roundRect(ctx, x, y, w, h, Math.max(8, tile * 0.2));
    ctx.fill();
    ctx.strokeStyle = "rgba(240, 20, 35, 0.95)";
    ctx.lineWidth = Math.max(3, tile * 0.08);
    ctx.beginPath();
    ctx.moveTo(x + tile * 0.2, y + 2);
    ctx.lineTo(x + w - tile * 0.2, y + 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, Math.max(8, tile * 0.2));
    ctx.stroke();
    ctx.restore();
  },

  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  },

  drawPacman(ctx, pacman, tile, layout, now = Date.now()) {
    const position = this.getInterpolatedPosition(pacman, now);
    const cx = layout.mapX + position.x * tile + tile / 2;
    const cy = layout.mapY + position.y * tile + tile / 2;
    const sprite = this.spriteAssets.pacman || this.assets.pacman;
    const angleByDir = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const base = angleByDir[pacman.direction] || 0;
    if (sprite && this.assetReady.pacman) {
      const spriteSize = tile * (window.innerWidth < 700 ? 1 : 1.06);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(base);
      ctx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.restore();
      return;
    }
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, tile * 0.42, base + 0.45, base + Math.PI * 2 - 0.45);
    ctx.closePath();
    ctx.fill();
  },

  drawGhost(ctx, ghost, tile, index, layout, now = Date.now()) {
    const position = this.getInterpolatedPosition(ghost, now);
    const bounceX = ghost.released ? 0 : Math.sin(now / 240 + index * 1.4) * 0.14;
    const bounceY = ghost.released ? 0 : Math.cos(now / 220 + index * 1.2) * 0.1;
    const x = layout.mapX + (position.x + bounceX) * tile;
    const y = layout.mapY + (position.y + bounceY) * tile;
    const sprite = this.spriteAssets[ghost.club] || this.assets[ghost.club];
    if (sprite && this.assetReady[ghost.club]) {
      const spriteSize = tile * (window.innerWidth < 700 ? 1.01 : 1.06);
      const offsetX = x + tile / 2 - spriteSize / 2;
      const offsetY = y + tile / 2 - spriteSize / 2;
      ctx.save();
      ctx.globalAlpha = ghost.vulnerable ? 0.82 : 1;
      if (!ghost.released) ctx.globalAlpha = 0.92;
      ctx.drawImage(sprite, offsetX, offsetY, spriteSize, spriteSize);
      if (ghost.vulnerable) {
        ctx.fillStyle = "rgba(90, 120, 255, 0.24)";
        ctx.fillRect(x + tile * 0.16, y + tile * 0.14, tile * 0.68, tile * 0.66);
      }
      ctx.restore();
      return;
    }
    const colors = ["#ff5c8a", "#52d1ff", "#ff9f43", "#b983ff", "#6ee7a8"];
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

