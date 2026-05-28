const UI = {
  views: {},
  init() {
    this.views = {
      auth: document.getElementById("authView"),
      menu: document.getElementById("menuView"),
      lobby: document.getElementById("lobbyView"),
      game: document.getElementById("gameView")
    };
    const savedTheme = localStorage.getItem("pacman_theme") || "dark";
    document.body.classList.toggle("dark", savedTheme === "dark");
    document.getElementById("themeToggle").addEventListener("click", () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("pacman_theme", document.body.classList.contains("dark") ? "dark" : "light");
    });
    document.getElementById("modalClose").addEventListener("click", () => this.closeModal());
  },
  show(viewName) {
    Object.values(this.views).forEach((view) => view.classList.add("hidden"));
    this.views[viewName].classList.remove("hidden");
  },
  message(id, text, isError = false) {
    const element = document.getElementById(id);
    element.textContent = text || "";
    element.style.color = isError ? "var(--danger)" : "var(--muted)";
  },
  openModal(html) {
    document.getElementById("modalContent").innerHTML = html;
    document.getElementById("modal").classList.remove("hidden");
  },
  closeModal() {
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("modalContent").innerHTML = "";
  },
  setMenuUser(user) {
    document.getElementById("userEmailLabel").textContent = user.email;
  },
  renderLobby(lobby, currentUser) {
    document.getElementById("lobbyCode").textContent = lobby.codigo;
    const pacman = lobby.jugadores.pacman ? lobby.jugadores.pacman.email : "Sin asignar";
    const ghosts = lobby.jugadores.fantasmas.length
      ? lobby.jugadores.fantasmas.map((ghost) => ghost.email).join(", ")
      : "Sin fantasmas";
    document.getElementById("lobbyInfo").innerHTML = `
      <div><strong>Pac-Man:</strong> ${pacman}</div>
      <div><strong>Fantasmas:</strong> ${ghosts}</div>
      <div><strong>Nivel inicial:</strong> ${lobby.nivelInicial}</div>
      <div><strong>Maximo fantasmas humanos:</strong> ${lobby.maxFantasmasHumanos}</div>
      <div><strong>Bots:</strong> ${lobby.allowBots ? "permitidos" : "desactivados"}</div>
      <div><strong>Estado:</strong> ${lobby.ready ? "listo para iniciar" : "esperando jugadores"}</div>
    `;
    document.getElementById("startRoomBtn").disabled = !(lobby.ready && currentUser && lobby.hostUserId === currentUser.id);
    document.getElementById("lobbyMessage").textContent = lobby.message;
  },
  updateHud(state, label) {
    document.getElementById("gameModeLabel").textContent = label || "partida";
    document.getElementById("gameTitle").textContent = state.levelName || `Nivel ${state.level}`;
    document.getElementById("scoreLabel").textContent = state.scorePacman || 0;
    document.getElementById("livesLabel").textContent = state.livesPacman ?? "-";
    document.getElementById("pelletsLabel").textContent = state.pelletsRemaining ?? 0;
    document.getElementById("gameMessage").textContent = state.message || "";
  }
};
