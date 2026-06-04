const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITES = { up: "down", down: "up", left: "right", right: "left" };
const TROPHY_KEYS = ["champions", "worldCup", "laLiga"];
const ATLAS_URL = "/assets/julian-trophy-hunter/sprites.json";
const TROPHY_GROWTH = 3;
const BASE_TICK_MS = 190;
const MIN_TICK_MS = 125;
const GRID_WIDTH = 18;
const GRID_HEIGHT = 12;
const HEAD_SCALE_INSET = -0.18;
const TROPHY_SCALE_INSET = -0.2;
const MAP_FIELD = {
  left: 96 / 1402,
  top: 141 / 1122,
  width: 1210 / 1402,
  height: 826 / 1122
};

let spriteAtlas = null;
let spriteImages = null;
let spriteLoadPromise = null;

function flattenAtlas(value, output = {}) {
  if (typeof value === "string" && value.endsWith(".png")) {
    output[value] = value;
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenAtlas(item, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => flattenAtlas(item, output));
  }
  return output;
}

function getPath(path) {
  return path.split(".").reduce((current, part) => current?.[part], spriteAtlas);
}

function getImage(path) {
  const src = getPath(path);
  return src ? spriteImages?.get(src) || null : null;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve([src, image]);
    image.onerror = () => resolve([src, null]);
    image.src = src;
  });
}

function loadSprites() {
  if (!spriteLoadPromise) {
    spriteLoadPromise = fetch(ATLAS_URL)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el atlas de sprites.");
        return response.json();
      })
      .then(async (atlas) => {
        spriteAtlas = atlas;
        const paths = Object.keys(flattenAtlas(atlas));
        const loaded = await Promise.all(paths.map(loadImage));
        spriteImages = new Map(loaded.filter(([, image]) => image));
        return spriteImages;
      })
      .catch((error) => {
        console.warn(error.message);
        spriteAtlas = null;
        spriteImages = new Map();
      });
  }
  return spriteLoadPromise;
}

function randomTrophyKey() {
  return TROPHY_KEYS[Math.floor(Math.random() * TROPHY_KEYS.length)];
}

function directionFrom(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1) return "right";
  if (dx === -1) return "left";
  if (dy === 1) return "down";
  if (dy === -1) return "up";
  return null;
}

function pointCenter(point, board) {
  return {
    x: board.x + (point.x + 0.5) * board.cell,
    y: board.y + (point.y + 0.5) * board.cell
  };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

export class SnakeGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gridWidth = GRID_WIDTH;
    this.gridHeight = GRID_HEIGHT;
    this.grid = this.gridWidth;
    this.timer = null;
    this.animationFrame = null;
    this.previousSnake = null;
    this.renderProgress = 1;
    this.animationStart = 0;
    this.animationDuration = 120;
    this.options = options;
    this.active = true;
    this.waitingForInput = true;
    this.pendingGrowth = 0;
    this.pickupEffect = null;
    this.collisionEffect = null;
    loadSprites().then(() => this.draw());
    this.reset();
  }

  reset() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.previousSnake = null;
    this.renderProgress = 1;
    this.snake = [
      { x: 8, y: 6 },
      { x: 9, y: 6 },
      { x: 10, y: 6 }
    ];
    this.direction = "left";
    this.nextDirection = "left";
    this.score = 0;
    this.tickMs = BASE_TICK_MS;
    this.gameOver = false;
    this.waitingForInput = true;
    this.pendingGrowth = 0;
    this.pickupEffect = null;
    this.collisionEffect = null;
    this.food = this.createFood();
    this.draw();
    this.emitState();
  }

  start() {
    this.stop();
    this.active = true;
    if (this.waitingForInput) {
      this.draw();
      this.startIdleAnimation();
      return;
    }
    this.loop();
  }

  stop() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.animationFrame);
    this.timer = null;
    this.animationFrame = null;
  }

  startIdleAnimation() {
    cancelAnimationFrame(this.animationFrame);

    const animate = () => {
      if (!this.waitingForInput || this.gameOver || !this.active) {
        this.animationFrame = null;
        return;
      }
      this.draw();
      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  setActive(active) {
    this.active = active;
  }

  loop() {
    if (!this.gameOver && this.active) {
      this.step();
      this.timer = setTimeout(() => this.loop(), this.tickMs);
    }
  }

  setDirection(direction) {
    if (!this.active || this.gameOver || !DIRECTIONS[direction]) return;
    if (this.waitingForInput) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      if (OPPOSITES[direction] === this.direction) this.snake.reverse();
      this.direction = direction;
      this.nextDirection = direction;
      this.waitingForInput = false;
      this.draw();
      this.loop();
      return;
    }
    if (OPPOSITES[direction] === this.direction) return;
    this.nextDirection = direction;
  }

  step() {
    this.advanceEffects();
    this.direction = this.nextDirection;
    const previousSnake = this.snake.map((segment) => ({ ...segment }));
    const vector = DIRECTIONS[this.direction];
    const head = this.snake[0];
    const next = { x: head.x + vector.x, y: head.y + vector.y };
    const willEat = next.x === this.food.x && next.y === this.food.y;

    if (this.hitWall(next) || this.hitSelf(next, willEat)) {
      this.gameOver = true;
      this.playCollisionEffect(head);
      this.options.onGameOver?.(this.score);
      return;
    }

    this.previousSnake = previousSnake;
    this.snake.unshift(next);
    if (willEat) {
      this.score += 10;
      this.pendingGrowth += TROPHY_GROWTH;
      this.pickupEffect = { x: next.x, y: next.y, frame: 0 };
      this.food = this.createFood();
      this.tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - Math.floor(this.score / 90) * 4);
      this.options.onScore?.(this.score);
    } else if (this.pendingGrowth > 0) {
      this.pendingGrowth -= 1;
    } else {
      this.snake.pop();
    }

    this.startMoveAnimation();
    this.emitState();
  }

  startMoveAnimation() {
    cancelAnimationFrame(this.animationFrame);
    this.animationStart = performance.now();
    this.animationDuration = Math.max(120, Math.min(210, this.tickMs * 0.92));
    this.renderProgress = 0;

    const animate = (time) => {
      const rawProgress = Math.min(1, (time - this.animationStart) / this.animationDuration);
      this.renderProgress = 1 - Math.pow(1 - rawProgress, 3);
      this.draw();
      if (rawProgress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.renderProgress = 1;
        this.previousSnake = null;
        this.animationFrame = null;
        this.draw();
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  advanceEffects() {
    if (this.pickupEffect) {
      this.pickupEffect.frame += 1;
      if (this.pickupEffect.frame > 3) this.pickupEffect = null;
    }
    if (this.collisionEffect) {
      this.collisionEffect.frame += 1;
      if (this.collisionEffect.frame > 3) this.collisionEffect = null;
    }
  }

  playCollisionEffect(cell) {
    this.collisionEffect = { x: cell.x, y: cell.y, frame: 0 };
    this.draw();
    this.emitState();
    for (let frame = 1; frame < 4; frame += 1) {
      setTimeout(() => {
        if (!this.gameOver) return;
        this.collisionEffect = { x: cell.x, y: cell.y, frame };
        this.draw();
        this.emitState();
      }, frame * 90);
    }
  }

  hitWall(cell) {
    return cell.x < 0 || cell.y < 0 || cell.x >= this.gridWidth || cell.y >= this.gridHeight;
  }

  hitSelf(cell, willGrow = false) {
    const body = willGrow || this.pendingGrowth > 0 ? this.snake : this.snake.slice(0, -1);
    return body.some((segment) => segment.x === cell.x && segment.y === cell.y);
  }

  createFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight),
        trophy: randomTrophyKey()
      };
    } while (this.snake?.some((segment) => segment.x === food.x && segment.y === food.y));
    return food;
  }

  getState() {
    return {
      grid: this.grid,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      snake: this.snake,
      food: this.food,
      score: this.score,
      direction: this.direction,
      gameOver: this.gameOver,
      pendingGrowth: this.pendingGrowth,
      pickupEffect: this.pickupEffect,
      collisionEffect: this.collisionEffect
    };
  }

  emitState() {
    this.options.onState?.(this.getState());
  }

  renderState(state) {
    if (!state) return;
    this.gridWidth = state.gridWidth || state.grid || this.gridWidth;
    this.gridHeight = state.gridHeight || state.grid || this.gridHeight;
    this.grid = this.gridWidth;
    this.snake = state.snake || [];
    this.food = state.food || { x: 0, y: 0, trophy: "champions" };
    this.score = Number(state.score) || 0;
    this.direction = state.direction || this.direction;
    this.gameOver = Boolean(state.gameOver);
    this.pendingGrowth = Number(state.pendingGrowth) || 0;
    this.pickupEffect = state.pickupEffect || null;
    this.collisionEffect = state.collisionEffect || null;
    this.previousSnake = null;
    this.renderProgress = 1;
    this.draw();
    this.options.onScore?.(this.score);
  }

  draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const board = this.getBoardMetrics();
    const dark = document.body.classList.contains("dark");
    const gridLine = dark ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.07)";

    this.ctx.imageSmoothingEnabled = false;
    this.drawMapBackground(width, height);
    this.drawBoardGrid(board, gridLine);
    this.ctx.save();
    this.clipToBoard(board);
    this.drawTrophy(board);
    this.drawEffect(this.collisionEffect, "effects.collision", board);
    this.drawSnake(board);
    this.drawEffect(this.pickupEffect, "effects.pickup", board);
    this.ctx.restore();
  }

  getBoardMetrics() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const field = {
      x: width * MAP_FIELD.left,
      y: height * MAP_FIELD.top,
      width: width * MAP_FIELD.width,
      height: height * MAP_FIELD.height
    };
    const cell = Math.min(field.width / this.gridWidth, field.height / this.gridHeight);
    const boardWidth = cell * this.gridWidth;
    const boardHeight = cell * this.gridHeight;
    return {
      x: field.x + (field.width - boardWidth) / 2,
      y: field.y + (field.height - boardHeight) / 2,
      width: boardWidth,
      height: boardHeight,
      cell
    };
  }

  drawMapBackground(width, height) {
    const image = getImage("map.field");
    if (image) {
      this.ctx.drawImage(image, 0, 0, width, height);
      return;
    }

    this.ctx.fillStyle = "#2f7d25";
    this.ctx.fillRect(0, 0, width, height);
  }

  drawBoardGrid(board, color) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    for (let index = 0; index <= this.gridWidth; index += 1) {
      const pos = Math.round(board.x + index * board.cell) + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(pos, board.y);
      this.ctx.lineTo(pos, board.y + board.height);
      this.ctx.stroke();
    }
    for (let index = 0; index <= this.gridHeight; index += 1) {
      const pos = Math.round(board.y + index * board.cell) + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(board.x, pos);
      this.ctx.lineTo(board.x + board.width, pos);
      this.ctx.stroke();
    }
  }

  clipToBoard(board) {
    this.ctx.beginPath();
    this.ctx.rect(board.x, board.y, board.width, board.height);
    this.ctx.clip();
  }

  drawTrophy(board) {
    const trophy = this.food?.trophy || "champions";
    const path = trophy === "worldCup" ? "trophies.worldCup" : trophy === "laLiga" ? "trophies.laLiga" : "trophies.champions";
    const image = getImage(path);
    if (image) {
      this.drawTrophyGlow(this.food.x, this.food.y, board);
      this.drawImageCell(image, this.food.x, this.food.y, board, board.cell * TROPHY_SCALE_INSET);
      return;
    }
    this.ctx.fillStyle = "#efb52d";
    this.roundCell(this.food.x, this.food.y, board, board.cell * 0.28);
  }

  drawTrophyGlow(x, y, board) {
    const center = pointCenter({ x, y }, board);
    const pulse = 0.88 + Math.sin(performance.now() / 260) * 0.08;
    const radius = board.cell * 0.58 * pulse;
    const gradient = this.ctx.createRadialGradient(center.x, center.y, board.cell * 0.1, center.x, center.y, radius);
    gradient.addColorStop(0, "rgba(255, 222, 88, 0.56)");
    gradient.addColorStop(0.55, "rgba(255, 188, 35, 0.2)");
    gradient.addColorStop(1, "rgba(255, 188, 35, 0)");

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y + board.cell * 0.34, board.cell * 0.28, board.cell * 0.08, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#ffd45f";
    for (let index = 0; index < 4; index += 1) {
      const angle = performance.now() / 620 + index * Math.PI / 2;
      const sparkleX = center.x + Math.cos(angle) * board.cell * 0.42;
      const sparkleY = center.y + Math.sin(angle) * board.cell * 0.34;
      this.drawSparkle(sparkleX, sparkleY, board.cell * 0.075);
    }
  }

  drawSparkle(x, y, size) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x + size * 0.35, y - size * 0.35);
    this.ctx.lineTo(x + size, y);
    this.ctx.lineTo(x + size * 0.35, y + size * 0.35);
    this.ctx.lineTo(x, y + size);
    this.ctx.lineTo(x - size * 0.35, y + size * 0.35);
    this.ctx.lineTo(x - size, y);
    this.ctx.lineTo(x - size * 0.35, y - size * 0.35);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawSnake(board) {
    const renderSnake = this.getRenderSnake();
    this.drawSmoothScarf(renderSnake, board);
    this.drawTailFringes(renderSnake, board);
    this.drawScarfBadges(renderSnake, board);
    if (this.snake[0]) this.drawHead(this.snake[0], board, renderSnake[0]);
  }

  drawSmoothScarf(renderSnake, board) {
    if (!renderSnake?.length) return;

    this.ctx.save();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.imageSmoothingEnabled = false;

    this.ctx.save();
    this.ctx.translate(board.cell * 0.045, board.cell * 0.055);
    this.strokeRoundedScarfPath(renderSnake, board, board.cell * 0.76, "rgba(0, 0, 0, 0.28)");
    this.ctx.restore();

    this.strokeRoundedScarfPath(renderSnake, board, board.cell * 0.76, "#07112f");
    this.strokeRoundedScarfPath(renderSnake, board, board.cell * 0.61, "#d3152e");
    this.strokeRoundedScarfPath(renderSnake, board, board.cell * 0.39, "#f8f1e7");
    this.strokeRoundedScarfPath(renderSnake, board, board.cell * 0.16, "#d3152e");

    this.ctx.restore();
  }

  strokeRoundedScarfPath(points, board, width, color) {
    if (!points.length) return;
    const centers = points.map((point) => pointCenter(point, board));
    const radius = board.cell * 0.46;

    this.ctx.beginPath();
    this.ctx.moveTo(centers[0].x, centers[0].y);

    for (let index = 1; index < centers.length - 1; index += 1) {
      const previous = centers[index - 1];
      const current = centers[index];
      const next = centers[index + 1];
      const toPrevious = normalizeVector({ x: previous.x - current.x, y: previous.y - current.y });
      const toNext = normalizeVector({ x: next.x - current.x, y: next.y - current.y });
      const straight = Math.abs(toPrevious.x + toNext.x) < 0.01 && Math.abs(toPrevious.y + toNext.y) < 0.01;

      if (straight) {
        this.ctx.lineTo(current.x, current.y);
        continue;
      }

      const before = {
        x: current.x + toPrevious.x * radius,
        y: current.y + toPrevious.y * radius
      };
      const after = {
        x: current.x + toNext.x * radius,
        y: current.y + toNext.y * radius
      };

      this.ctx.lineTo(before.x, before.y);
      this.ctx.quadraticCurveTo(current.x, current.y, after.x, after.y);
    }

    if (centers.length > 1) {
      const last = centers[centers.length - 1];
      this.ctx.lineTo(last.x, last.y);
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }

  drawTailFringes(renderSnake, board) {
    if (!renderSnake || renderSnake.length < 2) return;
    const tail = pointCenter(renderSnake[renderSnake.length - 1], board);
    const beforeTail = pointCenter(renderSnake[renderSnake.length - 2], board);
    const outward = normalizeVector({ x: tail.x - beforeTail.x, y: tail.y - beforeTail.y });
    const perpendicular = { x: -outward.y, y: outward.x };
    const startOffset = board.cell * 0.25;
    const endOffset = board.cell * 0.48;
    const spacing = board.cell * 0.1;

    for (let index = -2; index <= 2; index += 1) {
      const base = {
        x: tail.x + perpendicular.x * spacing * index,
        y: tail.y + perpendicular.y * spacing * index
      };
      const start = {
        x: base.x + outward.x * startOffset,
        y: base.y + outward.y * startOffset
      };
      const end = {
        x: base.x + outward.x * endOffset,
        y: base.y + outward.y * endOffset
      };

      this.ctx.lineCap = "round";
      this.ctx.strokeStyle = "#07112f";
      this.ctx.lineWidth = Math.max(2, board.cell * 0.065);
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();

      this.ctx.strokeStyle = "#d3152e";
      this.ctx.lineWidth = Math.max(1.5, board.cell * 0.038);
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
    }
  }

  drawScarfBadges(renderSnake, board) {
    if (!renderSnake || renderSnake.length < 5) return;

    for (let index = 2; index < renderSnake.length - 1; index += 5) {
      const previous = this.snake[index - 1];
      const current = this.snake[index];
      const next = this.snake[index + 1];
      if (!previous || !current || !next) continue;

      const toPrevious = directionFrom(current, previous);
      const toNext = directionFrom(current, next);
      const horizontal =
        (toPrevious === "left" && toNext === "right") ||
        (toPrevious === "right" && toNext === "left");
      const vertical =
        (toPrevious === "up" && toNext === "down") ||
        (toPrevious === "down" && toNext === "up");

      if (!horizontal && !vertical) continue;
      this.drawScarfBadge(renderSnake[index], board, index % 10 === 2 ? "ALVAREZ" : "19", horizontal);
    }
  }

  drawScarfBadge(segment, board, text, horizontal) {
    const center = pointCenter(segment, board);
    const width = horizontal ? board.cell * 0.95 : board.cell * 0.78;
    const height = board.cell * 0.28;

    this.ctx.save();
    this.ctx.translate(center.x, center.y);
    if (!horizontal) this.ctx.rotate(Math.PI / 2);

    this.roundedRectPath(-width / 2, -height / 2, width, height, board.cell * 0.06);
    this.ctx.fillStyle = "#0b1f55";
    this.ctx.fill();
    this.ctx.lineWidth = Math.max(1, board.cell * 0.03);
    this.ctx.strokeStyle = "#07112f";
    this.ctx.stroke();

    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = text === "19" ? `800 ${board.cell * 0.24}px system-ui` : `800 ${board.cell * 0.13}px system-ui`;
    this.ctx.fillText(text, 0, 0);
    this.ctx.restore();
  }

  roundedRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + width, y, x + width, y + height, r);
    this.ctx.arcTo(x + width, y + height, x, y + height, r);
    this.ctx.arcTo(x, y + height, x, y, r);
    this.ctx.arcTo(x, y, x + width, y, r);
  }

  getRenderSnake() {
    if (!this.previousSnake || this.renderProgress >= 1) return this.snake;
    const progress = this.renderProgress;
    return this.snake.map((segment, index) => {
      const previous = this.previousSnake[index] || this.previousSnake[index - 1] || segment;
      return {
        x: previous.x + (segment.x - previous.x) * progress,
        y: previous.y + (segment.y - previous.y) * progress
      };
    });
  }

  drawHead(segment, board, renderSegment = segment) {
    const image = getImage(`heads.${this.direction}`);
    if (image) {
      this.drawImageCell(image, renderSegment.x, renderSegment.y, board, board.cell * HEAD_SCALE_INSET);
      return;
    }
    this.ctx.fillStyle = "#0b1f55";
    this.roundCell(renderSegment.x, renderSegment.y, board, board.cell * 0.18);
  }

  drawEffect(effect, pathPrefix, board) {
    if (!effect) return;
    const frame = Math.min(4, Math.max(1, Number(effect.frame || 0) + 1));
    const frames = getPath(pathPrefix);
    const src = Array.isArray(frames) ? frames[frame - 1] : null;
    const image = src ? spriteImages?.get(src) : null;
    if (!image) return;
    this.drawImageCell(image, effect.x, effect.y, board, -board.cell * 0.18);
  }

  drawImageCell(image, x, y, board, inset = 0) {
    if (!image) return;
    const cell = board.cell;
    const gap = Math.max(-cell * 0.5, inset);
    const size = cell - gap * 2;
    const left = board.x + x * cell + gap;
    const top = board.y + y * cell + gap;
    this.ctx.drawImage(image, left, top, size, size);
  }

  roundCell(x, y, board, radius) {
    const cell = board.cell;
    const gap = Math.max(2, cell * 0.08);
    const left = board.x + x * cell + gap;
    const top = board.y + y * cell + gap;
    const size = cell - gap * 2;
    const r = Math.min(radius, size / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(left + r, top);
    this.ctx.arcTo(left + size, top, left + size, top + size, r);
    this.ctx.arcTo(left + size, top + size, left, top + size, r);
    this.ctx.arcTo(left, top + size, left, top, r);
    this.ctx.arcTo(left, top, left + size, top, r);
    this.ctx.fill();
  }
}
