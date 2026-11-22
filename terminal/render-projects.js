#!/usr/bin/env node
// Renders the "Things I've built" project cards as SVGs in the same style as the terminal
// window, so they fit the rest of the profile (a README table can't be styled).
//   node terminal/render-projects.js [outDir]
// Reads terminal/projects.json and writes one <id>.svg per project.
'use strict';
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || path.join(__dirname, 'projects');
const projects = JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.json'), 'utf8'));

const C = {
  bg: '#1a1b26', bar: '#16161e', border: '#2a2b3d',
  blue: '#7aa2f7', lilac: '#bb9af7', pink: '#f7768e', green: '#9ece6a',
  orange: '#ff9e64', yellow: '#e0af68', cyan: '#7dcfff', fg: '#c0caf5', dim: '#565f89',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONO = 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace';
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif';

// Layout (all cards share the same size so they line up in the grid)
const W = 420;
const PAD = 20;
const BAR = 30;
const FS = 13.5;               // description font size
const LH = FS * 1.5;
const CHAR_W = FS * 0.53;      // average sans-serif glyph width, used for wrapping
const MAX_CHARS = Math.floor((W - PAD * 2) / CHAR_W);

function wrap(text, max = MAX_CHARS) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

// Height is driven by the longest description so every card has the same size
const descLines = projects.map((p) => wrap(p.description));
const maxLines = Math.max(...descLines.map((l) => l.length));
const anyParts = projects.some((p) => p.parts);
const TITLE_Y = BAR + 34;
const DESC_Y = TITLE_Y + 26;
const PARTS_Y = DESC_Y + maxLines * LH + 6;
const CHIPS_Y = PARTS_Y + (anyParts ? 26 : 0);
const H = Math.ceil(CHIPS_Y + 22 + PAD);

function chip(x, label, color) {
  const w = Math.round(label.length * 7.4 + 20);
  return {
    w,
    svg: `<g transform="translate(${x} ${CHIPS_Y})"><rect width="${w}" height="22" rx="11" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".55"/><text x="${w / 2}" y="15" text-anchor="middle" font-family='${MONO}' font-size="12" fill="${color}">${esc(label)}</text></g>`,
  };
}

function card(p, lines) {
  const accent = C[p.accent] || C.lilac;
  const out = [];
  out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${C.bg}" stroke="${C.border}"/>`);
  out.push(`<path d="M10.5 0.5h${W - 21}a10 10 0 0 1 10 10v${BAR - 10.5}h-${W - 1}v-${BAR - 10.5}a10 10 0 0 1 10-10z" fill="${C.bar}"/>`);
  out.push(`<line x1="0.5" y1="${BAR}" x2="${W - 0.5}" y2="${BAR}" stroke="${C.border}"/>`);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => out.push(`<circle cx="${16 + i * 16}" cy="${BAR / 2}" r="5" fill="${c}"/>`));
  out.push(`<text x="${W / 2}" y="${BAR / 2 + 4}" text-anchor="middle" font-family='${MONO}' font-size="11" fill="${C.dim}">~/projects/${esc(p.repo)}</text>`);

  // title
  out.push(`<text x="${PAD}" y="${TITLE_Y}" font-family='${SANS}' font-size="20" font-weight="700"><tspan>${p.icon}</tspan><tspan dx="8" fill="${accent}">${esc(p.title)}</tspan></text>`);
  // a small arrow hinting that the card links to the repo
  out.push(`<text x="${W - PAD}" y="${TITLE_Y}" text-anchor="end" font-family='${MONO}' font-size="13" fill="${C.dim}">↗</text>`);

  // description
  lines.forEach((l, i) => {
    out.push(`<text x="${PAD}" y="${(DESC_Y + i * LH).toFixed(1)}" font-family='${SANS}' font-size="${FS}" fill="${C.fg}">${esc(l)}</text>`);
  });

  // parts (e.g. PCB · firmware · app)
  if (p.parts) {
    const spans = p.parts.map((t) => `<tspan fill="${C.blue}">${esc(t)}</tspan>`).join(`<tspan fill="${C.dim}"> · </tspan>`);
    out.push(`<text x="${PAD}" y="${PARTS_Y.toFixed(1)}" font-family='${MONO}' font-size="12"><tspan fill="${C.dim}">→ </tspan>${spans}</text>`);
  }

  // tech chips
  let x = PAD;
  for (const [label, color] of p.tech) {
    const c = chip(x, label, C[color] || C.fg);
    out.push(c.svg);
    x += c.w + 8;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)}: ${esc(p.description)}">
<title>${esc(p.title)}</title>
${out.join('\n')}
</svg>
`;
}

fs.mkdirSync(outDir, { recursive: true });
projects.forEach((p, i) => {
  const file = path.join(outDir, `${p.id}.svg`);
  fs.writeFileSync(file, card(p, descLines[i]));
  console.log(`wrote ${file}`);
});
