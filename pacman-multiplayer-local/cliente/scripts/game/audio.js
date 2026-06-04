var PacmanAudio = {
  tracks: {},
  ambientKey: null,
  primed: false,
  primePromise: null,

  init() {
    this.tracks = {
      lives3: this.createTrack("assets/audio/cancion3corazones.mp3", true),
      lives2: this.createTrack("assets/audio/cancion2corazones.mp3", true),
      lives1: this.createTrack("assets/audio/cancion1corazones.mp3", true),
      victory: this.createTrack("assets/audio/cancionvictoria.mp3", false),
      defeat: this.createTrack("assets/audio/canciondederrota.mp3", true)
    };
  },

  createTrack(src, loop) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = loop;
    audio.volume = 0.8;
    return audio;
  },

  prime() {
    // aca dejamos los sonidos listos para que el navegador no los bloquee.
    if (this.primed) return Promise.resolve();
    if (this.primePromise) return this.primePromise;
    this.primePromise = Promise.all(Object.values(this.tracks).map((audio) => {
      audio.muted = true;
      return audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {}).finally(() => {
        audio.muted = false;
      });
    })).then(() => {
      this.primed = true;
    });
    return this.primePromise;
  },

  getAmbientKey(lives) {
    if (lives <= 1) return "lives1";
    if (lives === 2) return "lives2";
    return "lives3";
  },

  stopAmbient() {
    if (!this.ambientKey || !this.tracks[this.ambientKey]) return;
    const track = this.tracks[this.ambientKey];
    track.pause();
    track.currentTime = 0;
    this.ambientKey = null;
  },

  stopVictory() {
    const track = this.tracks.victory;
    if (!track) return;
    track.pause();
    track.currentTime = 0;
  },

  stopDefeat() {
    const track = this.tracks.defeat;
    if (!track) return;
    track.pause();
    track.currentTime = 0;
  },

  playAmbient(lives) {
    const key = this.getAmbientKey(Number(lives) || 3);
    if (!this.primed && this.primePromise) {
      this.primePromise.then(() => this.playAmbient(lives)).catch(() => {});
      return;
    }
    if (this.ambientKey === key && !this.tracks[key].paused) return;
    this.stopVictory();
    this.stopDefeat();
    this.stopAmbient();
    const track = this.tracks[key];
    if (!track) return;
    track.loop = true;
    track.play().catch(() => {});
    this.ambientKey = key;
  },

  playVictory() {
    this.stopAmbient();
    this.stopVictory();
    this.stopDefeat();
    const track = this.tracks.victory;
    if (!track) return;
    track.currentTime = 0;
    track.loop = false;
    track.play().catch(() => {});
  },

  playDefeat() {
    this.stopAmbient();
    this.stopVictory();
    this.stopDefeat();
    const track = this.tracks.defeat;
    if (!track) return;
    track.currentTime = 0;
    track.loop = true;
    track.play().catch(() => {});
  },

  syncFromState(state) {
    if (!state || state.status !== "playing") {
      this.stopAmbient();
      return;
    }
    this.playAmbient(state.livesPacman);
  }
};
