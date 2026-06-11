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
    bind("authName", "input", () => this.validateEmailLive());
    this.resetAuthForm();
    this.validateEmailLive();
  },
  resetAuthForm() {
    const emailInput = document.getElementById("authEmail");
    const nameInput = document.getElementById("authName");
    const codeInput = document.getElementById("authCode");
    if (emailInput && !this.user) emailInput.value = "";
    if (nameInput) {
      const preferredName = this.user?.displayName || Preferences.get().displayName || Preferences.fallbackDisplayName(this.user?.email || "");
      nameInput.value = preferredName;
    }
    if (codeInput) codeInput.value = "";
    this.pendingType = null;
    this.pendingEmail = null;
    this.setStep("mail");
  },
  getUser() {
    try {
      const session = JSON.parse(localStorage.getItem(this.sessionKey));
      const user = session?.user || null;
      if (!user) return null;
      return {
        ...user,
        displayName: user.displayName || Preferences.fallbackDisplayName(user.email)
      };
    } catch {
      return null;
    }
  },
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.sessionKey) || "{}");
    } catch {
      return {};
    }
  },
  getToken() {
    return this.getSession()?.token || "";
  },
  setUser(user) {
    this.user = {
      ...user,
      displayName: user.displayName || Preferences.fallbackDisplayName(user.email)
    };
    const session = JSON.parse(localStorage.getItem(this.sessionKey) || "{}");
    localStorage.setItem(this.sessionKey, JSON.stringify({ ...session, user: this.user }));
    Preferences.save({ displayName: this.user.displayName });
    UI.setMenuUser(this.user);
    UI.playEntryTransition(() => {
      UI.show("menu");
      Rankings.load(this.user.email);
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
  displayName() {
    return Preferences.cleanDisplayName(document.getElementById("authName").value);
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
    const displayName = this.displayName();
    const hasAt = email.includes("@");
    const basicFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const domain = email.split("@")[1] || "";
    const validDomain = this.allowedDomains.includes(domain);
    const validName = displayName.length >= 2;

    this.markRule("mailRuleAt", hasAt, email.length > 0);
    this.markRule("mailRuleFormat", basicFormat, email.length > 0);
    this.markRule("mailRuleDomain", validDomain, domain.length > 0);

    const requestEnabled = hasAt && basicFormat && validDomain && validName;
    document.getElementById("requestRegisterBtn").disabled = !requestEnabled;
    document.getElementById("requestLoginBtn").disabled = !requestEnabled;

    if (!displayName) {
      UI.message("authMessage", "Escribe tu nombre visible para empezar.", true);
      return false;
    }
    if (!validName) {
      UI.message("authMessage", "El nombre debe tener al menos 2 caracteres.", true);
      return false;
    }
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
        body: JSON.stringify({ email: this.email(), type, displayName: this.displayName() })
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
        body: JSON.stringify({ email: this.email(), code, type: this.pendingType, displayName: this.displayName() })
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
  },
  async updateProfile(displayName) {
    const cleanName = Preferences.cleanDisplayName(displayName);
    if (cleanName.length < 2) throw new Error("El nombre visible no es valido.");
    const session = JSON.parse(localStorage.getItem(this.sessionKey) || "{}");
    if (!session?.token) {
      this.user = {
        ...(this.user || {}),
        displayName: cleanName
      };
      localStorage.setItem(this.sessionKey, JSON.stringify({ ...session, user: this.user }));
      Preferences.save({ displayName: this.user.displayName });
      UI.setMenuUser(this.user);
      return this.user;
    }
    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ displayName: cleanName })
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        this.user = {
          ...(this.user || {}),
          displayName: cleanName
        };
        localStorage.setItem(this.sessionKey, JSON.stringify({ ...session, user: this.user }));
        Preferences.save({ displayName: this.user.displayName });
        UI.setMenuUser(this.user);
        return this.user;
      }
      throw new Error(data.message || "No se pudo actualizar el perfil.");
    }
    this.user = {
      ...(this.user || {}),
      ...data.user,
      displayName: data.user.displayName || cleanName
    };
    localStorage.setItem(this.sessionKey, JSON.stringify({ ...session, user: this.user }));
    Preferences.save({ displayName: this.user.displayName });
    UI.setMenuUser(this.user);
    return this.user;
  }
};
