const Preferences = {
  storageKey: "arcade_preferences",
  defaults: {
    theme: "dark",
    musicEnabled: true,
    displayName: ""
  },
  state: null,

  load() {
    if (this.state) return this.state;
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
      this.state = {
        ...this.defaults,
        ...stored,
        theme: stored?.theme === "light" ? "light" : "dark",
        musicEnabled: stored?.musicEnabled !== false,
        displayName: this.cleanDisplayName(stored?.displayName || "")
      };
    } catch {
      this.state = { ...this.defaults };
    }
    return this.state;
  },

  get() {
    return { ...this.load() };
  },

  save(nextState = {}) {
    this.state = {
      ...this.load(),
      ...nextState,
      theme: nextState.theme === "light" || nextState.theme === "dark"
        ? nextState.theme
        : (this.load().theme || "dark"),
      musicEnabled: nextState.musicEnabled === false ? false : Boolean(nextState.musicEnabled ?? this.load().musicEnabled),
      displayName: this.cleanDisplayName(nextState.displayName ?? this.load().displayName)
    };
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    this.apply();
    return this.get();
  },

  cleanDisplayName(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N} _.-]/gu, "")
      .slice(0, 24);
  },

  fallbackDisplayName(email) {
    const localPart = String(email || "")
      .trim()
      .toLowerCase()
      .split("@")[0] || "jugador";
    const cleaned = localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return cleaned || "Jugador";
  },

  apply() {
    const state = this.load();
    document.body.classList.toggle("dark", state.theme !== "light");
    document.body.classList.toggle("light", state.theme === "light");
    if (window.PacmanAudio?.setEnabled) {
      window.PacmanAudio.setEnabled(state.musicEnabled);
    }
  }
};

Preferences.load();
