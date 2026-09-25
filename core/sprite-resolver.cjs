const { safeSourceUrl, safeLocalPath } = require('./catalog-contract.cjs');

const STYLES = new Set(['auto', 'pixel-gen5']);
const KINDS = new Set(['showdown', 'game', 'static', 'gen5', 'local']);
const AUTO_ORDER = ['showdown', 'game', 'gen5', 'static', 'local'];
const PLACEHOLDER_SRC = 'assets/pokemon-placeholder.svg';

function kindOf(candidate) {
  if (KINDS.has(candidate.kind)) return candidate.kind;
  if (typeof candidate.localPath === 'string') return 'local';
  if (candidate.provider === 'showdown' && candidate.animated) return 'showdown';
  if (candidate.style === 'pixel-gen5') return 'gen5';
  if (typeof candidate.sourceUrl === 'string' && candidate.sourceUrl.includes('/versions/')) return 'game';
  return 'static';
}

function validCandidate(candidate, label) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new Error(`Invalid sprite candidate ${label}`);
  if (typeof candidate.provider !== 'string' || !candidate.provider)
    throw new Error(`Invalid sprite provider ${label}`);
  if (!STYLES.has(candidate.style)) throw new Error(`Invalid sprite style ${label}`);
  if (typeof candidate.animated !== 'boolean') throw new Error(`Invalid sprite animated flag ${label}`);
  if (!safeSourceUrl(candidate.sourceUrl)) throw new Error(`Unsafe sprite URL ${label}`);
  if (!safeLocalPath(candidate.localPath)) throw new Error(`Unsafe sprite local path ${label}`);
  if (candidate.localPath !== null && candidate.packageAllowed !== true)
    throw new Error(`Unapproved local sprite ${label}`);
  if (candidate.localPath === null && candidate.packageAllowed !== false)
    throw new Error(`Invalid remote package flag ${label}`);
  const kind = kindOf(candidate);
  if (!KINDS.has(kind)) throw new Error(`Invalid sprite kind ${label}`);
  return kind;
}

function requestSpecies(catalog, speciesId) {
  if (!Number.isInteger(speciesId) || speciesId < 1)
    throw new Error(`Invalid species ID: ${speciesId}`);
  const species = catalog?.species?.[String(speciesId)];
  if (!species) throw new Error(`Missing species ${speciesId} in catalog`);
  return species;
}

function requestVariant(catalog, species, speciesId, variantKey) {
  const key = variantKey || species.defaultVariantKey;
  if (typeof key !== 'string' || !species.variantKeys?.includes(key))
    throw new Error(`Missing variant ${key} for species ${speciesId}`);
  const variant = catalog.variants?.[key];
  if (!variant || variant.speciesId !== speciesId)
    throw new Error(`Variant ${key} does not belong to species ${speciesId}`);
  return variant;
}

function sourceForCandidate(candidate) {
  if (typeof candidate.localPath === 'string') {
    return candidate.localPath.startsWith('assets/') ? candidate.localPath : `assets/${candidate.localPath}`;
  }
  return candidate.sourceUrl;
}

function orderedAssets(candidates, style) {
  const indexed = candidates.map((candidate, index) => ({ candidate, index, kind: kindOf(candidate) }));
  const rank = (kind) => AUTO_ORDER.indexOf(kind);
  const auto = indexed
    .sort((left, right) => rank(left.kind) - rank(right.kind) || left.index - right.index);
  const pixel = indexed.filter(({ kind }) => kind === 'gen5');
  const ordered = style === 'auto' ? auto : [...pixel, ...auto];
  return ordered.map(({ candidate }) => candidate);
}

function placeholder(shiny, fallbackKind) {
  return {
    src: PLACEHOLDER_SRC,
    provider: 'local',
    animated: false,
    shiny,
    fallbackKind,
  };
}

function resolveSpriteCandidates(request, catalog) {
  if (!request || typeof request !== 'object' || Array.isArray(request))
    throw new Error('Sprite request is required');
  const speciesId = request.speciesId;
  const species = requestSpecies(catalog, speciesId);
  if (!STYLES.has(request.style)) throw new Error(`Invalid sprite style: ${request.style}`);
  if (typeof request.shiny !== 'boolean') throw new Error('Sprite shiny flag must be boolean');
  const variant = requestVariant(catalog, species, speciesId, request.variantKey);
  const shiny = request.shiny;
  const offline = request.offline === true;
  const candidates = variant.sprites?.[shiny ? 'shiny' : 'normal'];
  if (!Array.isArray(candidates)) throw new Error(`Missing ${shiny ? 'shiny' : 'normal'} sprites for variant ${request.variantKey || species.defaultVariantKey}`);

  const annotated = candidates.map((candidate, index) => ({ candidate, kind: validCandidate(candidate, `${speciesId}[${index}]`) }));
  // Prefer animation whenever it exists. For the explicitly missing animated
  // sources, use the catalogued normal/shiny static sprite instead of a
  // placeholder. This fallback is deliberately only reached when the whole
  // candidate set has no animated source.
  const ordered = orderedAssets(annotated.map(({ candidate }) => candidate), request.style);
  const hasAnimated = ordered.some((candidate) => candidate.animated === true);
  const usable = ordered.filter((candidate) => hasAnimated
    ? candidate.animated === true
    : candidate.animated !== true);
  const output = [];
  const seen = new Set();
  for (const candidate of usable) {
    if (offline && candidate.localPath === null) continue;
    const src = sourceForCandidate(candidate);
    if (seen.has(src)) continue;
    seen.add(src);
    output.push({
      src,
      provider: typeof candidate.localPath === 'string' ? 'local' : candidate.provider,
      animated: candidate.animated,
      shiny,
      fallbackKind: typeof candidate.localPath === 'string'
        ? 'local'
        : candidate.animated === true ? null : 'static',
    });
  }
  if (output.length) return output;
  if (shiny) return [placeholder(true, 'missing-shiny')];
  if (offline) return [placeholder(false, 'offline-missing')];
  return [placeholder(false, 'missing-sprite')];
}

module.exports = {
  PLACEHOLDER_SRC,
  resolveSpriteCandidates,
};
