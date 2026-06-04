var PacmanMovement = {
  getSceneLayout(state, canvasWidth, canvasHeight) {
    const isCompact = window.innerWidth <= 1024;
    const isMobile = window.innerWidth <= 760;
    const outerPadding = isMobile ? 8 : isCompact ? 12 : 20;
    const titleHeight = isMobile ? 38 : isCompact ? 50 : 62;
    const plaqueWidth = isMobile
      ? canvasWidth - outerPadding * 2
      : Math.max(180, Math.floor(canvasWidth * (isCompact ? 0.18 : 0.22) * levelScale));
    const plaqueHeight = isMobile ? 82 : isCompact ? 148 : 236;
    const mapX = isMobile ? outerPadding : plaqueWidth + outerPadding;
    const mapY = isMobile
      ? Math.max(220, Math.floor(canvasHeight * 0.32))
      : isCompact
        ? (state.level === 1 ? 92 : 72)
        : (state.level === 1 ? 78 : 64);
    const mapPaddingRight = outerPadding;
    const mapPaddingBottom = outerPadding;
    const availableWidth = Math.max(120, canvasWidth - mapX - mapPaddingRight);
    const availableHeight = Math.max(120, canvasHeight - mapY - mapPaddingBottom);
    const density = isMobile ? 1.08 : isCompact ? 0.84 : 0.72;
    const levelScale = isMobile
      ? (state.level === 1 ? 0.98 : density)
      : (state.level === 1 ? 0.82 : density);
    const tile = Math.max(isMobile ? 12 : isCompact ? 11 : 14, Math.floor(Math.min(availableWidth / state.width, availableHeight / state.height) * levelScale));
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
    return value.endsWith("fondo2.jpg") ? "fondo2" : value.endsWith("fondo1.png") ? "fondo1" : value.endsWith("hero-pacman.jpg") ? "hero" : value;
  },

  getGhostStarts(parsed) {
    const isOpen = (point) => point.x >= 0 && point.y >= 0 && point.x < parsed.width && point.y < parsed.height && !parsed.walls.has(`${point.x},${point.y}`);
    const starts = parsed.ghostStarts.filter(isOpen).slice(0, 4);
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

};
