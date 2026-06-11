const Multiplayer = {
  socket: null,
  currentLobby: null,

  init() {
    this.socket = io();
    // estos eventos mantienen la ui sincronizada con la sala y la partida en vivo
    this.socket.on("partida-creada-pacman", (lobby) => this.showLobby(lobby));
    this.socket.on("jugador-unido-pacman", (lobby) => this.showLobby(lobby));
    this.socket.on("lobby-actualizado-pacman", (lobby) => this.showLobby(lobby));
    this.socket.on("partida-iniciada-pacman", (state) => PacmanGame.startMultiplayer(state, state.codigo));
    this.socket.on("game-state-pacman", (state) => PacmanGame.applyServerState(state));
    this.socket.on("nivel-completado-pacman", (payload) => {
      PacmanAudio.playVictory();
      UI.message("gameMessage", `Nivel ${payload.level} completo. Entrando al nivel ${payload.nextLevel}.`);
    });
    this.socket.on("partida-finalizada-pacman", (state) => {
      PacmanGame.applyServerState(state);
      const userWon = state?.winner === "Pac-Man"
        ? Auth.user?.email && state?.pacman?.email === Auth.user.email
        : state?.winner === "Fantasmas"
          ? Boolean((state?.ghosts || []).some((ghost) => ghost.email === Auth.user?.email))
          : false;
      if (userWon) PacmanAudio.playVictory();
      Rankings.load(Auth.user.email);
    });
    this.socket.on("rival-desconectado-pacman", ({ message }) => {
      UI.message("lobbyMessage", message || "Un rival se desconecto.", true);
      UI.message("gameMessage", message || "Un rival se desconecto.", true);
      UI.toast(message || "Un jugador salió de la sala.", false);
    });
    this.socket.on("sala-cerrada-pacman", ({ message }) => {
      UI.toast(message || "Se ha cerrado la sala.", false);
    });
    this.socket.on("sala-reiniciada-pacman", ({ message }) => {
      UI.toast(message || "La sala se reinició.", false);
    });
    this.socket.on("error-partida", ({ message }) => {
      UI.message("lobbyMessage", message || "Error de partida.", true);
      UI.toast(message || "Error de partida.");
    });
    this.socket.on("rankings-actualizados", (data) => Rankings.render(data));
  },

  createRoom(config) {
    if (!Auth.user) return UI.toast("Debes iniciar sesion.");
    this.socket.emit("crear-partida-pacman", {
      ...config,
      userId: Auth.user.id,
      email: Auth.user.email,
      displayName: Auth.user.displayName,
      token: Auth.getToken()
    });
  },

  joinRoom(config) {
    if (!Auth.user) return UI.toast("Debes iniciar sesion.");
    this.socket.emit("unirse-partida-pacman", {
      ...config,
      userId: Auth.user.id,
      email: Auth.user.email,
      displayName: Auth.user.displayName,
      token: Auth.getToken()
    });
  },

  startRoom() {
    if (!this.currentLobby || !Auth.user) return;
    this.socket.emit("iniciar-partida-pacman", { codigo: this.currentLobby.codigo, userId: Auth.user.id, token: Auth.getToken() });
  },

  leaveLobby() {
    if (!this.currentLobby) return;
    UI.openModal(GameModals.buildLeaveLobbyConfirm());
    UI.renderIcons();
    const cancelBtn = document.getElementById("cancelLeaveLobbyBtn");
    const confirmBtn = document.getElementById("confirmLeaveLobbyBtn");
    if (cancelBtn) {
      cancelBtn.onclick = () => UI.closeModal();
    }
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const roomCode = this.currentLobby?.codigo;
        if (!roomCode) return;
        this.socket.emit("salir-lobby-pacman", { codigo: roomCode });
        UI.closeModal();
        UI.toast("Saliste de la sala.", false);
        this.currentLobby = null;
        UI.show("menu");
      };
    }
  },

  changeLobbyRole() {
    if (!this.currentLobby || !Auth.user) return;
    // acá se pide al server que mueva al usuario de pacman a fantasma, o al revés
    this.socket.emit("cambiar-rol-pacman", { codigo: this.currentLobby.codigo, userId: Auth.user.id, token: Auth.getToken() });
  },

  restartLobby() {
    if (!this.currentLobby || !Auth.user) return;
    // el reinicio queda del lado del server para no desordenar la sala entre dispositivos
    this.socket.emit("reiniciar-sala-pacman", { codigo: this.currentLobby.codigo, userId: Auth.user.id, token: Auth.getToken() });
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
    this.bindLobbyControls();
  },

  bindLobbyControls() {
    // después de cada render volvemos a enganchar los botones de la sala
    const switchRoleBtn = document.getElementById("switchRoleLobbyBtn");
    const restartBtn = document.getElementById("restartLobbyBtn");
    if (switchRoleBtn) {
      switchRoleBtn.onclick = () => this.changeLobbyRole();
    }
    if (restartBtn) {
      restartBtn.onclick = () => this.restartLobby();
    }
  }
};
