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
    UI.show("menu");
    Rankings.load(Auth.user.email);
  } else {
    window.location.href = "/";
    return;
  }

  bind("singlePlayerBtn", "click", () => {
    const characters = GameModals.getCharacters();
    let selectedIndex = 0;
    UI.openModal(GameModals.buildCharacterPicker());
    UI.renderIcons();
    const selectorImage = document.getElementById("selectorImage");
    const selectorName = document.getElementById("selectorName");
    const selectorDescription = document.getElementById("selectorDescription");
    const selectorPlayBtn = document.getElementById("selectorPlayBtn");
    const updateSelector = () => {
      const character = characters[selectedIndex];
      if (!character) return;
      if (selectorImage) {
        selectorImage.src = character.image;
        selectorImage.alt = character.name;
      }
      if (selectorName) selectorName.textContent = character.name;
      if (selectorDescription) selectorDescription.textContent = character.description;
    };
    const chooseCharacter = () => {
      const character = characters[selectedIndex];
      if (!character) return;
      UI.closeModal();
      PacmanGame.startSingle(character.role, character.character);
    };
    bind("characterPrev", "click", () => {
      selectedIndex = (selectedIndex - 1 + characters.length) % characters.length;
      updateSelector();
    });
    bind("characterNext", "click", () => {
      selectedIndex = (selectedIndex + 1) % characters.length;
      updateSelector();
    });
    bind("selectorPlayBtn", "click", chooseCharacter);
    updateSelector();
    UI.renderIcons();
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
    bind("confirmJoinRoom", "click", () => {
      Multiplayer.joinRoom({
        codigo: document.getElementById("joinCode").value.trim().toUpperCase(),
        role: document.getElementById("joinRole").value
      });
    });
  });

  bind("startRoomBtn", "click", () => Multiplayer.startRoom());
  bind("leaveLobbyBtn", "click", () => Multiplayer.leaveLobby());
  bind("backToMenuBtn", "click", () => {
    if (PacmanGame.mode === "singleplayer" && PacmanGame.state?.status === "finished") {
      PacmanGame.restartSingle();
      return;
    }
    Multiplayer.abandonGame();
    PacmanGame.stop();
    UI.show("menu");
    if (Auth.user) Rankings.load(Auth.user.email);
  });
});
