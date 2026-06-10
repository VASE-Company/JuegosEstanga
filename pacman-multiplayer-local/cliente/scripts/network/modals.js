const GameModals = {
  getCharacters() {
    return [
      {
        role: "pacman",
        character: "pacman",
        name: "Pac-Man",
        description: "El clásico protagonista",
        image: "assets/images/characters/pacman-derecha.png"
      },
      {
        role: "ghost",
        character: "boca",
        name: "Boca",
        description: "El fantasma más rápido",
        image: "assets/images/characters/bocafantasma.png",
        vulnerableImage: "assets/images/characters/bocafantasma-perseguido.png"
      },
      {
        role: "ghost",
        character: "independiente",
        name: "Independiente",
        description: "Velocidad media alta",
        image: "assets/images/characters/independientefantasma.png",
        vulnerableImage: "assets/images/characters/independientefantasma-perseguido.png"
      },
      {
        role: "ghost",
        character: "racing",
        name: "Racing",
        description: "Movimiento ágil",
        image: "assets/images/characters/racingfantasma.png",
        vulnerableImage: "assets/images/characters/racingfantasma-perseguido.png"
      },
      {
        role: "ghost",
        character: "sanlorenzo",
        name: "San Lorenzo",
        description: "El más lento y pesado",
        image: "assets/images/characters/sanlorenzofantasma.png",
        vulnerableImage: "assets/images/characters/sanlorenzofantasma-perseguido.png"
      }
    ];
  },

  buildCharacterPicker() {
    return `
      <div class="character-picker">
        <p class="eyebrow">selector de personajes</p>
        <h2>Elegí tu personaje</h2>
        <p class="muted">Deslizá para elegir. Los personajes ya seleccionados por otros jugadores no estarán disponibles.</p>
        <div class="character-stage">
          <div class="selector-card">
            <div class="selector-slide-container">
              <button id="characterPrev" class="selector-arrow-btn" type="button" aria-label="Anterior">
                <i data-lucide="chevron-left"></i>
              </button>
              <div class="selector-image-frame">
                <img id="selectorImage" src="" alt="">
              </div>
              <button id="characterNext" class="selector-arrow-btn" type="button" aria-label="Siguiente">
                <i data-lucide="chevron-right"></i>
              </button>
            </div>
            <div class="selector-details">
              <strong id="selectorName"></strong>
              <span id="selectorDescription"></span>
              <p id="selectorStatus" class="selector-status-text"></p>
            </div>
            <button id="selectorPlayBtn" class="selector-play" type="button">Jugar ahora</button>
          </div>
        </div>
      </div>
    `;
  },

  buildCreateRoom() {
    return `
      <div class="room-modal">
        <div class="room-modal-header">
          <div>
            <p class="eyebrow">multijugador</p>
            <h2><i data-lucide="shield-plus"></i><span>Crear sala</span></h2>
            <p class="muted">Armá una partida con estilo Monumental y elegí cómo arranca el encuentro.</p>
          </div>
          <div class="room-badge"><i data-lucide="sparkles"></i><span>Personalizada</span></div>
        </div>
        <div class="room-grid">
          <div class="room-field">
            <label for="createLevel"><i data-lucide="layers-3"></i><span>Nivel inicial</span></label>
            <select id="createLevel">
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
              <option value="3">Nivel 3</option>
              <option value="4">Nivel 4</option>
              <option value="5">Nivel 5</option>
            </select>
          </div>
          <div class="room-field">
            <label for="createRole"><i data-lucide="gamepad-2"></i><span>Tu rol</span></label>
            <select id="createRole">
              <option value="pacman">Pac-Man</option>
              <option value="ghost">Fantasma</option>
            </select>
          </div>
          <div class="room-field">
            <label for="createMaxGhosts"><i data-lucide="users"></i><span>Fantasmas humanos</span></label>
            <select id="createMaxGhosts">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5" selected>5</option>
            </select>
          </div>
          <label class="room-switch">
            <input id="createAllowBots" type="checkbox" checked>
            <span class="switch-track"></span>
            <span class="room-switch-copy">
              <strong><i data-lucide="bot"></i><span>Permitir bots</span></strong>
              <small>Completa la sala si faltan jugadores.</small>
            </span>
          </label>
        </div>
        <div class="room-footer">
          <button id="confirmCreateRoom" type="button"><i data-lucide="rocket"></i><span>Crear partida</span></button>
        </div>
      </div>
    `;
  },

  buildJoinRoom() {
    return `
      <div class="join-room-modal">
        <p class="eyebrow">multijugador</p>
        <h2>Unirse a sala</h2>
        <p class="muted">Ingresá el código de 5 letras para encontrar la partida y elegir tu personaje.</p>
        <div class="room-field">
          <label for="joinCode"><i data-lucide="key-round"></i><span>Código de sala</span></label>
          <div class="join-code-shell">
            <input id="joinCode" maxlength="5" placeholder="K7A2P" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <div class="join-code-badge">
              <i data-lucide="search-code"></i>
              <span>Listo para buscar</span>
            </div>
          </div>
        </div>
        <button id="confirmJoinRoom" class="confirm-join-btn" type="button">
          <i data-lucide="search"></i>
          <span>Buscar sala</span>
        </button>
        <p class="join-room-hint">Tip: no hace falta escribir espacios.</p>
      </div>
    `;
  },

  buildLeaveLobbyConfirm() {
    return `
      <div class="leave-lobby-modal">
        <p class="eyebrow">salir de la sala</p>
        <h2>¿Querés cerrar la sala?</h2>
        <p class="muted">Si sos el último jugador, la sala se borra. Si quedan otros, vos salís y el resto sigue igual.</p>
        <div class="leave-lobby-card">
          <i data-lucide="door-open"></i>
          <div>
            <strong>Confirmación rápida</strong>
            <span>Esto no corta la partida de los demás jugadores si todavía queda alguien adentro.</span>
          </div>
        </div>
        <div class="room-footer leave-lobby-actions">
          <button id="cancelLeaveLobbyBtn" type="button" class="secondary"><i data-lucide="x"></i><span>Cancelar</span></button>
          <button id="confirmLeaveLobbyBtn" type="button"><i data-lucide="log-out"></i><span>Salir</span></button>
        </div>
      </div>
    `;
  },

  buildHowToPlay() {
    return `
      <div class="help-modal">
        <p class="eyebrow">cómo jugar</p>
        <h2>Guía</h2>
        <div class="help-hero">
          <strong>Objetivo simple: comé todo, cuidá tus vidas y subí de nivel sin perder el ritmo.</strong>
        </div>
        <div class="help-grid">
          <section class="help-card">
            <h3>Objetivo</h3>
            <p>Comé todos los puntos, cuidá las vidas y terminá los niveles sin perder el ritmo.</p>
          </section>
          <section class="help-card">
            <h3>Controles</h3>
            <ul>
              <li>Teclado: flechas o WASD.</li>
              <li>Pausa: tecla <strong>P</strong> o espacio.</li>
              <li>Móvil: usá los botones <strong>Arriba</strong>, <strong>Izquierda</strong>, <strong>Abajo</strong> y <strong>Derecha</strong>.</li>
            </ul>
          </section>
          <section class="help-card">
            <h3>Estados</h3>
            <ul>
              <li><strong>Vidas</strong>: si llegan a 0, perdés la partida.</li>
              <li><strong>Puntaje</strong>: se suma en tiempo real y al final queda guardado.</li>
              <li><strong>Nivel</strong>: sube al limpiar el mapa o al avanzar con el botón.</li>
            </ul>
          </section>
          <section class="help-card">
            <h3>Multijugador</h3>
            <ul>
              <li>Pueden jugar desde una PC o desde distintos dispositivos en la misma red.</li>
              <li>El servidor sincroniza la partida y el puntaje de todos.</li>
              <li>El creador de la sala inicia cuando ya hay Pac-Man y al menos un fantasma.</li>
            </ul>
          </section>
        </div>
      </div>
    `;
  },

  buildProfile(user = {}, prefs = {}) {
    const displayName = prefs.displayName || user.displayName || Preferences.fallbackDisplayName(user.email || "");
    return `
      <div class="profile-modal">
        <p class="eyebrow">perfil</p>
        <h2>Tu jugador</h2>
        <div class="profile-modal-card">
          <div class="profile-avatar profile-modal-avatar">${String(displayName || "UE").slice(0, 2).toUpperCase()}</div>
          <div class="profile-modal-copy">
            <strong>${displayName}</strong>
            <span>${user.email || "Sin email"}</span>
          </div>
        </div>
        <div class="profile-info-grid">
          <div class="room-field">
            <label><i data-lucide="user"></i><span>Nombre visible</span></label>
            <p>${displayName}</p>
          </div>
          <div class="room-field">
            <label><i data-lucide="mail"></i><span>Email</span></label>
            <p>${user.email || "Sin email"}</p>
          </div>
        </div>
        <div class="room-footer profile-modal-actions">
          <button id="profileEditBtn" type="button" class="secondary"><i data-lucide="settings-2"></i><span>Cambiar perfil</span></button>
          <button id="profileLogoutBtn" type="button" class="danger"><i data-lucide="log-out"></i><span>Cerrar sesión</span></button>
        </div>
      </div>
    `;
  },

  buildRankings() {
    return `
      <div class="rankings-page">
        <div class="rankings-page-head">
          <div>
            <p class="eyebrow">rankings</p>
            <h2>Tu progreso</h2>
            <p class="muted">Top 3 personal y Top 10 general local en un solo lugar.</p>
          </div>
        </div>
        <div class="rankings-grid">
          <section class="ranking-panel">
            <h3><i data-lucide="medal"></i><span>Top 3 personal</span></h3>
            <ol id="personalRanking"></ol>
          </section>
          <section class="ranking-panel">
            <h3><i data-lucide="trophy"></i><span>Top 10 general local</span></h3>
            <ol id="generalRanking"></ol>
          </section>
        </div>
      </div>
    `;
  },

  buildPreferences(user = {}, prefs = {}) {
    const displayName = prefs.displayName || user.displayName || Preferences.fallbackDisplayName(user.email || "");
    const theme = prefs.theme === "light" ? "light" : "dark";
    const musicEnabled = prefs.musicEnabled !== false;
    return `
      <div class="prefs-modal">
        <p class="eyebrow">configuración</p>
        <h2>Preferencias de juego</h2>
        <div class="prefs-grid">
          <div class="room-field">
            <label for="prefsDisplayName"><i data-lucide="badge-user"></i><span>Nombre visible</span></label>
            <input id="prefsDisplayName" maxlength="24" value="${displayName}" placeholder="Tu nombre de juego" autocomplete="off">
          </div>
          <div class="room-field">
            <label for="prefsTheme"><i data-lucide="palette"></i><span>Tema</span></label>
            <select id="prefsTheme">
              <option value="dark" ${theme === "dark" ? "selected" : ""}>Oscuro</option>
              <option value="light" ${theme === "light" ? "selected" : ""}>Claro</option>
            </select>
          </div>
          <label class="room-switch">
            <input id="prefsMusicEnabled" type="checkbox" ${musicEnabled ? "checked" : ""}>
            <span class="switch-track"></span>
            <span class="room-switch-copy">
              <strong><i data-lucide="music-2"></i><span>Música activada</span></strong>
              <small>Podés apagarla sin perder el resto de la experiencia.</small>
            </span>
          </label>
        </div>
        <div class="room-footer">
          <button id="savePreferencesBtn" type="button"><i data-lucide="save"></i><span>Guardar</span></button>
        </div>
      </div>
    `;
  }
};
