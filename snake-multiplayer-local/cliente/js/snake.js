const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITES = { up: "down", down: "up", left: "right", right: "left" };

export class SnakeGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.grid = 24;
    this.timer = null;
    this.options = options;
    this.active = true;
    this.reset();
  }

  reset() {
    const mid = Math.floor(this.grid / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];
    this.direction = "right";
    this.nextDirection = "right";
    this.score = 0;
    this.tickMs = 145;
    this.gameOver = false;
    this.food = this.createFood();
    this.draw();
    this.emitState();
  }

  start() {
    this.stop();
    this.active = true;
    this.loop();
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
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
    if (OPPOSITES[direction] === this.direction) return;
    this.nextDirection = direction;
  }

  step() {
    this.direction = this.nextDirection;
    const vector = DIRECTIONS[this.direction];
    const head = this.snake[0];
    const next = { x: head.x + vector.x, y: head.y + vector.y };

    if (this.hitWall(next) || this.hitSelf(next)) {
      this.gameOver = true;
      this.draw();
      this.emitState();
      this.options.onGameOver?.(this.score);
      return;
    }

    this.snake.unshift(next);
    if (next.x === this.food.x && next.y === this.food.y) {
      this.score += 10;
      this.food = this.createFood();
      this.tickMs = Math.max(78, 145 - Math.floor(this.score / 60) * 6);
      this.options.onScore?.(this.score);
    } else {
      this.snake.pop();
    }

    this.draw();
    this.emitState();
  }

  hitWall(cell) {
    return cell.x < 0 || cell.y < 0 || cell.x >= this.grid || cell.y >= this.grid;
  }

  hitSelf(cell) {
    return this.snake.some((segment) => segment.x === cell.x && segment.y === cell.y);
  }

  createFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.grid),
        y: Math.floor(Math.random() * this.grid)
      };
    } while (this.snake?.some((segment) => segment.x === food.x && segment.y === food.y));
    return food;
  }

  getState() {
    return {
      grid: this.grid,
      snake: this.snake,
      food: this.food,
      score: this.score,
      direction: this.direction,
      gameOver: this.gameOver
    };
  }

  emitState() {
    this.options.onState?.(this.getState());
  }

  renderState(state) {
    if (!state) return;
    this.grid = state.grid || this.grid;
    this.snake = state.snake || [];
    this.food = state.food || { x: 0, y: 0 };
    this.score = Number(state.score) || 0;
    this.gameOver = Boolean(state.gameOver);
    this.draw();
    this.options.onScore?.(this.score);
  }

  draw() {
    const size = this.canvas.width;
    const cell = size / this.grid;
    const styles = getComputedStyle(document.documentElement);
    const bg = document.body.classList.contains("dark") ? "#0b1110" : "#f0f6ec";
    const gridLine = document.body.classList.contains("dark") ? "#182522" : "#dbe8d7";
    const snake = styles.getPropertyValue("--snake").trim() || "#1f9d6a";
    const head = styles.getPropertyValue("--snake-head").trim() || "#0b6b48";
    const food = styles.getPropertyValue("--food").trim() || "#e04747";

    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, size, size);
    this.ctx.strokeStyle = gridLine;
    this.ctx.lineWidth = 1;
    for (let index = 0; index <= this.grid; index += 1) {
      const pos = Math.round(index * cell) + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, size);
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(size, pos);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = food;
    this.roundCell(this.food.x, this.food.y, cell, cell * 0.28);

    this.snake.forEach((segment, index) => {
      this.ctx.fillStyle = index === 0 ? head : snake;
      this.roundCell(segment.x, segment.y, cell, cell * 0.18);
    });

    if (this.gameOver) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
      this.ctx.fillRect(0, 0, size, size);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "800 32px system-ui";
      this.ctx.textAlign = "center";
      this.ctx.fillText("Fin del turno", size / 2, size / 2);
    }
  }

  roundCell(x, y, cell, radius) {
    const gap = Math.max(2, cell * 0.08);
    const left = x * cell + gap;
    const top = y * cell + gap;
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
