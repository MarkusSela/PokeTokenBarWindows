'use strict';

const MAX_RUN_ID_LENGTH = 48;

function normalizeQaRunId(value) {
  const raw = String(value ?? '').trim();
  const leaf = raw.split(/[\\/]/).filter(Boolean).at(-1) || raw;
  const normalized = leaf
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, MAX_RUN_ID_LENGTH);
  return normalized || 'session';
}

function formatTrayTooltip({ qa = false, runId = '', name = '', parts = [] } = {}) {
  const prefix = qa
    ? `PokeTokenBar QA · ${normalizeQaRunId(runId)}`
    : 'PokeTokenBar';
  const details = [name, ...(Array.isArray(parts) ? parts : [])]
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
  return details.length ? `${prefix} — ${details.join(' · ')}` : prefix;
}

module.exports = {
  formatTrayTooltip,
  normalizeQaRunId,
};
