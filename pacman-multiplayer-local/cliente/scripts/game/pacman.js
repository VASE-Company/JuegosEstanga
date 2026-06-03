var PacmanGame = window.PacmanGame || {
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
    { club: "boca", asset: "assets/images/characters/bocafantasma.png", speed: 1.35, wobble: 0.04 },
    { club: "independiente", asset: "assets/images/characters/independientefantasma.png", speed: 1.15, wobble: 0.07 },
    { club: "racing", asset: "assets/images/characters/racingfantasma.png", speed: 0.98, wobble: 0.1 },
    { club: "sanlorenzo", asset: "assets/images/characters/sanlorenzofantasma.png", speed: 0.84, wobble: 0.12 }
  ],
  init() {
    Object.assign(this, PacmanCore, PacmanFlow, PacmanMovement, PacmanRender);
    this.coreInit();
  }
};
Object.assign(PacmanGame, PacmanCore, PacmanFlow, PacmanMovement, PacmanRender);
window.PacmanGame = PacmanGame;

