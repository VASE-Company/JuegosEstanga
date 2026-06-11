const crypto = require("crypto");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function isCode(code) {
  return /^\d{6}$/.test(String(code || ""));
}

function createVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

module.exports = {
  normalizeEmail,
  isEmail,
  isCode,
  createVerificationCode,
  generateId
};
