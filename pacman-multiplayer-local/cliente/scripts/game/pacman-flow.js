var PacmanFlow = {
  setInput(direction) {
    if (this.paused || this.isCountdownActive()) return;
    this.input = direction;
    this.queuedInput = direction;
    if (this.mode === "multiplayer" && this.multiplayerCode) {
      Multiplayer.sendInput(this.multiplayerCode, direction);
    }
  },

  async startSingle(role, character = role === "ghost" ? "boca" : "pacman") {
    // aca arrancamos una partida local bien limpia, sin mezclar el estado anterior.
    this.stop();
    PacmanAudio.prime();
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
    const assetKeys = [
      backgroundKey,
      "pacman-right",
      "pacman-left",
      "pacman-up",
      "pacman-down",
      "pacman-loss",
      "pellet",
      "powerPellet",
      ...((this.state.ghosts || []).flatMap((ghost) => [ghost.club, `${ghost.club}-vulnerable`]))
    ];
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

  restartSingle() {
    if (this.mode !== "singleplayer") return;
    this.startSingle(this.role, this.singleCharacter);
  },

  loadSingleLevel(levelId, scoreCarry, livesCarry) {
    // aca armamos el estado del nivel para no recalcular todo en cada tick.
    if (this.levelTransitionTimer) {
      clearTimeout(this.levelTransitionTimer);
      this.levelTransitionTimer = null;
    }
    const level = LEVELS[levelId - 1] || LEVELS[0];
    const parsed = parseLevel(level);
    const ghostHouse = this.getGhostHouse(parsed);
    const orderedGhostProfiles = this.getOrderedGhostProfiles();
    const pacmanInterval = Math.max(90, Math.round(170 / Math.max(0.95, level.speed || 1)));
    const ghostIntervalBase = Math.max(95, Math.round((this.role === "ghost" ? 210 : 220) / Math.max(0.95, level.ghostSpeed || 1)));
    const ghostSkill = Math.max(0.18, Math.min(1, 0.2 + (level.id - 1) * 0.2));
    const countdownMs = this.mode === "singleplayer" ? 3200 : 0;
    const introMs = this.mode === "singleplayer" ? 1300 : 0;
    this.state = {
      status: "playing",
      level: level.id,
      levelName: level.name,
      mapName: level.mapName || "Monumental",
      background: level.background || "assets/images/backgrounds/hero-pacman.jpg",
      pacmanInterval,
      ghostIntervalBase,
      ghostSkill,
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
      ghostCombo: 0,
      comboFeedback: null,
      lifeLossUntil: 0,
      pendingResetAfterLifeLoss: false,
      pendingGameOver: false,
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
    PacmanAudio.syncFromState(this.state);
  },

  tickSingle() {
    // aca corre la jugada principal: movimiento, colisiones y cambio de nivel.
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
    if (state.lifeLossUntil && now >= state.lifeLossUntil) {
      const shouldFinish = state.pendingGameOver;
      state.lifeLossUntil = 0;
      state.pendingResetAfterLifeLoss = false;
      state.pendingGameOver = false;
      if (shouldFinish) {
        this.finishSingle("perdiÃ³", state.scorePacman, "Se terminaron tus vidas.");
        return;
      }
      this.resetPositions();
      this.render();
      return;
    }
    if (state.lifeLossUntil && now < state.lifeLossUntil) {
      this.render();
      return;
    }
    state.ghosts.forEach((ghost) => {
      ghost.vulnerable = Date.now() < state.vulnerableUntil;
      if (!ghost.released && now >= ghost.releaseAt) ghost.released = true;
    });
    if (state.ghostCombo > 0 && now >= state.vulnerableUntil) {
      state.ghostCombo = 0;
    }
    if (state.comboFeedback && now >= state.comboFeedback.until) {
      state.comboFeedback = null;
    }

    if (this.role === "pacman") {
      this.moveSingleActor(state.pacman, this.input, state.pacman.lastMoveAt, state.pacmanInterval, true, now);
    } else {
      const danger = state.ghosts.find((ghost) => !ghost.vulnerable && BotAI.distance(ghost, state.pacman) <= 3);
      const target = danger || BotAI.nearestPellet(state, state.pacman);
      const wobble = Math.max(0.03, 0.14 - state.level * 0.015);
      this.moveSingleActor(state.pacman, BotAI.choose(state, state.pacman, target, Boolean(danger), true, wobble, 1), state.pacman.lastMoveAt, state.pacmanInterval, true, now);
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
      const direction = BotAI.choose(state, ghost, target, ghost.vulnerable, false, ghost.wobble + Math.max(0, 0.05 - state.level * 0.005), state.ghostSkill || 1);
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
          state.ghostCombo = (state.ghostCombo || 0) + 1;
          const comboPoints = state.ghostCombo * 200;
          state.scorePacman += comboPoints;
          state.comboFeedback = {
            text: `+${comboPoints}`,
            until: now + 1000,
            x: ghost.x,
            y: ghost.y
          };
          ghost.x = ghost.startX;
          ghost.y = ghost.startY;
          ghost.prevX = ghost.startX;
          ghost.prevY = ghost.startY;
          ghost.renderX = ghost.startX;
          ghost.renderY = ghost.startY;
          ghost.moveStartedAt = now;
          ghost.released = false;
          ghost.vulnerable = false;
          ghost.releaseAt = now + this.releaseDelayMs;
          ghost.lastMoveAt = now;
        } else if (this.role === "ghost") {
          ghost.score += ghost.email === Auth.user.email ? 300 : 0;
          this.finishSingle("ganÃƒÂ³", Math.max(300, ghost.score + state.level * 120), "Atrapaste al Pac-Man bot.");
          return;
        } else {
          state.livesPacman -= 1;
          state.ghostCombo = 0;
          state.comboFeedback = null;
          state.lifeLossUntil = now + 1100;
          state.pendingResetAfterLifeLoss = state.livesPacman > 0;
          state.pendingGameOver = state.livesPacman <= 0;
          PacmanAudio.syncFromState(state);
          this.render();
          return;
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
      PacmanAudio.playVictory();
      this.levelTransitionTimer = setTimeout(() => {
        this.levelTransitionTimer = null;
        this.loadSingleLevel(state.level + 1, nextScore, lives);
      }, 1200);
      return;
    }

    UI.updateHud(state, `1 jugador como ${this.role === "pacman" ? "Pac-Man" : "Fantasma"}`);
    this.render();
  },

  async finishSingle(result, score, message) {
    this.state.status = "finished";
    this.state.message = message;
    this.state.result = result;
    if (String(result).startsWith("gan")) {
      PacmanAudio.playVictory();
    } else {
      PacmanAudio.stopAmbient();
    }
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
    PacmanAudio.prime();
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
    const assetKeys = [
      backgroundKey,
      "pacman-right",
      "pacman-left",
      "pacman-up",
      "pacman-down",
      "pacman-loss",
      "pellet",
      "powerPellet",
      ...((this.state.ghosts || []).flatMap((ghost) => [ghost.club, `${ghost.club}-vulnerable`]))
    ];
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
    PacmanAudio.syncFromState(this.state);
    this.render();
  },

  stop() {
    this.stopTimerOnly();
    if (this.levelTransitionTimer) {
      clearTimeout(this.levelTransitionTimer);
      this.levelTransitionTimer = null;
    }
    PacmanAudio.stopAmbient();
    this.multiplayerCode = null;
    this.paused = false;
    this.pauseStartedAt = 0;
    this.singleCharacter = "pacman";
    if (this.state) {
      this.state.ghostCombo = 0;
      this.state.comboFeedback = null;
      this.state.lifeLossUntil = 0;
      this.state.pendingResetAfterLifeLoss = false;
      this.state.pendingGameOver = false;
    }
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

};

