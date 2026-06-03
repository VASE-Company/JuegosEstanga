const UI = {
  views: {},
  init() {
    this.views = {
      auth: document.getElementById("authView"),
      menu: document.getElementById("menuView"),
      lobby: document.getElementById("lobbyView"),
      game: document.getElementById("gameView")
    };
    const bind = (id, eventName, handler) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener(eventName, handler);
    };
    document.body.classList.add("dark");
    bind("modalClose", "click", () => this.closeModal());
    this.renderIcons();
  },
  show(viewName) {
    Object.values(this.views).forEach((view) => view.classList.add("hidden"));
    this.views[viewName].classList.remove("hidden");
    document.body.classList.toggle("menu-bg", viewName === "menu");
    document.body.classList.toggle("game-mode", viewName === "game");
    this.renderIcons();
  },
  message(id, text, isError = false) {
    const element = document.getElementById(id);
    element.textContent = text || "";
    element.style.color = isError ? "var(--danger)" : "var(--muted)";
  },
  openModal(html) {
    document.getElementById("modalContent").innerHTML = html;
    document.getElementById("modal").classList.remove("hidden");
    this.renderIcons();
  },
  closeModal() {
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("modalContent").innerHTML = "";
  },
  setLoading(isLoading, message = "Preparando el estadio y los personajes...") {
    const overlay = document.getElementById("gameLoadingOverlay");
    if (!overlay) return;
    const text = overlay.querySelector(".game-loading-card span");
    if (text) text.textContent = message;
    overlay.classList.toggle("hidden", !isLoading);
    this.renderIcons();
  },
  setMenuUser(user) {
    document.getElementById("userEmailLabel").textContent = user.email;
    const initials = String(user.email || "")
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "UE";
    const initialsLabel = document.getElementById("userInitialsLabel");
    if (initialsLabel) initialsLabel.textContent = initials;
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
    document.getElementById("gameTitle").textContent = state.status === "finished"
      ? `Resultado ${state.levelName || `Nivel ${state.level}`}`
      : state.levelName || `Nivel ${state.level}`;
    const hudCard = document.querySelector(".hud-card");
    const hudOverlay = document.querySelector(".hud-overlay");
    const isResult = state.status !== "playing";
    if (hudCard) hudCard.classList.toggle("is-result", isResult);
    if (hudOverlay) hudOverlay.classList.toggle("is-result", isResult);
    const resultButton = document.getElementById("backToMenuBtn");
    if (resultButton) {
      const isSingleplayerResult = isResult && window.PacmanGame?.mode === "singleplayer";
      resultButton.textContent = isSingleplayerResult ? "Reiniciar partida" : "Volver al menu";
    }
    const resultVisual = document.getElementById("resultVisual");
    const resultVisualImage = document.getElementById("resultVisualImage");
    const isLoss = isResult && String(state.result || "").startsWith("perdi");
    if (resultVisual) resultVisual.classList.toggle("hidden", !isLoss);
    if (resultVisualImage) {
      resultVisualImage.src = "assets/images/characters/pacman-pierde.png";
      resultVisualImage.alt = isLoss ? "Pac-Man perdiendo vida" : "";
    }
    document.getElementById("scoreLabel").textContent = state.scorePacman || 0;
    const lives = Math.max(0, state.livesPacman ?? 0);
    const heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.03L12 21.35Z";
    const hearts = Array.from({ length: 3 }, (_, index) => {
      const active = index < lives;
      const clipId = `heartClip${index}`;
      return `
        <svg class="life-heart ${active ? "is-active" : "is-empty"}" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <clipPath id="${clipId}">
              <path d="${heartPath}"></path>
            </clipPath>
          </defs>
          <path class="heart-base" d="${heartPath}"></path>
          ${active ? `<g clip-path="url(#${clipId})"><rect class="heart-band" x="-3" y="9.3" width="30" height="5.2" transform="rotate(-27 12 12)"></rect></g>` : ""}
        </svg>
      `;
    }).join("");
    document.getElementById("livesLabel").innerHTML = `<span class="lives-hearts" aria-label="Vidas restantes">${hearts}</span>`;
    document.getElementById("pelletsLabel").textContent = state.pelletsRemaining ?? 0;
    document.getElementById("gameMessage").textContent = state.message || "";
    this.renderIcons();
  },
  renderIcons() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }
};

