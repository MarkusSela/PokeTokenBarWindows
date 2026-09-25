const RARITIES = Object.freeze(['common', 'uncommon', 'rare', 'legendary']);
const RARITY_SET = new Set(RARITIES);

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isValidRarity(value) {
  return typeof value === 'string' && RARITY_SET.has(value);
}

function normalizedSource(source) {
  if (!isRecord(source)) throw new TypeError('Invalid rarity source: expected an object');
  const { captureRate, legendary, mythical } = source;
  if (!Number.isInteger(captureRate) || captureRate < 0 || captureRate > 255)
    throw new TypeError('Invalid rarity source captureRate: expected an integer from 0 to 255');
  for (const [key, value] of [['legendary', legendary], ['mythical', mythical]]) {
    if (value !== undefined && typeof value !== 'boolean')
      throw new TypeError(`Invalid rarity source ${key}: expected a boolean`);
  }
  return {
    captureRate,
    legendary: legendary === true,
    mythical: mythical === true,
  };
}

function classifyRarity(source, override) {
  const value = normalizedSource(source);
  if (isValidRarity(override)) return override;
  if (value.legendary || value.mythical) return 'legendary';
  if (value.captureRate <= 45) return 'rare';
  if (value.captureRate <= 120) return 'uncommon';
  return 'common';
}

function classifyPokeApiSpecies(species, override) {
  if (!isRecord(species)) throw new TypeError('Invalid PokeAPI rarity source: expected an object');
  if (!Number.isInteger(species.capture_rate) || species.capture_rate < 0 || species.capture_rate > 255)
    throw new TypeError('Invalid PokeAPI rarity source capture_rate: expected an integer from 0 to 255');
  if (typeof species.is_legendary !== 'boolean')
    throw new TypeError('Invalid PokeAPI rarity source is_legendary: expected a boolean');
  if (typeof species.is_mythical !== 'boolean')
    throw new TypeError('Invalid PokeAPI rarity source is_mythical: expected a boolean');
  return classifyRarity({
    captureRate: species.capture_rate,
    legendary: species.is_legendary,
    mythical: species.is_mythical,
  }, override);
}

function classifyEvolutionLine({ paths, captureRate, legendary = false, mythical = false } = {}, override) {
  if (isValidRarity(override)) return override;
  if (captureRate !== undefined) {
    return classifyRarity({ captureRate, legendary, mythical });
  }
  if (legendary === true || mythical === true) return 'legendary';
  const candidates = Array.isArray(paths) ? paths : [];
  const longestPath = candidates.reduce(
    (maximum, path) => Math.max(maximum, Array.isArray(path) ? path.length : 0),
    0,
  );
  if (longestPath <= 1) return 'common';
  if (longestPath === 2) return 'uncommon';
  return 'rare';
}

function classifyEvolutionStage(stageIndex, lineRarity = 'common', totalStages = 1) {
  if (lineRarity === 'legendary') return 'legendary';
  const index = Number.isInteger(stageIndex) ? Math.max(0, stageIndex) : 0;
  const stages = Number.isInteger(totalStages) ? Math.max(1, totalStages) : 1;
  if (stages === 1) return isValidRarity(lineRarity) ? lineRarity : 'common';
  if (index === 0) return 'common';
  if (index === 1) return 'uncommon';
  return 'rare';
}

module.exports = {
  RARITIES,
  isValidRarity,
  classifyRarity,
  classifyPokeApiSpecies,
  classifyEvolutionLine,
  classifyEvolutionStage,
};
