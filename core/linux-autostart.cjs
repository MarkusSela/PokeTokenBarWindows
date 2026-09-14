const fs = require('node:fs');
const path = require('node:path');

const DESKTOP_FILE = 'poketokenbar.desktop';

function cleanLine(value, fallback = '') {
  const text = String(value ?? '').replace(/[\r\n]/g, ' ').trim();
  return text || fallback;
}

function quoteExec(value) {
  const text = cleanLine(value, 'poketokenbar');
  return /^[A-Za-z0-9_./:@%+,-]+$/.test(text)
    ? text
    : `"${text.replace(/["\\$`]/g, '\\$&')}"`;
}

function autostartPath({ home, configHome } = {}) {
  const root = cleanLine(configHome) || path.posix.join(cleanLine(home, '/home'), '.config');
  return path.posix.join(root, 'autostart', DESKTOP_FILE);
}

function desktopEntry({ execPath, name = 'PokeTokenBar', icon = 'poketokenbar' } = {}) {
  return [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${cleanLine(name, 'PokeTokenBar')}`,
    `Exec=${quoteExec(execPath)} --hidden`,
    `Icon=${cleanLine(icon, 'poketokenbar')}`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');
}

function syncAutostart({ home, configHome, execPath, enabled = false } = {}) {
  const file = autostartPath({ home, configHome });
  if (!enabled) {
    try { fs.unlinkSync(file); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return file;
  }
  fs.mkdirSync(path.posix.dirname(file), { recursive: true });
  const pending = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(pending, desktopEntry({ execPath }), { encoding: 'utf8', mode: 0o644 });
  fs.renameSync(pending, file);
  return file;
}

module.exports = { DESKTOP_FILE, autostartPath, desktopEntry, syncAutostart };
