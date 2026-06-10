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
    Preferences.apply();
    this.ensureToastRoot();
    bind("menuNavToggle", "click", () => {
      const navbar = document.querySelector(".menu-navbar");
      if (!navbar) return;
      const nextState = !navbar.classList.contains("is-open");
      navbar.classList.toggle("is-open", nextState);
      const toggle = document.getElementById("menuNavToggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(nextState));
        toggle.setAttribute("aria-label", nextState ? "Cerrar menú" : "Abrir menú");
      }
    });
    document.querySelectorAll("#menuNavActions button, #menuNavActions a").forEach((element) => {
      element.addEventListener("click", () => {
        const navbar = document.querySelector(".menu-navbar");
        const toggle = document.getElementById("menuNavToggle");
        if (navbar) navbar.classList.remove("is-open");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Abrir menú");
        }
      });
    });
    document.addEventListener("click", (event) => {
      const navbar = document.querySelector(".menu-navbar");
      const toggle = document.getElementById("menuNavToggle");
      const actions = document.getElementById("menuNavActions");
      if (!navbar || !toggle || !actions) return;
      if (!navbar.classList.contains("is-open")) return;
      if (navbar.contains(event.target)) return;
      navbar.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menú");
    });
    bind("modalClose", "click", () => this.closeModal());
    bind("gameMenuToggle", "click", () => {
      const menu = document.getElementById("gameActionsMenu");
      if (!menu || menu.classList.contains("hidden")) return;
      const nextState = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", nextState);
      const toggle = document.getElementById("gameMenuToggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(nextState));
      if (nextState && window.PacmanGame?.mode === "singleplayer" && !window.PacmanGame.paused) {
        window.PacmanGame.togglePause();
      }
    });
    document.querySelectorAll("#gameActionsMenu button").forEach((element) => {
      element.addEventListener("click", () => this.setGameMenuOpen(false));
    });
    bind("scrollTopBtn", "click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const updateScrollButton = () => {
      const scrollButton = document.getElementById("scrollTopBtn");
      if (!scrollButton) return;
      scrollButton.classList.toggle("hidden", window.scrollY < 280);
    };
    window.addEventListener("scroll", updateScrollButton, { passive: true });
    window.addEventListener("resize", updateScrollButton);
    updateScrollButton();
    document.addEventListener("click", (event) => {
      const shell = document.querySelector(".hud-actions-shell");
      const toggle = document.getElementById("gameMenuToggle");
      const menu = document.getElementById("gameActionsMenu");
      if (!shell || !toggle || !menu) return;
      if (menu.classList.contains("hidden") || !menu.classList.contains("is-open")) return;
      if (shell.contains(event.target)) return;
      this.setGameMenuOpen(false);
    });
    this.renderIcons();
  },
  setGameMenuOpen(nextState) {
    const menu = document.getElementById("gameActionsMenu");
    const toggle = document.getElementById("gameMenuToggle");
    if (!menu || menu.classList.contains("hidden")) return;
    menu.classList.toggle("is-open", Boolean(nextState));
    if (toggle) toggle.setAttribute("aria-expanded", String(Boolean(nextState)));
  },
  show(viewName) {
    Object.values(this.views).forEach((view) => view.classList.add("hidden"));
    this.views[viewName].classList.remove("hidden");
    document.body.classList.toggle("menu-bg", viewName === "menu");
    document.body.classList.toggle("game-mode", viewName === "game");
    const gameMenu = document.getElementById("gameActionsMenu");
    const gameMenuToggle = document.getElementById("gameMenuToggle");
    const menuNavbar = document.querySelector(".menu-navbar");
    const menuNavToggle = document.getElementById("menuNavToggle");
    if (gameMenu) gameMenu.classList.remove("is-open");
    if (gameMenuToggle) gameMenuToggle.setAttribute("aria-expanded", "false");
    if (menuNavbar) menuNavbar.classList.remove("is-open");
    if (menuNavToggle) {
      menuNavToggle.setAttribute("aria-expanded", "false");
      menuNavToggle.setAttribute("aria-label", "Abrir menú");
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
    const displayName = user.displayName || user.name || Preferences.fallbackDisplayName(user.email);
    const nameLabel = document.getElementById("userNameLabel");
    const emailLabel = document.getElementById("userEmailLabel");
    if (nameLabel) nameLabel.textContent = displayName;
    if (emailLabel) emailLabel.textContent = user.email;
    const initials = String(displayName || user.email || "")
      .split("@")[0]
      .split(/[._-\s]/)
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
    // pinta la sala con el estado real del servidor, así no queda nada a ojo del cliente
    document.getElementById("lobbyCode").textContent = lobby.codigo;
    const playerLabel = (player, fallback) => player ? (player.displayName || player.name || player.email || fallback) : fallback;
    const isHost = Boolean(currentUser && lobby.hostUserId === currentUser.id);
    const pacman = lobby.jugadores.pacman;
    const ghosts = lobby.jugadores.fantasmas || [];
    const isWaiting = !lobby.ready;
    const connectedGhosts = ghosts.length;
    const maxGhosts = Number(lobby.maxFantasmasHumanos || 0);
    const emptySlots = Math.max(0, maxGhosts - connectedGhosts);
    const ghostCards = ghosts.length
      ? ghosts.map((ghost, index) => `
        <article class="lobby-member-card lobby-member-ghost">
          <div class="lobby-member-avatar">${String(playerLabel(ghost, "GF")).slice(0, 2).toUpperCase()}</div>
          <div class="lobby-member-copy">
            <p class="eyebrow">Fantasma ${index + 1}</p>
            <strong>${playerLabel(ghost, "Fantasma")}</strong>
            <span>${ghost.character || "boca"}</span>
          </div>
        </article>
      `).join("")
      : `<div class="lobby-empty-state">Todavía no se unieron fantasmas.</div>`;
    const emptyGhostSlots = Array.from({ length: emptySlots }, (_, index) => `
      <article class="lobby-member-card lobby-member-empty">
        <div class="lobby-member-avatar is-empty">${index + 1}</div>
        <div class="lobby-member-copy">
          <p class="eyebrow">Espacio libre</p>
          <strong>Fantasma disponible</strong>
          <span>Esperando jugador</span>
        </div>
      </article>
    `).join("");
    document.getElementById("lobbyInfo").innerHTML = `
      <section class="lobby-status-banner ${isWaiting ? "is-waiting" : "is-ready"}">
        <div>
          <p class="lobby-kicker">${isWaiting ? "Sala de espera" : "Sala lista"}</p>
          <strong>${isWaiting ? "Esperando al resto del equipo" : "Ya puede empezar la partida"}</strong>
        </div>
        <span class="lobby-status-pill">${isWaiting ? "En pausa" : "Lista para jugar"}</span>
      </section>
      <section class="lobby-roster">
        <article class="lobby-member-card lobby-member-main">
          <div class="lobby-member-avatar lobby-avatar-main">${String(playerLabel(pacman, "PM")).slice(0, 2).toUpperCase()}</div>
          <div class="lobby-member-copy">
            <p class="eyebrow">Pac-Man</p>
            <strong>${playerLabel(pacman, "Sin asignar")}</strong>
            <span>${pacman ? (pacman.character || "pacman") : "Esperando jugador"}</span>
          </div>
        </article>
        <div class="lobby-ghosts">
          <div class="lobby-section-head">
            <p class="eyebrow">Fantasmas</p>
            <span class="lobby-count">${connectedGhosts}${maxGhosts ? ` / ${maxGhosts}` : ""}</span>
          </div>
          <div class="lobby-ghost-grid">
            ${ghostCards}
            ${emptyGhostSlots}
          </div>
        </div>
      </section>
      <section class="lobby-meta-grid">
        <div class="lobby-meta-card"><span>Nivel inicial</span><strong>${lobby.nivelInicial}</strong></div>
        <div class="lobby-meta-card"><span>Bots</span><strong>${lobby.allowBots ? "Permitidos" : "Desactivados"}</strong></div>
        <div class="lobby-meta-card"><span>Estado</span><strong>${lobby.ready ? "Listo" : "Esperando"}</strong></div>
        <div class="lobby-meta-card"><span>Rol activo</span><strong>${currentUser && pacman && pacman.userId === currentUser.id ? "Pac-Man" : "Fantasma"}</strong></div>
      </section>
      <section class="lobby-actions-row">
        <button id="switchRoleLobbyBtn" type="button" class="secondary lobby-action-btn lobby-action-switch" ${currentUser ? "" : "disabled"}>
          <i data-lucide="refresh-cw"></i>
          <span>Cambiar mi rol</span>
        </button>
        ${isHost ? `
          <button id="restartLobbyBtn" type="button" class="secondary lobby-action-btn lobby-action-restart">
            <i data-lucide="rotate-ccw"></i>
            <span>Reiniciar sala</span>
          </button>
        ` : ""}
      </section>
    `;
    const startButton = document.getElementById("startRoomBtn");
    if (startButton) {
      startButton.disabled = !(lobby.ready && currentUser && lobby.hostUserId === currentUser.id);
      startButton.textContent = "Iniciar partida";
    }
    document.getElementById("lobbyMessage").textContent = lobby.message || (isWaiting ? "Falta al menos un fantasma." : "");
  },
  updateTheme() {
    Preferences.apply();
  },
  updateHud(state, label) {
    // este hud acompaña la partida y también arma la pantalla final cuando se termina el nivel
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
          ? (state.playerCharacterDefeatImage || "assets/images/characters/pacman-pierde.png")
          : (state.playerCharacterVulnerableImage || "assets/images/backgrounds/hero-pacman.jpg");
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
    const levelLabel = document.getElementById("levelLabel");
    if (levelLabel) levelLabel.textContent = state.level ?? 1;
    const resultLevelLabel = document.getElementById("resultLevelLabel");
    if (resultLevelLabel) resultLevelLabel.textContent = state.level ?? 1;
    const resultLevelStat = document.getElementById("resultLevelStat");
    if (resultLevelStat) resultLevelStat.classList.toggle("hidden", !isResult);
    // las vidas se muestran con corazones para que se entienda rápido incluso en celu
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
    const gameMenuToggle = document.getElementById("gameMenuToggle");
    const gameActionsMenu = document.getElementById("gameActionsMenu");
    if (pauseButton) pauseButton.classList.toggle("hidden", isResult);
    if (nextLevelButton) nextLevelButton.classList.toggle("hidden", !(isResult && state.resultType === "victory" && state.pendingNextLevel));
    if (restartButton) restartButton.classList.toggle("hidden", !(isResult && state.resultType === "defeat" && state.playerRole === "pacman"));
    if (exitButton) exitButton.classList.toggle("hidden", false);
    if (gameMenuToggle) gameMenuToggle.classList.toggle("hidden", isResult);
    if (gameActionsMenu) {
      gameActionsMenu.classList.toggle("hidden", false);
      if (isResult) {
        gameActionsMenu.classList.remove("is-open");
      }
    }
    if (gameMenuToggle && isResult) gameMenuToggle.setAttribute("aria-expanded", "false");
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

