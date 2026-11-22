#!/usr/bin/env node
'use strict';

// npx phimaii: a neofetch-style business card. No dependencies, so it starts instantly.

const art = require('./art');

const args = process.argv.slice(2);
const out = process.stdout;
const useColor = !process.env.NO_COLOR && (out.isTTY || !!process.env.FORCE_COLOR);

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
  white: [255, 255, 255],
};

const fgCode = ([r, g, b]) => `\x1b[38;2;${r};${g};${b}m`;
const bgCode = ([r, g, b]) => `\x1b[48;2;${r};${g};${b}m`;
const RESET = '\x1b[0m';
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
const lighten = (c) => mix(c, palette.white, 0.35);

// Vertical gradient for the portrait: blue -> lilac -> pink
function gradientAt(t) {
  const stops = [palette.blue, palette.lilac, palette.pink];
  const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  return mix(stops[i], stops[i + 1], scaled - i);
}
const rowColor = (i) => gradientAt(i / Math.max(1, art.length - 1));

// ---------------------------------------------------------------- content

// Kept short (max 31 chars) so the card fits an 80-column terminal side by side
const funFacts = [
  'built a volume knob, PCB to app',
  'Stream Deck plugins for all',
  'wrote a Minecraft TNT logger',
  'WiFi countdown on an ESP8266',
  'spins motors with Clarke & Park',
  'wakes PCs over LAN in 1 click',
];

// ---------------------------------------------------------------- live data

const GITHUB_USER = 'PhiMaii';
const offline = args.includes('--offline');

function yearsSince(date) {
  const now = new Date();
  let y = now.getFullYear() - date.getFullYear();
  if (now < new Date(now.getFullYear(), date.getMonth(), date.getDate())) y -= 1;
  return y;
}

function timeAgo(date) {
  const s = Math.max(0, (Date.now() - date.getTime()) / 1000);
  const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]];
  for (const [u, n] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return 'just now';
}

// Current time in Zürich, plus a greeting that fits the time of day
function zurichNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const hh = parts.find((p) => p.type === 'hour').value;
  const mm = parts.find((p) => p.type === 'minute').value;
  const h = Number(hh) % 24;
  const mood =
    h < 5 ? 'night owl mode' :
    h < 12 ? 'good morning' :
    h < 18 ? 'good afternoon' :
    h < 22 ? 'good evening' : 'good night';
  return `${String(h).padStart(2, '0')}:${mm} · ${mood}`;
}

// Fetch public GitHub stats. Resolves to null when offline, slow or rate-limited.
async function fetchGitHub(timeoutMs = 1500) {
  if (offline || typeof fetch !== 'function') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const get = (path) =>
    fetch(`https://api.github.com${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'npx-phimaii-card' },
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  try {
    const [user, repos] = await Promise.all([
      get(`/users/${GITHUB_USER}`),
      get(`/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`),
    ]);
    const own = repos.filter((r) => !r.fork);
    // skip the profile repo itself, it changes all the time
    const latest = own.find((r) => r.name.toLowerCase() !== GITHUB_USER.toLowerCase());
    return {
      repos: user.public_repos,
      stars: own.reduce((n, r) => n + r.stargazers_count, 0),
      since: new Date(user.created_at),
      lastPush: latest ? { name: latest.name, at: new Date(latest.pushed_at) } : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const fallbackSince = new Date('2022-09-26');
const fit = (text, max = 31) => ([...text].length > max ? [...text].slice(0, max - 1).join('') + '…' : text);

const uptimeText = (gh) =>
  gh ? `${yearsSince(gh.since)}+ yrs · ${gh.repos} repos · ${gh.stars} ★` : `${yearsSince(fallbackSince)}+ years on GitHub`;
const lastPushText = (gh) =>
  gh && gh.lastPush ? fit(`${timeAgo(gh.lastPush.at)} · ${gh.lastPush.name}`) : 'probably soldering right now';

// Each info line is a list of segments, so it can be typed out character by character.
const seg = (text, color, opts = {}) => ({ text, color, ...opts });
const field = (label, value, color = palette.blue) => [
  seg(label.padEnd(10), color, { bold: true }),
  seg(value, palette.fg),
];

const user = 'phimaii';
const host = 'eth-zurich';
const swatches = [
  palette.blue, palette.lilac, palette.pink, palette.orange,
  palette.yellow, palette.green, palette.cyan, palette.fg,
];

const info = [
  [seg(user, palette.lilac, { bold: true }), seg('@', palette.fg), seg(host, palette.pink, { bold: true })],
  [seg('-'.repeat(user.length + 1 + host.length), palette.dim)],
  field('OS', 'Student @ ETH Zürich'),
  field('Location', `Zürich · ${zurichNow()}`),
  field('Setup', 'zsh · VS Code'),
  field('Platforms', 'macOS · Linux · Windows'),
  field('Langs', 'C · C++ · C# · TS · Python', palette.lilac),
  field('Hardware', 'ESP32 · STM32 · KiCad', palette.lilac),
  field('Web', 'React · Next.js · Tailwind', palette.lilac),
  field('ML', 'TensorFlow · Anaconda', palette.lilac),
  field('DevOps', 'Docker · GitHub Actions', palette.lilac),
  field('Hosting', 'Cloudflare · Vercel · Nginx', palette.lilac),
  field('Notes', 'Obsidian · Markdown · LaTeX', palette.lilac),
  field('Building', 'FluxNode, a BLDC motor driver', palette.pink),
  field('Uptime', uptimeText(null), palette.pink),
  field('Last push', lastPushText(null), palette.pink),
  field('GitHub', 'github.com/PhiMaii', palette.pink),
  field('Fun fact', funFacts[Math.floor(Math.random() * funFacts.length)], palette.yellow),
  [],
  swatches.map((c) => seg('   ', null, { bg: c })),
  swatches.map((c) => seg('   ', null, { bg: lighten(c) })),
];

// Swap in live GitHub values once they arrive (works mid-animation too)
const UPTIME_ROW = info.findIndex((l) => l[0] && l[0].text.trim() === 'Uptime');
const PUSH_ROW = info.findIndex((l) => l[0] && l[0].text.trim() === 'Last push');
function applyGitHub(gh) {
  if (!gh) return;
  info[UPTIME_ROW][1] = seg(uptimeText(gh), palette.fg);
  info[PUSH_ROW][1] = seg(lastPushText(gh), palette.green);
}
const github = fetchGitHub();

// ---------------------------------------------------------------- rendering

const lineLength = (line) => line.reduce((n, s) => n + [...s.text].length, 0);

// Render an info line, showing only the first `chars` characters (for the typing effect)
function renderInfo(line, chars = Infinity) {
  let left = chars;
  let s = '';
  for (const part of line) {
    if (left <= 0) break;
    const text = [...part.text].slice(0, left).join('');
    left -= [...text].length;
    if (!useColor) { s += text; continue; }
    s += (part.bold ? '\x1b[1m' : '') + (part.color ? fgCode(part.color) : '') + (part.bg ? bgCode(part.bg) : '') + text + RESET;
  }
  return s;
}

const artWidth = Math.max(...art.map((l) => [...l].length));
const infoWidth = Math.max(10 + 31, ...info.map(lineLength));
const indent = ' ';
const gap = '  ';
const columns = out.columns || Number(process.env.COLUMNS) || 80;
const sideBySide = columns >= indent.length + artWidth + gap.length + infoWidth;
const height = Math.max(art.length, info.length);

// Render one portrait row. `colorAt(x)` picks the colour per character.
function renderArt(i, colorAt) {
  const chars = [...(art[i] || '')];
  while (chars.length < artWidth) chars.push(' ');
  if (!useColor) return chars.join('');
  let s = '';
  let last = null;
  chars.forEach((ch, x) => {
    const c = colorAt(x);
    const code = fgCode(c);
    if (code !== last) { s += code; last = code; }
    s += ch;
  });
  return s + RESET;
}

const blankArt = ' '.repeat(artWidth);

/**
 * Build the whole card as lines.
 *   artRows   how many portrait rows are revealed (scan effect)
 *   infoChars function(lineIndex) -> how many characters of that info line to show
 *   shimmer   position of the light wave, or null
 */
function frame({ artRows = Infinity, infoChars = () => Infinity, shimmer = null } = {}) {
  const lines = [''];
  if (!sideBySide) {
    art.forEach((_, i) => lines.push(indent + renderArt(i, () => rowColor(i))));
    lines.push('');
    info.forEach((l) => lines.push(indent + renderInfo(l)));
    lines.push('');
    return lines;
  }
  for (let i = 0; i < height; i++) {
    let a;
    if (i < artRows - 1 || artRows === Infinity) {
      a = renderArt(i, (x) => {
        const base = rowColor(i);
        if (shimmer === null) return base;
        // diagonal band of light sweeping across the portrait
        const d = x * 0.45 + i - shimmer;
        return mix(base, palette.white, 0.85 * Math.exp(-(d * d) / 6));
      });
    } else if (i === Math.floor(artRows - 1) && i < art.length) {
      a = renderArt(i, () => palette.white); // the bright scan line
    } else {
      a = blankArt;
    }
    lines.push(`${indent}${a}${gap}${info[i] ? renderInfo(info[i], infoChars(i)) : ''}`);
  }
  lines.push('');
  return lines;
}

// ---------------------------------------------------------------- animation

const wantsStatic = args.includes('--static') || args.includes('--no-anim') || !!process.env.CI;
const canAnimate =
  out.isTTY && useColor && sideBySide && !wantsStatic && (out.rows || 0) >= height + 3;

if (!canAnimate) {
  github.then((gh) => {
    applyGitHub(gh);
    console.log(frame().join('\n'));
    process.exit(0);
  });
} else {
  github.then(applyGitHub);
  animate();
}

function animate() {

const SCAN_MS = 650; // portrait builds up top to bottom
const TYPE_START = 120; // info lines start typing, one after another
const TYPE_STAGGER = 40;
const TYPE_MS = 260;
const SHIMMER_START = 1150;
const SHIMMER_MS = 1100;
const END = SHIMMER_START + SHIMMER_MS;
const FPS = 40;

let drawn = 0;
function draw(lines) {
  let s = drawn ? `\x1b[${drawn}A\r` : '';
  s += lines.map((l) => `\x1b[2K${l}`).join('\n');
  out.write(s);
  drawn = lines.length - 1;
}

function cleanup() {
  out.write('\x1b[?25h'); // show cursor again
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

let timer;
function finish() {
  clearInterval(timer);
  draw(frame());
  out.write('\n');
  cleanup();
  process.exit(0);
}

// Any key skips the animation, Ctrl-C quits.
if (process.stdin.isTTY && process.stdin.setRawMode) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key[0] === 3) { cleanup(); out.write('\n'); process.exit(130); }
    finish();
  });
}
process.on('SIGINT', () => { cleanup(); process.exit(130); });

out.write('\x1b[?25l'); // hide cursor while animating
const t0 = Date.now();
const tick = () => {
  const t = Date.now() - t0;
  if (t >= END) return finish();
  const artRows = Math.min(art.length + 1, (t / SCAN_MS) * (art.length + 1));
  const infoChars = (i) => {
    const start = TYPE_START + i * TYPE_STAGGER;
    return Math.max(0, Math.floor(((t - start) / TYPE_MS) * (lineLength(info[i]) || 1)));
  };
  const shimmer =
    t < SHIMMER_START ? null : -8 + ((t - SHIMMER_START) / SHIMMER_MS) * (artWidth * 0.45 + art.length + 16);
  draw(frame({ artRows: t >= SCAN_MS ? Infinity : artRows, infoChars, shimmer }));
};
tick();
timer = setInterval(tick, 1000 / FPS);
}
