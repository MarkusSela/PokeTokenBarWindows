'use strict';

const MASTER_MODE_CHECKS_REQUIRED = 30;
const MAX_MASTER_WALLET = Number.MAX_SAFE_INTEGER;

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
}

function registerCheckNow(settings = {}, clicks = 0) {
  const source = settings && typeof settings === 'object' ? settings : {};
  if (source.masterModeUnlocked === true)
    return { unlocked: true, justUnlocked: false, clicks: 0 };
  const current = Math.max(0, Math.floor(Number(clicks) || 0));
  const next = current + 1;
  const unlocked = next >= MASTER_MODE_CHECKS_REQUIRED;
  return {
    unlocked,
    justUnlocked: unlocked,
    clicks: unlocked ? 0 : next,
  };
}

function canMasterEdit(settings = {}, toggle) {
  return Boolean(
    settings && settings.masterModeUnlocked === true && settings[toggle] === true,
  );
}

function setSpendableWallet(state, requested) {
  const source = state && typeof state === 'object' ? state : null;
  if (!source || !canMasterEdit(source.settings, 'masterTokenEdit'))
    return { ok: false, state };
  const wallet = finiteNonNegative(requested);
  if (wallet == null || wallet > MAX_MASTER_WALLET) return { ok: false, state };
  const spentTokens = finiteNonNegative(source.spentTokens) || 0;
  return {
    ok: true,
    state: {
      ...source,
      usedSinceInstall: wallet + spentTokens,
      spentTokens,
    },
  };
}

module.exports = {
  MASTER_MODE_CHECKS_REQUIRED,
  canMasterEdit,
  registerCheckNow,
  setSpendableWallet,
};
