const Auth = {
  sessionKey: "arcade_user",
  pendingType: null,
  pendingEmail: null,
  user: null,
  allowedDomains: ["gmail.com", "hotmail.com", "outlook.com"],
  init() {
    this.user = this.getUser();
    const bind = (id, eventName, handler) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener(eventName, handler);
    };
    bind("requestRegisterBtn", "click", () => this.requestCode("register"));
    bind("requestLoginBtn", "click", () => this.requestCode("login"));
    bind("verifyCodeBtn", "click", () => this.verifyCode());
    bind("logoutBtn", "click", () => this.logout());
    bind("authEmail", "input", () => this.validateEmailLive());
    this.resetAuthForm();
    this.validateEmailLive();
  },
  resetAuthForm() {
    const emailInput = document.getElementById("authEmail");
    const codeInput = document.getElementById("authCode");
    if (emailInput && !this.user) emailInput.value = "";
    if (codeInput) codeInput.value = "";
    this.pendingType = null;
    this.pendingEmail = null;
    this.setStep("mail");
  },
  getUser() {
    try {
      const session = JSON.parse(localStorage.getItem(this.sessionKey));
      return session?.user || null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    this.user = user;
    const session = JSON.parse(localStorage.getItem(this.sessionKey) || "{}");
    localStorage.setItem(this.sessionKey, JSON.stringify({ ...session, user }));
    UI.setMenuUser(user);
    UI.playEntryTransition(() => {
      UI.show("menu");
      Rankings.load(user.email);
    });
  },
  logout() {
    const session = JSON.parse(localStorage.getItem(this.sessionKey) || "{}");
    if (session?.token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` }
      }).catch(() => {});
    }
    localStorage.removeItem(this.sessionKey);
    this.user = null;
    this.pendingType = null;
    this.pendingEmail = null;
    window.location.href = "/";
  },
  email() {
    return document.getElementById("authEmail").value.trim().toLowerCase();
  },
  setStep(step) {
    document.getElementById("stepMail").classList.toggle("active", step === "mail");
    document.getElementById("stepCode").classList.toggle("active", step === "code");
    const codeInput = document.getElementById("authCode");
    const verifyBtn = document.getElementById("verifyCodeBtn");
    const codeEnabled = step === "code";
    codeInput.disabled = !codeEnabled;
    verifyBtn.disabled = !codeEnabled;
  },
  validateEmailLive() {
    const email = this.email();
    const hasAt = email.includes("@");
    const basicFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const domain = email.split("@")[1] || "";
    const validDomain = this.allowedDomains.includes(domain);

    this.markRule("mailRuleAt", hasAt, email.length > 0);
    this.markRule("mailRuleFormat", basicFormat, email.length > 0);
    this.markRule("mailRuleDomain", validDomain, domain.length > 0);

    const requestEnabled = hasAt && basicFormat && validDomain;
    document.getElementById("requestRegisterBtn").disabled = !requestEnabled;
    document.getElementById("requestLoginBtn").disabled = !requestEnabled;

    if (!email) {
      this.pendingType = null;
      this.pendingEmail = null;
      this.setStep("mail");
      UI.message("authMessage", "Escribe tu email para iniciar.", true);
      return false;
    }
    if (!hasAt) {
      UI.message("authMessage", "Falta el simbolo @ en el email.", true);
      return false;
    }
    if (!basicFormat) {
      UI.message("authMessage", "El formato del email no es valido.", true);
      return false;
    }
    if (!validDomain) {
      UI.message("authMessage", "Dominio no permitido. Usa gmail.com, hotmail.com o outlook.com.", true);
      return false;
    }
    if (this.pendingEmail && this.pendingEmail !== email) {
      this.pendingType = null;
      this.pendingEmail = null;
      this.setStep("mail");
      UI.message("authMessage", "El mail cambio. Solicita un nuevo codigo.", true);
      return false;
    }
    UI.message("authMessage", "Mail valido. Ahora solicita tu codigo.", false);
    return true;
  },
  markRule(id, isValid, touched) {
    const item = document.getElementById(id);
    item.classList.remove("ok", "error");
    if (!touched) return;
    item.classList.add(isValid ? "ok" : "error");
  },
  async requestCode(type) {
    if (!this.validateEmailLive()) return;
    this.pendingType = type;
    this.pendingEmail = this.email();
    this.setStep("mail");
    document.getElementById("authCode").value = "";
    UI.message("authMessage", "Solicitando codigo...");
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email(), type })
      });
      const data = await response.json();
      UI.message("authMessage", data.message, !response.ok);
      if (response.ok) {
        this.setStep("code");
        document.getElementById("authCode").value = "";
        UI.message("authMessage", "Codigo enviado. Paso 2: ingresalo para verificar.", false);
      }
    } catch {
      UI.message("authMessage", "No se pudo contactar al servidor.", true);
    }
  },
  async verifyCode() {
    if (!this.validateEmailLive()) return;
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
      if (data.token) {
        const session = JSON.parse(localStorage.getItem(this.sessionKey) || "{}");
        localStorage.setItem(this.sessionKey, JSON.stringify({ ...session, token: data.token, user: data.user }));
      }
      this.setUser(data.user);
      this.setStep("mail");
      document.getElementById("authCode").value = "";
      this.pendingEmail = null;
      this.pendingType = null;
    } catch {
      UI.message("authMessage", "No se pudo verificar el codigo.", true);
    }
  }
};
