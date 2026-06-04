var PacmanRender = {
  render() {
    // aca pintamos la escena completa con el estado actual.
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

    const isMobile = layout.isMobile;
    (state.pellets || []).forEach((dot) => {
      const px = layout.mapX + dot.x * tile;
      const py = layout.mapY + dot.y * tile;
      this.drawItemSprite(ctx, "pellet", px, py, tile, isMobile ? 0.42 : 0.34, 0.04);
    });

    (state.powerPellets || []).forEach((dot) => {
      const px = layout.mapX + dot.x * tile;
      const py = layout.mapY + dot.y * tile;
      this.drawItemSprite(ctx, "powerPellet", px, py, tile, isMobile ? 0.56 : 0.44, 0.06);
    });

    this.drawPacman(ctx, state.pacman, tile, layout, Date.now());
    (state.ghosts || []).forEach((ghost, index) => this.drawGhost(ctx, ghost, tile, index, layout, Date.now()));

    const countdownOverlay = document.getElementById("countdownOverlay");
    const gameScene = document.querySelector(".game-scene");
    if (countdownOverlay) {
      const countdownText = this.getCountdownText();
      const countdownActive = this.isCountdownActive();
      const paused = this.paused && state.status === "playing";
      countdownOverlay.classList.toggle("hidden", !countdownActive && !paused);
      countdownOverlay.classList.toggle("is-paused", paused);
      this.canvas.classList.toggle("is-countdown-active", countdownActive || paused);
      if (gameScene) gameScene.classList.toggle("is-countdown-active", countdownActive);
      if (countdownActive) {
        const stageLabel = state.level === 1 ? "Preparando partida" : `Preparando nivel ${state.level}`;
        countdownOverlay.innerHTML = `
          <div class="countdown-card" role="status" aria-live="polite">
            <span class="countdown-badge">${stageLabel}</span>
            <strong class="countdown-number">${countdownText}</strong>
            <span class="countdown-hint">Respirá, se arranca en segundos</span>
          </div>
        `;
      } else if (paused) {
        countdownOverlay.innerHTML = `
          <div class="countdown-card countdown-card-paused" role="status" aria-live="polite">
            <span class="countdown-badge">Pausa</span>
            <strong class="countdown-number">II</strong>
            <span class="countdown-hint">El juego quedó en espera</span>
          </div>
        `;
      } else {
        countdownOverlay.innerHTML = "";
      }
    }

    if (state.comboFeedback && state.comboFeedback.until > Date.now()) {
      const feedback = state.comboFeedback;
      const progress = 1 - Math.max(0, (feedback.until - Date.now()) / 1000);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.fillStyle = "#ffe680";
      ctx.font = `900 ${Math.max(20, tile * 1.2)}px "Montserrat", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fx = layout.mapX + feedback.x * tile + tile / 2;
      const fy = layout.mapY + feedback.y * tile - tile * (0.5 + progress * 1.1);
      ctx.fillText(feedback.text, fx, fy);
      ctx.restore();
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
    if (pauseButton) {
      pauseButton.innerHTML = this.paused
        ? '<i data-lucide="play"></i><span>Reanudar</span>'
        : '<i data-lucide="pause"></i><span>Pausar</span>';
      UI.renderIcons();
    }
    this.render();
  },

  drawStageChrome(ctx, state, layout) {
    const isMobile = layout.isMobile;
    const panelY = isMobile ? layout.outerPadding : layout.titleHeight - 6;

    const titleText = `NIVEL ${state.level}`;
    ctx.save();
    ctx.fillStyle = "#ff485f";
    ctx.font = `900 ${isMobile ? 18 : 56}px "Montserrat", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleY = isMobile ? 18 : state.level === 1 ? 52 : 32;
    ctx.fillText(titleText, this.canvas.width / 2, titleY);
    ctx.restore();

    if (isMobile) return;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `700 17px "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const subtitleY = titleY + 30;
    ctx.fillText(state.mapName || state.levelName || "", this.canvas.width / 2, subtitleY);
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
    const lossImage = this.assets["pacman-loss"];
    if (this.state?.lifeLossUntil && now < this.state.lifeLossUntil && lossImage && this.assetReady["pacman-loss"]) {
      const size = tile * 1.1;
      const pulse = 1 + Math.sin(now / 70) * 0.03;
      ctx.save();
      ctx.globalAlpha = 0.96;
      this.drawContainedImage(ctx, lossImage, cx - size / 2, cy - size / 2, size * pulse, size * pulse, 0.92);
      ctx.restore();
      return;
    }
    const directionKey = pacman.direction === "up"
      ? "pacman-up"
      : pacman.direction === "down"
        ? "pacman-down"
        : pacman.direction === "left"
          ? "pacman-left"
          : "pacman-right";
    const image = this.spriteAssets[directionKey] || this.assets[directionKey];
    if (image && this.assetReady[directionKey]) {
    const size = tile * (layout.isMobile ? 0.86 : 0.76);
      this.drawContainedImage(ctx, image, cx - size / 2, cy - size / 2, size, size, 0.92);
      return;
    }
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.42, 0.22, Math.PI * 2 - 0.22);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
  },

  drawGhost(ctx, ghost, tile, index, layout, now = Date.now()) {
    const position = this.getInterpolatedPosition(ghost, now);
    const bounceX = ghost.released ? 0 : Math.sin(now / 240 + index * 1.4) * 0.14;
    const bounceY = ghost.released ? 0 : Math.cos(now / 220 + index * 1.2) * 0.1;
    const x = layout.mapX + (position.x + bounceX) * tile;
    const y = layout.mapY + (position.y + bounceY) * tile;
    const key = ghost.vulnerable ? `${ghost.club}-vulnerable` : ghost.club;
    const image = this.spriteAssets[key] || this.assets[key];
    if (image && this.assetReady[key]) {
      const size = tile * (layout.isMobile ? 0.82 : 0.72);
      ctx.save();
      ctx.globalAlpha = ghost.released ? 1 : 0.94;
      this.drawContainedImage(ctx, image, x + tile / 2 - size / 2, y + tile / 2 - size / 2, size, size, 0.92);
      ctx.restore();
      return;
    }
    const colors = ["#ff5c8a", "#52d1ff", "#ff9f43", "#b983ff", "#6ee7a8"];
    ctx.save();
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
    if (ghost.vulnerable) {
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillRect(x + tile * 0.24, y + tile * 0.22, tile * 0.52, tile * 0.08);
    }
    ctx.restore();
  },

  drawItemSprite(ctx, key, x, y, tile, sizeFactor, fallbackRadiusFactor) {
    const image = this.spriteAssets[key] || this.assets[key];
    if (image && this.assetReady[key]) {
      const size = tile * sizeFactor;
      this.drawContainedImage(ctx, image, x + tile / 2 - size / 2, y + tile / 2 - size / 2, size, size, 0.92);
      return;
    }
    ctx.fillStyle = key === "powerPellet" ? "#7cf7d4" : "#ffe680";
    ctx.beginPath();
    ctx.arc(x + tile / 2, y + tile / 2, Math.max(2, tile * fallbackRadiusFactor), 0, Math.PI * 2);
    ctx.fill();
  },

  drawContainedImage(ctx, image, x, y, width, height, paddingRatio = 1) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) {
      ctx.drawImage(image, x, y, width, height);
      return;
    }
    const availableWidth = width * paddingRatio;
    const availableHeight = height * paddingRatio;
    const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }
};
