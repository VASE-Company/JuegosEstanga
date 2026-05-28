const Multiplayer = {
  socket: null,
  currentLobby: null,

  init() {
    this.socket = io();
    this.socket.on("partida-creada-pacman", (lobby) => this.showLobby(lobby));
    this.socket.on("jugador-unido-pacman", (lobby) => this.showLobby(lobby));
    this.socket.on("lobby-actualizado-pacman", (lobby) => this.showLobby(lobby));
    this.socket.on("partida-iniciada-pacman", (state) => PacmanGame.startMultiplayer(state, state.codigo));
    this.socket.on("game-state-pacman", (state) => PacmanGame.applyServerState(state));
    this.socket.on("nivel-completado-pacman", (payload) => {
      UI.message("gameMessage", `Nivel ${payload.level} completo. Entrando al nivel ${payload.nextLevel}.`);
    });
    this.socket.on("partida-finalizada-pacman", (state) => {
      PacmanGame.applyServerState(state);
      Rankings.load(Auth.user.email);
    });
    this.socket.on("rival-desconectado-pacman", ({ message }) => {
      UI.message("lobbyMessage", message || "Un rival se desconecto.", true);
      UI.message("gameMessage", message || "Un rival se desconecto.", true);
    });
    this.socket.on("error-partida", ({ message }) => {
      UI.message("lobbyMessage", message || "Error de partida.", true);
      alert(message || "Error de partida.");
    });
    this.socket.on("rankings-actualizados", (data) => Rankings.render(data));
  },

  createRoom(config) {
    if (!Auth.user) return alert("Debes iniciar sesion.");
    this.socket.emit("crear-partida-pacman", { ...config, userId: Auth.user.id, email: Auth.user.email });
  },

  joinRoom(config) {
    if (!Auth.user) return alert("Debes iniciar sesion.");
    this.socket.emit("unirse-partida-pacman", { ...config, userId: Auth.user.id, email: Auth.user.email });
  },

  startRoom() {
    if (!this.currentLobby || !Auth.user) return;
    this.socket.emit("iniciar-partida-pacman", { codigo: this.currentLobby.codigo, userId: Auth.user.id });
  },

  leaveLobby() {
    if (!this.currentLobby) return;
    this.socket.emit("salir-lobby-pacman", { codigo: this.currentLobby.codigo });
    this.currentLobby = null;
    UI.show("menu");
  },

  abandonGame() {
    if (PacmanGame.multiplayerCode) {
      this.socket.emit("abandonar-partida-pacman", { codigo: PacmanGame.multiplayerCode });
    }
  },

  sendInput(codigo, direction) {
    this.socket.emit("input-pacman", { codigo, direction });
  },

  showLobby(lobby) {
    this.currentLobby = lobby;
    UI.closeModal();
    UI.show("lobby");
    UI.renderLobby(lobby, Auth.user);
  }
};
