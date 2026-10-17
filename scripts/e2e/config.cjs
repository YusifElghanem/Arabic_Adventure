const fs = require('fs');
const path = require('path');
// Game URL (the dev server, so the window.__game / window.__phaser debug hooks exist).
const URL = process.env.GAME_URL || 'http://localhost:5173/';
// Where screenshots go (git-ignored).
const OUT = process.env.E2E_OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
module.exports = { URL, OUT };
