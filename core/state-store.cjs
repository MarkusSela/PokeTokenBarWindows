const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const LOCK_TIMEOUT_MS = 30_000;
const LOCK_RETRIES = 100;
const WAIT_BUFFER = new Int32Array(new SharedArrayBuffer(4));

function waitSync(milliseconds) {
  Atomics.wait(WAIT_BUFFER, 0, 0, milliseconds);
}

function loadState(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}
function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  let lockFd = null;
  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      lockFd = fs.openSync(lock, "wx", 0o600);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_TIMEOUT_MS) fs.unlinkSync(lock);
      } catch {}
      waitSync(10);
    }
  }
  if (lockFd == null) throw new Error("Companion state file is busy");
  const pending = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  let pendingFd = null;
  try {
    const payload = JSON.stringify(state, null, 2);
    pendingFd = fs.openSync(pending, "w", 0o600);
    fs.writeFileSync(pendingFd, payload, "utf8");
    fs.fsyncSync(pendingFd);
    fs.closeSync(pendingFd);
    pendingFd = null;
    fs.renameSync(pending, file);
    fs.chmodSync(file, 0o600);
  } finally {
    if (pendingFd != null) fs.closeSync(pendingFd);
    try { fs.unlinkSync(pending); } catch {}
    try { fs.closeSync(lockFd); } catch {}
    try { fs.unlinkSync(lock); } catch {}
  }
}
module.exports = { loadState, saveState };
