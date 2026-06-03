var PacmanCore = {
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
  levelTransitionTimer: null,
  assets: {},
  assetReady: {},
  spriteAssets: {},
  loadingUntil: 0,
  releaseDelayMs: 2200,
  ghostProfiles: [
    { club: "boca", asset: "assets/images/characters/bocafantasma.png", vulnerableAsset: "assets/images/characters/bocafantasma-perseguido.png", speed: 1.35, wobble: 0.04 },
    { club: "independiente", asset: "assets/images/characters/independientefantasma.png", vulnerableAsset: "assets/images/characters/independientefantasma-perseguido.png", speed: 1.15, wobble: 0.07 },
    { club: "racing", asset: "assets/images/characters/racingfantasma.png", vulnerableAsset: "assets/images/characters/racingfantasma-perseguido.png", speed: 0.98, wobble: 0.1 },
    { club: "sanlorenzo", asset: "assets/images/characters/sanlorenzofantasma.png", vulnerableAsset: "assets/images/characters/sanlorenzofantasma-perseguido.png", speed: 0.84, wobble: 0.12 }
  ],

  coreInit() {
    // aca dejamos lista la entrada del juego y los controles base.
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
      ["fondo1", "assets/images/backgrounds/fondo1.png"],
      ["fondo2", "assets/images/backgrounds/fondo2.jpg"],
      ["hero", "assets/images/backgrounds/hero-pacman.jpg"],
      ["pacman-right", "assets/images/characters/pacman-derecha.png"],
      ["pacman-left", "assets/images/characters/pacman-izquierda.png"],
      ["pacman-up", "assets/images/characters/pacman-arriba.png"],
      ["pacman-down", "assets/images/characters/pacman-abajo.png"],
      ["pacman-loss", "assets/images/characters/pacman-pierde.png"],
      ["pellet", "assets/images/puntos/copadelaliga.png"],
      ["powerPellet", "assets/images/puntos/libertadores.png"],
      ...this.ghostProfiles.map((ghost) => [ghost.club, ghost.asset])
    ].forEach(([key, src]) => this.loadAsset(key, src));

    this.ghostProfiles.forEach((ghost) => this.loadAsset(`${ghost.club}-vulnerable`, ghost.vulnerableAsset));
  },

  loadAsset(key, src) {
    // aca cargamos cada imagen y la dejamos lista para dibujar sin trabas.
    const image = new Image();
    this.assets[key] = image;
    this.assetReady[key] = false;
    image.onload = () => {
      if (this.shouldTrimAsset(key)) {
        this.spriteAssets[key] = this.trimTransparentSprite(image);
      } else {
        this.spriteAssets[key] = image;
      }
      this.assetReady[key] = true;
      this.render();
    };
    image.src = src;
  },

  shouldTrimAsset(key) {
    return [
      "pacman-right",
      "pacman-left",
      "pacman-up",
      "pacman-down",
      "pacman-loss",
      "pellet",
      "powerPellet"
    ].includes(key) || key.endsWith("-vulnerable") || this.ghostProfiles.some((ghost) => ghost.club === key);
  },

  trimTransparentSprite(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
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

};

