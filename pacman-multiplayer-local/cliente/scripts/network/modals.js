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
        image: "assets/images/characters/bocafantasma.png"
      },
      {
        role: "ghost",
        character: "independiente",
        name: "Independiente",
        description: "Velocidad media alta",
        image: "assets/images/characters/independientefantasma.png"
      },
      {
        role: "ghost",
        character: "racing",
        name: "Racing",
        description: "Movimiento ágil",
        image: "assets/images/characters/racingfantasma.png"
      },
      {
        role: "ghost",
        character: "sanlorenzo",
        name: "San Lorenzo",
        description: "El más lento y pesado",
        image: "assets/images/characters/sanlorenzofantasma.png"
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
  }
};