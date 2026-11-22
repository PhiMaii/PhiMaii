#!/usr/bin/env node
// Renders an animated SVG of the web terminal running `npx phimaii`, for the GitHub profile
// README (GitHub strips scripts and iframes, but CSS animations inside an SVG image still play).
//   node terminal/render-svg.js [out.svg] [--offline]
'use strict';
const fs = require('fs');
const path = require('path');

const ART = require(path.join(__dirname, '..', 'card', 'art.js'));
const out = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(__dirname, 'card.svg');
const offline = process.argv.includes('--offline');

// ------------------------------------------------------------ palette & helpers
const P = {
  bg: '#1a1b26', bar: '#16161e', border: '#2a2b3d',
  blue: [122, 162, 247], lilac: [187, 154, 247], pink: [247, 118, 142],
  green: [158, 206, 106], orange: [255, 158, 100], yellow: [224, 175, 104],
  cyan: [125, 207, 255], fg: [192, 202, 245], dim: [86, 95, 137], white: [255, 255, 255],
};
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
function gradientAt(t) {
  const stops = [P.blue, P.lilac, P.pink];
  const s = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  return mix(stops[i], stops[i + 1], s - i);
}
const rowColor = (i) => gradientAt(i / Math.max(1, ART.length - 1));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (n) => Math.round(n * 10) / 10;

// ------------------------------------------------------------ live data (baked in at build time)
function yearsSince(d) {
  const n = new Date();
  let y = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) y -= 1;
  return y;
}
function timeAgo(d) {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  for (const [u, n] of [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]]) {
    if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  }
  return 'just now';
}
const fit = (t, max = 31) => ([...t].length > max ? [...t].slice(0, max - 1).join('') + '…' : t);

async function fetchGitHub() {
  if (offline || typeof fetch !== 'function') return null;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'phimaii-card-svg' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = (p) => fetch(`https://api.github.com${p}`, { headers }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  try {
    const [user, repos] = await Promise.all([get('/users/PhiMaii'), get('/users/PhiMaii/repos?per_page=100&sort=pushed')]);
    const own = repos.filter((r) => !r.fork);
    const latest = own.find((r) => r.name.toLowerCase() !== 'phimaii');
    return {
      repos: user.public_repos,
      stars: own.reduce((n, r) => n + r.stargazers_count, 0),
      since: new Date(user.created_at),
      lastPush: latest ? { name: latest.name, at: new Date(latest.pushed_at) } : null,
    };
  } catch {
    return null;
  }
}

const FUN_FACTS = [
  'built a volume knob, PCB to app',
  'Stream Deck plugins for all',
  'wrote a Minecraft TNT logger',
  'WiFi countdown on an ESP8266',
  'spins motors with Clarke & Park',
  'wakes PCs over LAN in 1 click',
];

function buildInfo(gh) {
  const seg = (text, color, o = {}) => ({ text, color, ...o });
  const field = (label, value, color = P.blue, valueColor = P.fg) => [seg(label.padEnd(10), color, { bold: true }), seg(value, valueColor)];
  const since = gh ? gh.since : new Date('2022-09-26');
  // Zürich time is left out on purpose: a frozen clock in an image would look wrong
  return [
    [seg('phimaii', P.lilac, { bold: true }), seg('@', P.fg), seg('eth-zurich', P.pink, { bold: true })],
    [seg('-'.repeat(18), P.dim)],
    field('OS', 'Student @ ETH Zürich'),
    field('Location', 'Zürich, Switzerland'),
    field('Setup', 'zsh · VS Code'),
    field('Platforms', 'macOS · Linux · Windows'),
    field('Langs', 'C · C++ · C# · TS · Python', P.lilac),
    field('Hardware', 'ESP32 · STM32 · KiCad', P.lilac),
    field('Web', 'React · Next.js · Tailwind', P.lilac),
    field('ML', 'TensorFlow · Anaconda', P.lilac),
    field('DevOps', 'Docker · GitHub Actions', P.lilac),
    field('Hosting', 'Cloudflare · Vercel · Nginx', P.lilac),
    field('Notes', 'Obsidian · Markdown · LaTeX', P.lilac),
    field('Building', 'FluxNode, a BLDC motor driver', P.pink),
    field('Uptime', gh ? `${yearsSince(since)}+ yrs · ${gh.repos} repos · ${gh.stars} ★` : `${yearsSince(since)}+ years on GitHub`, P.pink),
    field('Last push', gh && gh.lastPush ? fit(`${timeAgo(gh.lastPush.at)} · ${gh.lastPush.name}`) : 'probably soldering right now', P.pink, gh ? P.green : P.fg),
    field('GitHub', 'github.com/PhiMaii', P.pink),
    field('Fun fact', FUN_FACTS[new Date().getDate() % FUN_FACTS.length], P.yellow),
    [],
    'swatches',
    'swatches-light',
  ];
}

// ------------------------------------------------------------ render
function render(info) {
  const FS = 13;            // font size
  const CW = FS * 0.6;      // monospace cell width
  const LH = FS * 1.25;     // line height
  const PAD = 16;
  const BAR = 34;
  const ART_COLS = 37;
  const INFO_X = PAD + (ART_COLS + 1) * CW;
  const W = Math.ceil(PAD * 2 + 80 * CW);

  const y0 = BAR + 14;                 // top of the first text line
  const cardTop = y0 + LH + 8;         // first card row
  const endY = cardTop + ART.length * LH + 8;
  const H = Math.ceil(endY + LH + 16);
  const baseline = (top) => r2(top + LH * 0.78);

  // timeline (seconds)
  const T_TYPE = 0.6, CMD = 'npx phimaii', T_CHAR = 0.09;
  const T_TYPED = T_TYPE + CMD.length * T_CHAR;
  const T_SPIN = T_TYPED + 0.3, SPIN_MS = 0.9;
  const T_CARD = T_SPIN + SPIN_MS;
  const SCAN = 0.65, TYPE_START = 0.12, STAGGER = 0.04, TYPE_DUR = 0.26;
  const T_SHIMMER = T_CARD + 1.15, SHIMMER = 1.1;
  const T_END = T_SHIMMER + SHIMMER;

  const css = [];
  const body = [];
  const defs = [];

  // window chrome
  body.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${P.bg}" stroke="${P.border}"/>`);
  body.push(`<path d="M10.5 0.5h${W - 21}a10 10 0 0 1 10 10v${BAR - 10.5}h-${W - 1}v-${BAR - 10.5}a10 10 0 0 1 10-10z" fill="${P.bar}"/>`);
  body.push(`<line x1="0.5" y1="${BAR}" x2="${W - 0.5}" y2="${BAR}" stroke="${P.border}"/>`);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => body.push(`<circle cx="${18 + i * 20}" cy="${BAR / 2}" r="6" fill="${c}"/>`));
  body.push(`<text x="${W / 2}" y="${BAR / 2 + 4}" text-anchor="middle" class="t" font-size="12" fill="${hex(P.dim)}">phimaii — zsh</text>`);

  // prompt + typed command
  const promptW = 4 * CW; // "➜ ~ "
  const cmdX = PAD + promptW;
  const yb = baseline(y0);
  body.push(`<text x="${PAD}" y="${yb}" class="t"><tspan fill="${hex(P.green)}">➜</tspan> <tspan fill="${hex(P.blue)}">~</tspan></text>`);
  body.push(`<text x="${cmdX}" y="${yb}" class="t" fill="${hex(P.fg)}">${CMD}</text>`);
  // a background-coloured cover slides right, one character at a time, revealing the command
  body.push(`<rect class="cmdcover" x="${r2(cmdX)}" y="${r2(y0)}" width="${r2(CMD.length * CW * 1.2 + 12)}" height="${r2(LH)}" fill="${P.bg}"/>`);
  css.push(`.cmdcover{animation:slide ${CMD.length * T_CHAR}s steps(${CMD.length}) ${T_TYPE}s forwards;--d:${r2(CMD.length * CW * 1.2 + 12)}px}`);
  // cursor follows the typing, then disappears when "Enter" is pressed
  body.push(`<g class="cur1"><rect class="blink" x="${r2(cmdX)}" y="${r2(y0 + 2)}" width="${r2(CW)}" height="${r2(LH - 3)}" fill="${hex(P.fg)}"/></g>`);
  css.push(`.cur1{animation:slide ${CMD.length * T_CHAR}s steps(${CMD.length}) ${T_TYPE}s forwards,hide 0s ${T_SPIN}s forwards;--d:${r2(CMD.length * CW)}px}`);

  // spinner line (where the card will appear)
  const spinY = baseline(cardTop);
  const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  const spinStep = 0.08;
  const spinN = Math.round(SPIN_MS / spinStep);
  for (let k = 0; k < spinN; k++) {
    body.push(`<text x="${PAD}" y="${spinY}" class="t sp" style="animation-delay:${r2(T_SPIN + k * spinStep)}s" fill="${hex(P.dim)}">${frames[k % frames.length]}</text>`);
  }
  body.push(`<text x="${r2(PAD + 2 * CW)}" y="${spinY}" class="t spl" fill="${hex(P.dim)}">fetching phimaii@latest</text>`);
  css.push(`.sp{opacity:0;animation:flash ${spinStep}s steps(1) forwards}`);
  css.push(`.spl{opacity:0;animation:show 0s ${T_SPIN}s forwards,hide 0s ${T_CARD}s forwards}`);

  // portrait: braille decoded into dots, one path per row
  const BITS = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [1, 3]];
  const R = r2(Math.min(CW / 2, LH / 4) * 0.36);
  const maskUses = [];
  ART.forEach((line, i) => {
    let d = '';
    [...line].forEach((ch, x) => {
      const code = ch.codePointAt(0) - 0x2800;
      if (code <= 0 || code > 0xff) return;
      BITS.forEach(([bx, by], b) => {
        if (!(code & (1 << b))) return;
        const cx = r2(PAD + x * CW + CW * (bx ? 0.72 : 0.28));
        const cy = r2(cardTop + i * LH + LH * (0.125 + by * 0.25));
        d += `M${r2(cx - R)} ${cy}a${R} ${R} 0 1 0 ${r2(2 * R)} 0a${R} ${R} 0 1 0 ${r2(-2 * R)} 0`;
      });
    });
    if (!d) return;
    defs.push(`<path id="a${i}" d="${d}"/>`);
    const delay = r2(T_CARD + (i / (ART.length + 1)) * SCAN);
    body.push(`<use href="#a${i}" class="ar" style="--c:${hex(rowColor(i))};animation-delay:${delay}s" fill="${hex(rowColor(i))}"/>`);
    maskUses.push(`<use href="#a${i}" fill="#fff"/>`);
  });
  css.push(`.ar{opacity:0;animation:scan .3s ease-out forwards}`);
  css.push(`@keyframes scan{0%{opacity:1;fill:#fff}100%{opacity:1;fill:var(--c)}}`);

  // shimmer: a soft diagonal band of light, masked to the dots
  const artW = ART_COLS * CW;
  const artH = ART.length * LH;
  defs.push(`<linearGradient id="band" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<mask id="dots" maskUnits="userSpaceOnUse">${maskUses.join('')}</mask>`);
  body.push(`<g mask="url(#dots)"><rect class="shim" x="${r2(PAD - 120)}" y="${r2(cardTop - artH)}" width="90" height="${r2(artH * 3)}" fill="url(#band)" transform-origin="${r2(PAD)} ${r2(cardTop + artH / 2)}"/></g>`);
  css.push(`.shim{opacity:0;transform:rotate(-30deg) translateX(0);animation:shim ${SHIMMER}s ease-in-out ${T_SHIMMER}s forwards}`);
  css.push(`@keyframes shim{0%{opacity:1;transform:rotate(-30deg) translateX(0)}100%{opacity:1;transform:rotate(-30deg) translateX(${r2(artW + 260)}px)}}`);

  // info lines, each typed out by a sliding cover
  const swatches = [P.blue, P.lilac, P.pink, P.orange, P.yellow, P.green, P.cyan, P.fg];
  info.forEach((line, j) => {
    const top = cardTop + j * LH;
    const start = r2(T_CARD + TYPE_START + j * STAGGER);
    let len;
    if (line === 'swatches' || line === 'swatches-light') {
      swatches.forEach((c, k) => {
        const col = line === 'swatches' ? c : mix(c, P.white, 0.35);
        body.push(`<rect x="${r2(INFO_X + k * 3 * CW)}" y="${r2(top + 1)}" width="${r2(3 * CW + 0.5)}" height="${r2(LH - 1)}" fill="${hex(col)}"/>`);
      });
      len = 24;
    } else {
      if (!line.length) return;
      const spans = line.map((s) => `<tspan fill="${hex(s.color)}"${s.bold ? ' font-weight="700"' : ''}>${esc(s.text)}</tspan>`).join('');
      body.push(`<text x="${r2(INFO_X)}" y="${baseline(top)}" class="t">${spans}</text>`);
      len = line.reduce((n, s) => n + [...s.text].length, 0);
    }
    // cover is a bit wider than the text and slides fully past it, so fonts that are
    // slightly wider than 0.6em never leave the last characters hidden
    const coverW = r2(len * CW * 1.2 + 12);
    body.push(`<rect class="ic" style="--d:${coverW}px;animation-timing-function:steps(${len});animation-delay:${start}s" x="${r2(INFO_X - 1)}" y="${r2(top)}" width="${coverW}" height="${r2(LH + 0.5)}" fill="${P.bg}"/>`);
  });
  css.push(`.ic{animation-name:slide;animation-duration:${TYPE_DUR}s;animation-fill-mode:forwards}`);

  // final prompt with a blinking cursor
  const eb = baseline(endY);
  body.push(`<g class="end"><text x="${PAD}" y="${eb}" class="t"><tspan fill="${hex(P.green)}">➜</tspan> <tspan fill="${hex(P.blue)}">~</tspan></text><rect class="blink" x="${r2(cmdX)}" y="${r2(endY + 2)}" width="${r2(CW)}" height="${r2(LH - 3)}" fill="${hex(P.fg)}"/></g>`);
  css.push(`.end{opacity:0;animation:show 0s ${r2(T_END)}s forwards}`);

  css.push(`.blink{animation:blink 1.1s steps(1) infinite}`);
  css.push(`@keyframes blink{50%{opacity:0}}`);
  css.push(`@keyframes slide{to{transform:translateX(var(--d))}}`);
  css.push(`@keyframes show{to{opacity:1}}`);
  css.push(`@keyframes hide{to{opacity:0}}`);
  css.push(`@keyframes flash{0%{opacity:1}100%{opacity:0}}`);
  css.push(`.t{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:${FS}px;white-space:pre}`);
  css.push(`@media (prefers-reduced-motion:reduce){*{animation-duration:0s!important;animation-delay:0s!important}.blink{animation:none!important}}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Terminal running npx phimaii: PhiMaii's card">
<title>npx phimaii</title>
<style>${css.join('\n')}</style>
<defs>${defs.join('')}</defs>
${body.join('\n')}
</svg>
`;
}

fetchGitHub().then((gh) => {
  const svg = render(buildInfo(gh));
  fs.writeFileSync(out, svg);
  console.log(`wrote ${out} (${(svg.length / 1024).toFixed(1)} kB, live data: ${gh ? 'yes' : 'no'})`);
});
