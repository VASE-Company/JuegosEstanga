document.addEventListener("DOMContentLoaded", () => {
  UI.init();
  Auth.init();
  PacmanGame.init();
  Multiplayer.init();

  if (Auth.user) {
    UI.setMenuUser(Auth.user);
    UI.show("menu");
    Rankings.load(Auth.user.email);
  } else {
    UI.show("auth");
  }

  document.getElementById("singlePlayerBtn").addEventListener("click", () => {
    UI.openModal(`
      <h2>Elegir rol</h2>
      <p class="muted">En ambos modos hay bots y score guardado al finalizar.</p>
      <div class="button-grid">
        <button id="playPacmanRole" type="button">Jugar como Pac-Man</button>
        <button id="playGhostRole" type="button" class="secondary">Jugar como Fantasma</button>
      </div>
    `);
    document.getElementById("playPacmanRole").addEventListener("click", () => {
      UI.closeModal();
      PacmanGame.startSingle("pacman");
    });
    document.getElementById("playGhostRole").addEventListener("click", () => {
      UI.closeModal();
      PacmanGame.startSingle("ghost");
    });
  });

  document.getElementById("createRoomBtn").addEventListener("click", () => {
    UI.openModal(`
      <h2>Crear sala</h2>
      <label>Nivel inicial</label>
      <select id="createLevel">
        <option value="1">Nivel 1</option>
        <option value="2">Nivel 2</option>
        <option value="3">Nivel 3</option>
        <option value="4">Nivel 4</option>
        <option value="5">Nivel 5</option>
      </select>
      <label>Tu rol</label>
      <select id="createRole">
        <option value="pacman">Pac-Man</option>
        <option value="ghost">Fantasma</option>
      </select>
      <label>Maximo fantasmas humanos</label>
      <select id="createMaxGhosts">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5" selected>5</option>
      </select>
      <label>
        <input id="createAllowBots" type="checkbox" checked style="width:auto"> Permitir bots para completar fantasmas
      </label>
      <button id="confirmCreateRoom" type="button">Crear partida</button>
    `);
    document.getElementById("confirmCreateRoom").addEventListener("click", () => {
      Multiplayer.createRoom({
        nivelInicial: Number(document.getElementById("createLevel").value),
        role: document.getElementById("createRole").value,
        maxFantasmasHumanos: Number(document.getElementById("createMaxGhosts").value),
        allowBots: document.getElementById("createAllowBots").checked
      });
    });
  });

  document.getElementById("joinRoomBtn").addEventListener("click", () => {
    UI.openModal(`
      <h2>Unirse a sala</h2>
      <label>Codigo</label>
      <input id="joinCode" maxlength="5" placeholder="K7A2P">
      <label>Rol</label>
      <select id="joinRole">
        <option value="ghost">Fantasma</option>
        <option value="pacman">Pac-Man</option>
      </select>
      <button id="confirmJoinRoom" type="button">Unirme</button>
    `);
    document.getElementById("confirmJoinRoom").addEventListener("click", () => {
      Multiplayer.joinRoom({
        codigo: document.getElementById("joinCode").value.trim().toUpperCase(),
        role: document.getElementById("joinRole").value
      });
    });
  });

  document.getElementById("startRoomBtn").addEventListener("click", () => Multiplayer.startRoom());
  document.getElementById("leaveLobbyBtn").addEventListener("click", () => Multiplayer.leaveLobby());
  document.getElementById("backToMenuBtn").addEventListener("click", () => {
    Multiplayer.abandonGame();
    PacmanGame.stop();
    UI.show("menu");
    if (Auth.user) Rankings.load(Auth.user.email);
  });
});
