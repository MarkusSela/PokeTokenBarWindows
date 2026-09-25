// Feedback puro per la schiusa: nessun accesso a I/O o a Electron.
function toSpeciesId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

function ownedSpeciesIds(state) {
  const ids = new Set();
  const addAll = (values) => {
    for (const value of Array.isArray(values) ? values : []) {
      const id = toSpeciesId(value);
      if (id != null) ids.add(id);
    }
  };
  for (const entry of Array.isArray(state?.dex) ? state.dex : []) {
    addAll(entry?.chainOrder);
    addAll(entry?.pathIds);
    addAll([entry?.baseId, entry?.finalId]);
  }
  addAll(state?.active?.pathIds);
  return ids;
}

// Suffisso da aggiungere al messaggio di schiusa quando c'e' qualcosa da segnalare.
function duplicateHatchSuffix({
  hatchedBaseId,
  ownedIds,
  pokeDollWasActive,
  pokeDollConsumed,
  italian = false,
} = {}) {
  const id = toSpeciesId(hatchedBaseId);
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || []);
  const duplicate = id != null && owned.has(id);
  const consumed =
    pokeDollConsumed == null ? Boolean(!duplicate && pokeDollWasActive) : Boolean(pokeDollConsumed);
  if (duplicate && !pokeDollWasActive)
    return italian
      ? ' Attenzione: era già nel Pokédex (Poké Doll non attiva).'
      : ' Note: it was already in your Pokédex (Poké Doll was not active).';
  if (duplicate && pokeDollWasActive)
    return italian
      ? ' Era già nel Pokédex: duplicato shiny ammesso, Poké Doll ancora attiva.'
      : ' It was already in your Pokédex: shiny duplicate allowed, Poké Doll still active.';
  if (consumed) return italian ? ' Poké Doll consumato.' : ' Poké Doll consumed.';
  return '';
}

// Avviso mostrato mentre l'uovo e' in incubazione senza protezione attiva.
// A inizio partita nessuno ha duplicati da evitare: l'avviso compare solo dal 40% di Pokédex completato.
const DEX_WARNING_RATIO = 0.4;
function unarmedDollHint({
  incubating,
  pokeDollOwned,
  pokeDollActive,
  dexOwned = 0,
  dexTotal = 0,
  italian = false,
} = {}) {
  const owned = Number(pokeDollOwned) || 0;
  if (!incubating || pokeDollActive || owned <= 0) return null;
  const total = Number(dexTotal) || 0;
  const seen = Number(dexOwned) || 0;
  if (!total || seen / total < DEX_WARNING_RATIO) return null;
  return italian
    ? 'Poké Doll non attiva: potrebbe uscire una specie già nel Pokédex.'
    : 'Poké Doll is not active: you may hatch a species you already own.';
}

module.exports = { ownedSpeciesIds, duplicateHatchSuffix, unarmedDollHint, DEX_WARNING_RATIO };
