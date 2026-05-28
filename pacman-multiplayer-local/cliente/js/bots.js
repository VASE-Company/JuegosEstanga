const BotAI = {
  dirs: {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  },
  distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  },
  legal(state, actor) {
    return Object.keys(this.dirs).filter((dir) => {
      const next = { x: actor.x + this.dirs[dir].x, y: actor.y + this.dirs[dir].y };
      return !state.walls.has(`${next.x},${next.y}`) && next.x >= 0 && next.y >= 0 && next.x < state.width && next.y < state.height;
    });
  },
  choose(state, actor, target, flee = false) {
    const dirs = this.legal(state, actor);
    if (!dirs.length) return actor.direction || "left";
    dirs.sort((a, b) => {
      const na = { x: actor.x + this.dirs[a].x, y: actor.y + this.dirs[a].y };
      const nb = { x: actor.x + this.dirs[b].x, y: actor.y + this.dirs[b].y };
      return flee ? this.distance(nb, target) - this.distance(na, target) : this.distance(na, target) - this.distance(nb, target);
    });
    if (Math.random() < 0.18 && dirs[1]) return dirs[1];
    return dirs[0];
  },
  nearestPellet(state, actor) {
    const dots = [...state.pellets, ...state.powerPellets];
    if (!dots.length) return actor;
    return dots.reduce((best, dot) => (this.distance(actor, dot) < this.distance(actor, best) ? dot : best), dots[0]);
  }
};
