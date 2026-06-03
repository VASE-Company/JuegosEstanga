const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const CODES_FILE = path.join(DATA_DIR, 'verificationCodes.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.txt');

async function ensureDataFiles() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const defaults = [
    [USERS_FILE, '[]'],
    [SCORES_FILE, '[]'],
    [CODES_FILE, '[]'],
    [MATCHES_FILE, '']
  ];
  for (const [file, value] of defaults) {
    if (!fs.existsSync(file)) await fsp.writeFile(file, value, 'utf8');
  }
}

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await writeJson(filePath, []);
    return [];
  }
}

async function writeJson(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function appendTxt(filePath, text) {
  await fsp.appendFile(filePath, text, 'utf8');
}

module.exports = {
  DATA_DIR,
  USERS_FILE,
  SCORES_FILE,
  CODES_FILE,
  MATCHES_FILE,
  ensureDataFiles,
  readJson,
  writeJson,
  appendTxt
};
