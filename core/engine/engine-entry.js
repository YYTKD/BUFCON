import './utils.js';
import './buffs.js';
import './bulk.js';
import './commands.js';
import './store.js';

const engine = globalThis.JetPaletteEngine;

if (!engine) {
  throw new Error('JetPaletteEngine が初期化されていません');
}

export const { createStore, normalizeBuffs, convertYstToJetPalette } = engine;
export default engine;
