const Auth = {
  pendingType: null,
  user: null,
  init() {
    this.user = this.getUser();
    document.getElementById("requestRegisterBtn").addEventListener("click", () => this.requestCode("register"));
    document.getElementById("requestLoginBtn").addEventListener("click", () => this.requestCode("login"));
    document.getElementById("verifyCodeBtn").addEventListener("click", () => this.verifyCode());
    document.getElementById("logoutBtn").addEventListener("click", () => this.logout());
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("pacman_user"));
    } catch {
      return null;
    }
  },
  setUser(user) {
    this.user = user;
    localStorage.setItem("pacman_user", JSON.stringify(user));
    UI.setMenuUser(user);
    UI.show("menu");
    Rankings.load(user.email);
  },
  logout() {
    localStorage.removeItem("pacman_user");
    this.user = null;
    UI.show("auth");
  },
  email() {
    return document.getElementById("authEmail").value.trim().toLowerCase();
  },
  async requestCode(type) {
    this.pendingType = type;
    UI.message("authMessage", "Solicitando codigo...");
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email(), type })
      });
      const data = await response.json();
      UI.message("authMessage", data.message, !response.ok);
    } catch {
      UI.message("authMessage", "No se pudo contactar al servidor.", true);
    }
  },
  async verifyCode() {
    if (!this.pendingType) {
      UI.message("authMessage", "Primero solicita un codigo.", true);
      return;
    }
    const code = document.getElementById("authCode").value.trim();
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email(), code, type: this.pendingType })
      });
      const data = await response.json();
      if (!response.ok) {
        UI.message("authMessage", data.message, true);
        return;
      }
      this.setUser(data.user);
    } catch {
      UI.message("authMessage", "No se pudo verificar el codigo.", true);
    }
  }
};
