#!/usr/bin/env node
'use strict';

// npx phimaii: a neofetch-style business card. No dependencies, so it starts instantly.

const art = require('./art');

const useColor = !process.env.NO_COLOR && (process.stdout.isTTY || !!process.env.FORCE_COLOR);

// Tokyo Night palette
const palette = {
  blue: [122, 162, 247],
  lilac: [187, 154, 247],
  pink: [247, 118, 142],
  green: [158, 206, 106],
  orange: [255, 158, 100],
  yellow: [224, 175, 104],
  cyan: [125, 207, 255],
  fg: [192, 202, 245],
  dim: [86, 95, 137],
};

const rgb = ([r, g, b], s) => (useColor ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m` : s);
const bg = ([r, g, b], s) => (useColor ? `\x1b[48;2;${r};${g};${b}m${s}\x1b[0m` : s);
const bold = (s) => (useColor ? `\x1b[1m${s}\x1b[22m` : s);

// Vertical gradient for the portrait: blue -> lilac -> pink
function gradientAt(t) {
  const stops = [palette.blue, palette.lilac, palette.pink];
  const scaled = t * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
}

// Kept short (max 33 chars) so the card fits an 80-column terminal side by side
const funFacts = [
  'built a volume knob, PCB to app',
  'Stream Deck plugin for everything',
  'wrote a Minecraft TNT logger mod',
  'built a WiFi countdown on ESP8266',
  'spins motors with Clarke & Park',
  'wakes PCs over LAN with one click',
];

const since = new Date('2022-09-26');
const now = new Date();
let years = now.getFullYear() - since.getFullYear();
if (now < new Date(now.getFullYear(), since.getMonth(), since.getDate())) years -= 1;

const user = 'phimaii';
const host = 'eth-zurich';
const title = `${rgb(palette.lilac, bold(user))}${rgb(palette.fg, '@')}${rgb(palette.pink, bold(host))}`;
const titleLen = `${user}@${host}`.length;

const field = (label, value, color = palette.blue) =>
  `${rgb(color, bold(label.padEnd(10)))}${rgb(palette.fg, value)}`;

const swatches = [
  palette.blue, palette.lilac, palette.pink, palette.orange,
  palette.yellow, palette.green, palette.cyan, palette.fg,
];
const lighten = (c) => c.map((v) => Math.round(v + (255 - v) * 0.35));

const info = [
  title,
  rgb(palette.dim, '-'.repeat(titleLen)),
  field('OS', 'Student @ ETH Zürich'),
  field('Location', 'Zürich, Switzerland'),
  field('Shell', 'zsh'),
  field('Editor', 'VS Code'),
  field('Langs', 'C · C++ · C# · TS · Python', palette.lilac),
  field('Hardware', 'ESP32 · STM32 · KiCad', palette.lilac),
  field('Web', 'React · Next.js · Tailwind', palette.lilac),
  field('Building', 'FluxNode, a BLDC motor driver', palette.pink),
  field('Uptime', `${years}+ years on GitHub`, palette.pink),
  field('GitHub', 'github.com/PhiMaii', palette.pink),
  field('Fun fact', funFacts[Math.floor(Math.random() * funFacts.length)], palette.yellow),
  '',
  swatches.map((c) => bg(c, '   ')).join(''),
  swatches.map((c) => bg(lighten(c), '   ')).join(''),
];

const visibleLength = (s) => [...s.replace(/\x1b\[[0-9;]*m/g, '')].length;
const artWidth = Math.max(...art.map((l) => [...l].length));
const infoWidth = Math.max(...info.map(visibleLength));
const indent = ' ';
const gap = '   ';
const columns = process.stdout.columns || Number(process.env.COLUMNS) || 80;
const colorRow = (i) => gradientAt(i / Math.max(1, art.length - 1));

const lines = [''];

if (columns >= indent.length + artWidth + gap.length + infoWidth) {
  // Side by side like neofetch: info starts at the top, next to the portrait
  const height = Math.max(art.length, info.length);
  for (let i = 0; i < height; i++) {
    const a = art[i] || '';
    const padded = a + ' '.repeat(artWidth - [...a].length);
    lines.push(`${indent}${rgb(colorRow(i), padded)}${gap}${info[i] || ''}`);
  }
} else {
  // Very narrow terminal: portrait on top, info below
  art.forEach((a, i) => lines.push(indent + rgb(colorRow(i), a)));
  lines.push('');
  info.forEach((l) => lines.push(indent + l));
}

lines.push('');
console.log(lines.join('\n'));
