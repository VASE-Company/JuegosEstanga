(function () {
  const sessionKey = "arcade_user";

  const readSession = () => {
    try {
      return JSON.parse(localStorage.getItem(sessionKey) || "{}");
    } catch {
      return {};
    }
  };

  const session = readSession();
  const user = session.user || null;

  if (!user?.email || !session?.token) {
    window.location.href = "/pacman/";
    return;
  }

  Preferences.apply();

  const displayName = user.displayName || Preferences.fallbackDisplayName(user.email);
  const initials = String(displayName || user.email || "")
    .split("@")[0]
    .split(/[._-\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "UE";

  document.getElementById("rankingsUserInitials").textContent = initials;
  document.getElementById("rankingsUserName").textContent = displayName;
  document.getElementById("rankingsUserEmail").textContent = user.email;

  const openHowToPlay = () => {
    UI.openModal(GameModals.buildHowToPlay());
    UI.renderIcons();
  };

  const openPreferences = () => {
    UI.openModal(GameModals.buildPreferences(user, Preferences.get()));
    UI.renderIcons();
    const saveButton = document.getElementById("savePreferencesBtn");
    saveButton?.addEventListener("click", () => {
      const displayNameInput = document.getElementById("prefsDisplayName");
      const themeInput = document.getElementById("prefsTheme");
      const musicInput = document.getElementById("prefsMusicEnabled");
      const cleanName = Preferences.cleanDisplayName(displayNameInput?.value || "");
      if (cleanName.length < 2) {
        UI.toast("El nombre visible debe tener al menos 2 caracteres.");
        return;
      }
      Preferences.save({
        displayName: cleanName,
        theme: themeInput?.value || "dark",
        musicEnabled: Boolean(musicInput?.checked)
      });
      const updatedSession = {
        ...session,
        user: {
          ...user,
          displayName: cleanName
        }
      };
      localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
      UI.toast("Preferencias guardadas.", false);
      UI.closeModal();
      window.location.reload();
    });
  };

  document.getElementById("howToPlayBtn")?.addEventListener("click", openHowToPlay);
  document.getElementById("preferencesBtn")?.addEventListener("click", openPreferences);

  const navToggle = document.getElementById("menuNavToggle");
  const nav = document.querySelector(".menu-navbar");
  const navActions = document.getElementById("menuNavActions");

  const closeNav = () => {
    if (!nav || !navToggle || !navActions) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menú");
  };

  navToggle?.addEventListener("click", () => {
    if (!nav) return;
    const nextState = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", nextState);
    navToggle.setAttribute("aria-expanded", String(nextState));
    navToggle.setAttribute("aria-label", nextState ? "Cerrar menú" : "Abrir menú");
  });

  document.querySelectorAll("#menuNavActions button, #menuNavActions a").forEach((element) => {
    element.addEventListener("click", closeNav);
  });

  document.addEventListener("click", (event) => {
    if (!nav || !navToggle || !navActions) return;
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(event.target)) return;
    closeNav();
  });

  const logout = async () => {
    if (session.token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` }
      }).catch(() => {});
    }
    localStorage.removeItem(sessionKey);
    window.location.href = "/pacman/";
  };

  const refresh = async () => {
    try {
      await Rankings.load(user.email);
    } catch {
      const personal = document.getElementById("personalRanking");
      const general = document.getElementById("generalRanking");
      if (personal) personal.innerHTML = "<li>No se pudieron cargar los rankings.</li>";
      if (general) general.innerHTML = "<li>No se pudieron cargar los rankings.</li>";
    }
    window.lucide?.createIcons?.();
  };

  document.getElementById("logoutRankingsBtn")?.addEventListener("click", logout);
  document.getElementById("refreshRankingsBtn")?.addEventListener("click", refresh);

  refresh();
  window.lucide?.createIcons?.();
})();
