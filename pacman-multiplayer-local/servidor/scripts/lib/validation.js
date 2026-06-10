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

function sanitizeDisplayName(name) {
  const cleaned = String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} _.-]/gu, '');
  return cleaned.slice(0, 24);
}

function defaultDisplayName(email) {
  const localPart = String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[0] || 'jugador';
  const cleaned = localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return cleaned || 'Jugador';
}

module.exports = {
  isEmail,
  normalizeEmail,
  isCode,
  createVerificationCode,
  generateId,
  sanitizeDisplayName,
  defaultDisplayName
};
