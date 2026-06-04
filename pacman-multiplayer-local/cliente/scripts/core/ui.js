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
    this.ensureToastRoot();
    bind("modalClose", "click", () => this.closeModal());
    bind("menuNavToggle", "click", () => {
      const navbar = document.querySelector(".menu-navbar");
      if (!navbar) return;
      const nextState = !navbar.classList.contains("is-open");
      navbar.classList.toggle("is-open", nextState);
      const toggle = document.getElementById("menuNavToggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(nextState));
    });
    document.querySelectorAll(".menu-nav-actions a, .menu-nav-actions button").forEach((element) => {
      element.addEventListener("click", () => {
        const navbar = document.querySelector(".menu-navbar");
        const toggle = document.getElementById("menuNavToggle");
        if (navbar) navbar.classList.remove("is-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });
    this.renderIcons();
  },
  show(viewName) {
    Object.values(this.views).forEach((view) => view.classList.add("hidden"));
    this.views[viewName].classList.remove("hidden");
    document.body.classList.toggle("menu-bg", viewName === "menu");
    document.body.classList.toggle("game-mode", viewName === "game");
    if (viewName !== "menu") {
      const navbar = document.querySelector(".menu-navbar");
      const toggle = document.getElementById("menuNavToggle");
      if (navbar) navbar.classList.remove("is-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
    this.renderIcons();
  },
  message(id, text, isError = false) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = text || "";
    element.style.color = isError ? "var(--danger)" : "var(--muted)";
  },
  ensureToastRoot() {
    let root = document.getElementById("toastRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "toastRoot";
      root.className = "toast-root";
      root.setAttribute("aria-live", "polite");
      root.setAttribute("aria-atomic", "true");
      document.body.appendChild(root);
    }
    return root;
  },
  toast(text, isError = true) {
    if (!text) return;
    const root = this.ensureToastRoot();
    const toast = document.createElement("div");
    toast.className = `toast ${isError ? "is-error" : "is-success"}`;
    toast.setAttribute("role", "status");
    toast.textContent = text;
    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 3200);
  },
  playEntryTransition(onComplete) {
    const shouldPlay = sessionStorage.getItem("pacman_entry_intro") === "1";
    if (!shouldPlay) {
      if (onComplete) onComplete();
      return;
    }
    sessionStorage.removeItem("pacman_entry_intro");
    const overlay = document.getElementById("entryTransition");
    if (!overlay) {
      if (onComplete) onComplete();
      return;
    }
    document.body.classList.add("entry-transition-active");
    const hero = overlay.querySelector(".entry-transition-hero");
    const finish = () => {
      overlay.classList.remove("is-visible", "is-animating");
      overlay.classList.add("hidden");
      document.body.classList.remove("entry-transition-active");
      if (onComplete) onComplete();
    };
    overlay.classList.remove("hidden");
    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
    });
    let done = false;
    const holdTimeoutId = window.setTimeout(() => {
      if (done) return;
      overlay.classList.add("is-animating");
    }, 880);
    const timeoutId = window.setTimeout(() => {
      if (done) return;
      done = true;
      window.clearTimeout(holdTimeoutId);
      finish();
    }, 2800);
    if (hero) {
      const handleEnd = (event) => {
        if (event.target !== hero || done) return;
        done = true;
        window.clearTimeout(holdTimeoutId);
        window.clearTimeout(timeoutId);
        hero.removeEventListener("transitionend", handleEnd);
        finish();
      };
      hero.addEventListener("transitionend", handleEnd);
    }
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
    overlay.classList.toggle("is-visible", isLoading);
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
    const isWaiting = !lobby.ready;
    const connectedGhosts = lobby.jugadores.fantasmas.length;
    const maxGhosts = Number(lobby.maxFantasmasHumanos || 0);
    document.getElementById("lobbyInfo").innerHTML = `
      <div class="lobby-status ${isWaiting ? "is-waiting" : "is-ready"}">
        <strong>${isWaiting ? "Sala de espera" : "Sala lista para empezar"}</strong>
        <span>${isWaiting ? "Quedate acá hasta que se unan los demás." : "Ya pueden iniciar la partida."}</span>
      </div>
      <div><strong>Pac-Man:</strong> ${pacman}</div>
      <div><strong>Fantasmas:</strong> ${ghosts}</div>
      <div><strong>Fantasmas conectados:</strong> ${connectedGhosts}${maxGhosts ? ` / ${maxGhosts}` : ""}</div>
      <div><strong>Nivel inicial:</strong> ${lobby.nivelInicial}</div>
      <div><strong>Maximo fantasmas humanos:</strong> ${lobby.maxFantasmasHumanos}</div>
      <div><strong>Bots:</strong> ${lobby.allowBots ? "permitidos" : "desactivados"}</div>
      <div><strong>Estado:</strong> ${lobby.ready ? "listo para iniciar" : "esperando jugadores"}</div>
    `;
    document.getElementById("startRoomBtn").disabled = !(lobby.ready && currentUser && lobby.hostUserId === currentUser.id);
    document.getElementById("lobbyMessage").textContent = lobby.message || (isWaiting ? "Sala de espera activa." : "");
  },
  updateHud(state, label) {
    const gameScene = document.querySelector(".game-scene");
    const isResult = state.status !== "playing";
    const hudCard = document.querySelector(".hud-card");
    const hudOverlay = document.querySelector(".hud-overlay");
    if (gameScene) gameScene.classList.toggle("is-result", isResult);
    if (hudCard) hudCard.classList.toggle("is-result", isResult);
    if (hudOverlay) hudOverlay.classList.toggle("is-result", isResult);
    const resultVisual = document.getElementById("resultVisual");
    const resultVisualImage = document.getElementById("resultVisualImage");
    const isDefeat = isResult && state.resultType === "defeat";
    const isVictory = isResult && state.resultType === "victory";
    if (resultVisual) resultVisual.classList.toggle("hidden", !(isDefeat || isVictory));
    if (resultVisualImage) {
      let resultImage = "assets/images/backgrounds/hero-pacman.jpg";
      let resultAlt = "Pantalla de resultado";
      if (state.resultType === "defeat") {
        resultImage = state.playerRole === "pacman"
          ? "assets/images/characters/pacman-pierde.png"
          : state.playerCharacter && state.playerCharacter !== "pacman"
            ? `assets/images/characters/${state.playerCharacter}fantasma-perseguido.png`
            : "assets/images/backgrounds/hero-pacman.jpg";
        resultAlt = state.playerRole === "pacman" ? "Pac-Man derrotado" : "Fantasma perseguido";
      } else if (state.resultType === "victory") {
        resultImage = state.pendingNextLevel
          ? "assets/images/characters/pacman-derecha.png"
          : "assets/images/backgrounds/hero-pacman.jpg";
        resultAlt = state.pendingNextLevel ? "Pac-Man avanzando al siguiente nivel" : "Pac-Man celebrando la victoria";
      }
      resultVisualImage.src = resultImage;
      resultVisualImage.alt = resultAlt;
    }
    const scoreValue = state.playerRole === "ghost"
      ? (state.scoreGhost ?? state.scorePacman ?? 0)
      : (state.scorePacman || 0);
    document.getElementById("scoreLabel").textContent = scoreValue;
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
    const pauseButton = document.getElementById("pauseBtn");
    const nextLevelButton = document.getElementById("nextLevelBtn");
    const restartButton = document.getElementById("restartLevelBtn");
    const exitButton = document.getElementById("backToMenuBtn");
    if (pauseButton) pauseButton.classList.toggle("hidden", isResult);
    if (nextLevelButton) nextLevelButton.classList.toggle("hidden", !(isResult && state.resultType === "victory" && state.pendingNextLevel));
    if (restartButton) restartButton.classList.toggle("hidden", !(isResult && state.resultType === "defeat" && state.playerRole === "pacman"));
    if (exitButton) exitButton.classList.toggle("hidden", false);
    const gameMessage = document.getElementById("gameMessage");
    if (gameMessage) {
      const message = isResult
        ? (state.message ||
          (state.resultType === "defeat"
            ? "Perdiste."
            : state.pendingNextLevel
              ? "Pasaste al siguiente nivel."
              : "Ganaste."))
        : (state.message || "");
      gameMessage.textContent = message;
    }
    this.renderIcons();
  },
  renderIcons() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }
};

