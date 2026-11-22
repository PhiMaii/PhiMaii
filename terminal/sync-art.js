#!/usr/bin/env node
// Copies the portrait from card/art.js (the npm package) into phimaii-terminal.js,
// so the web terminal always shows the same picture as `npx phimaii`.
//   node terminal/sync-art.js           update the file
//   node terminal/sync-art.js --check   exit 1 if it's out of date
'use strict';
const fs = require('fs');
const path = require('path');

const art = require(path.join(__dirname, '..', 'card', 'art.js'));
const file = path.join(__dirname, 'phimaii-terminal.js');
const src = fs.readFileSync(file, 'utf8');

const block = `/* ART:START */\n  const ART = ${JSON.stringify(art, null, 2).replace(/\n/g, '\n  ')};\n  /* ART:END */`;
const next = src.replace(/\/\* ART:START \*\/[\s\S]*?\/\* ART:END \*\//, block);

if (process.argv.includes('--check')) {
  if (next !== src) {
    console.error('phimaii-terminal.js is out of date. Run: node terminal/sync-art.js');
    process.exit(1);
  }
  console.log('portrait is in sync');
} else {
  fs.writeFileSync(file, next);
  console.log(`synced ${art.length} portrait rows from card/art.js`);
}
