(function (root) {
  'use strict';

  const PLACEHOLDER_SRC = 'assets/pokemon-placeholder.svg';

  function usableCandidates(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((candidate) => (
      candidate &&
      typeof candidate === 'object' &&
      typeof candidate.src === 'string' &&
      candidate.src.length > 0
    ));
  }

  function writeMetadata(image, candidate) {
    if (!image.dataset) image.dataset = {};
    image.dataset.spriteProvider = String(candidate?.provider || 'local');
    image.dataset.spriteAnimated = candidate?.animated ? 'true' : 'false';
    image.dataset.spriteShiny = candidate?.shiny ? 'true' : 'false';
    image.dataset.spriteFallbackKind = String(candidate?.fallbackKind || '');
  }

  function load(image, candidates) {
    if (!image || typeof image !== 'object')
      return Promise.resolve({ cancelled: true, attempts: 0 });

    const previousCancel = image.__ptbSpriteCancel;
    if (typeof previousCancel === 'function') previousCancel();

    const token = Number(image.__ptbSpriteToken || 0) + 1;
    image.__ptbSpriteToken = token;
    const list = usableCandidates(candidates);
    let index = 0;
    let settled = false;
    let cancelCurrent;

    const pending = new Promise((resolve) => {
      const isCurrent = () => image.__ptbSpriteToken === token;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (image.__ptbSpriteCancel === cancelCurrent)
          image.__ptbSpriteCancel = null;
        resolve(result);
      };
      cancelCurrent = () => finish({ cancelled: true, attempts: index });
      image.__ptbSpriteCancel = cancelCurrent;

      const attempt = () => {
        if (!isCurrent()) return cancelCurrent();
        if (index >= list.length) {
          image.onload = null;
          image.onerror = null;
          writeMetadata(image, {
            provider: 'local',
            animated: false,
            shiny: list.some((candidate) => candidate.shiny),
            fallbackKind: 'image-load-failed',
          });
          image.src = PLACEHOLDER_SRC;
          return finish({
            src: PLACEHOLDER_SRC,
            fallbackKind: 'image-load-failed',
            attempts: index,
          });
        }

        const candidate = list[index++];
        const onload = () => {
          if (!isCurrent()) return cancelCurrent();
          writeMetadata(image, candidate);
          finish({ ...candidate, attempts: index });
        };
        const onerror = () => {
          if (!isCurrent()) return cancelCurrent();
          attempt();
        };
        image.onload = onload;
        image.onerror = onerror;
        writeMetadata(image, candidate);
        image.src = candidate.src;
      };

      attempt();
    });

    return pending;
  }

  root.PokeTokenSpriteImage = Object.freeze({
    PLACEHOLDER_SRC,
    load,
    set: load,
  });
})(typeof window !== 'undefined' ? window : globalThis);
