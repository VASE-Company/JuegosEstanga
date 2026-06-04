document.addEventListener("DOMContentLoaded", () => {
  UI.init();
  Auth.init();
  PacmanAudio.init();
  PacmanGame.init();
  Multiplayer.init();
  const bind = (id, eventName, handler) => {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventName, handler);
  };

  if (Auth.user) {
    UI.setMenuUser(Auth.user);
    UI.playEntryTransition(() => {
      UI.show("menu");
      Rankings.load(Auth.user.email);
    });
  } else {
    window.location.href = "/";
    return;
  }

  const setupCharacterPicker = (mode, code = null, takenCharacters = []) => {
    const characters = GameModals.getCharacters();
    let selectedIndex = 0;
    
    UI.openModal(GameModals.buildCharacterPicker());
    UI.renderIcons();

    const selectorImage = document.getElementById("selectorImage");
    const selectorName = document.getElementById("selectorName");
    const selectorDescription = document.getElementById("selectorDescription");
    const selectorPlayBtn = document.getElementById("selectorPlayBtn");
    const selectorStatus = document.getElementById("selectorStatus");
    const cardElement = document.querySelector(".selector-card");

    const updateSelector = () => {
      const character = characters[selectedIndex];
      if (!character) return;

      if (selectorImage) {
        selectorImage.src = character.image;
        selectorImage.alt = character.name;
      }
      if (selectorName) selectorName.textContent = character.name;
      if (selectorDescription) selectorDescription.textContent = character.description;

      const isTaken = takenCharacters.includes(character.character);
      if (cardElement) {
        cardElement.classList.toggle("is-taken", isTaken);
      }
      
      if (selectorPlayBtn) {
        if (isTaken) {
          selectorPlayBtn.disabled = true;
          selectorPlayBtn.textContent = "No disponible";
        } else {
          selectorPlayBtn.disabled = false;
          selectorPlayBtn.textContent = "Jugar ahora";
        }
      }

      if (selectorStatus) {
        if (isTaken) {
          selectorStatus.textContent = "Otro jugador está usando este personaje";
          selectorStatus.style.color = "var(--danger)";
        } else {
          selectorStatus.textContent = "Personaje disponible";
          selectorStatus.style.color = "var(--success)";
        }
      }
    };

    bind("characterPrev", "click", () => {
      selectedIndex = (selectedIndex - 1 + characters.length) % characters.length;
      updateSelector();
    });
    bind("characterNext", "click", () => {
      selectedIndex = (selectedIndex + 1) % characters.length;
      updateSelector();
    });
    bind("selectorPlayBtn", "click", () => {
      const character = characters[selectedIndex];
      if (!character) return;
      if (takenCharacters.includes(character.character)) return;

      UI.closeModal();

      if (mode === "singleplayer") {
        PacmanGame.startSingle(character.role, character.character);
      } else {
        Multiplayer.joinRoom({
          codigo: code,
          role: character.role,
          character: character.character
        });
      }
    });

    updateSelector();
    UI.renderIcons();
  };

  bind("singlePlayerBtn", "click", () => {
    setupCharacterPicker("singleplayer");
  });

  bind("createRoomBtn", "click", () => {
    UI.openModal(GameModals.buildCreateRoom());
    UI.renderIcons();
    bind("confirmCreateRoom", "click", () => {
      Multiplayer.createRoom({
        nivelInicial: Number(document.getElementById("createLevel").value),
        role: document.getElementById("createRole").value,
        maxFantasmasHumanos: Number(document.getElementById("createMaxGhosts").value),
        allowBots: document.getElementById("createAllowBots").checked
      });
    });
  });

  bind("joinRoomBtn", "click", () => {
    UI.openModal(GameModals.buildJoinRoom());
    UI.renderIcons();
    
    bind("confirmJoinRoom", "click", async () => {
      const codeInput = document.getElementById("joinCode");
      const code = codeInput ? codeInput.value.trim().toUpperCase() : "";
      if (!code) {
        UI.toast("Por favor ingresa un código de sala.");
        return;
      }
      
      try {
        const res = await fetch(`/api/rooms/check?codigo=${encodeURIComponent(code)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          UI.toast(errData.error || "La sala no existe o no se puede unir.");
          return;
        }
        const data = await res.json();
        setupCharacterPicker("multiplayer", code, data.takenCharacters || []);
      } catch (err) {
        console.error(err);
        UI.toast("Error al verificar la sala.");
      }
    });
  });

  bind("startRoomBtn", "click", () => Multiplayer.startRoom());
  bind("leaveLobbyBtn", "click", () => Multiplayer.leaveLobby());
  bind("nextLevelBtn", "click", () => {
    PacmanGame.advancePendingLevel();
  });
  bind("restartLevelBtn", "click", () => {
    PacmanGame.restartSingle();
  });
  bind("backToMenuBtn", "click", () => {
    Multiplayer.abandonGame();
    PacmanGame.stop();
    UI.show("menu");
    if (Auth.user) Rankings.load(Auth.user.email);
  });
});
