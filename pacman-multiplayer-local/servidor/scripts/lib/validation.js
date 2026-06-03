function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCode(code) {
  return /^\d{6}$/.test(String(code || ''));
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  isEmail,
  normalizeEmail,
  isCode,
  createVerificationCode,
  generateId
};
