// Polyfill structuredClone for jsdom environment (used by fake-indexeddb).
// Node 17+ has structuredClone natively, but jest-environment-jsdom may not
// expose it in the global scope depending on the jsdom version.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function structuredClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill crypto.randomUUID for jsdom environment.
// Browsers expose this natively; jsdom does not always wire it up.
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID !== 'function') {
  const nodeCrypto = require('crypto');
  globalThis.crypto = {
    ...globalThis.crypto,
    randomUUID: () => nodeCrypto.randomUUID(),
  };
}
