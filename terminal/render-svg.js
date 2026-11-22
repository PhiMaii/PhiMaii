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
//
// The whole run loops forever (like the snake on the profile), because an SVG that plays only
// once is often already finished when people see it: browsers reuse the cached image and its
// animation clock on reload, and on phones the README starts far below the fold.
//
// Every animated element gets its own @keyframes spanning the full loop, so all of them restart
// together at the start of each cycle.

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

  // ---- timeline of one loop (seconds)
  const CMD = 'npx phimaii', T_CHAR = 0.09;
  const T_TYPE = 0.6;
  const T_TYPED = T_TYPE + CMD.length * T_CHAR;
  const T_SPIN = T_TYPED + 0.3, SPIN = 0.9;
  const T_CARD = T_SPIN + SPIN;
  const SCAN = 0.65, TYPE_START = 0.12, STAGGER = 0.04, TYPE_DUR = 0.26;
  const T_SHIMMER = T_CARD + 1.15, SHIMMER = 1.1;
  const T_END = T_SHIMMER + SHIMMER;            // card done, new prompt
  const HOLD = 8;                               // time to read the card
  const CLEAR = 'clear';
  const T_CLEAR_TYPE = T_END + HOLD;
  const T_CLEAR = T_CLEAR_TYPE + CLEAR.length * T_CHAR + 0.35; // "Enter": screen empties
  const LOOP = r2(T_CLEAR + 0.01);                              // ...and the next run starts

  const css = [];
  const body = [];
  const defs = [];
  let kfId = 0;

  // Build a looping animation from (time, css) stops. `tf` is the timing function used from
  // that stop to the next one (default: hold the value, i.e. a hard cut).
  const pct = (t) => `${Math.min(100, Math.max(0, (t / LOOP) * 100)).toFixed(3)}%`;
  function loop(stops) {
    const name = `k${kfId++}`;
    const frames = stops
      .sort((x, y) => x[0] - y[0])
      .map(([t, decl, tf = 'steps(1,end)']) => `${pct(t)}{${decl};animation-timing-function:${tf}}`)
      .join('');
    css.push(`@keyframes ${name}{${frames}}`);
    return `animation:${name} ${LOOP}s infinite`;
  }
  // translateX stops for typing `n` characters of width `step` starting at `t`
  const typing = (t, n, dt, step, prop = (x) => `transform:translateX(${r2(x)}px)`) =>
    Array.from({ length: n + 1 }, (_, k) => [t + k * dt, prop(k * step)]);

  // ---- window chrome
  body.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${P.bg}" stroke="${P.border}"/>`);
  body.push(`<path d="M10.5 0.5h${W - 21}a10 10 0 0 1 10 10v${BAR - 10.5}h-${W - 1}v-${BAR - 10.5}a10 10 0 0 1 10-10z" fill="${P.bar}"/>`);
  body.push(`<line x1="0.5" y1="${BAR}" x2="${W - 0.5}" y2="${BAR}" stroke="${P.border}"/>`);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => body.push(`<circle cx="${18 + i * 20}" cy="${BAR / 2}" r="6" fill="${c}"/>`));
  body.push(`<text x="${W / 2}" y="${BAR / 2 + 4}" text-anchor="middle" class="t" font-size="12" fill="${hex(P.dim)}">phimaii — zsh</text>`);

  // ---- line 1: prompt, typed command, cursor
  const cmdX = PAD + 4 * CW; // after "➜ ~ "
  const prompt = (y) => `<text x="${PAD}" y="${y}" class="t"><tspan fill="${hex(P.green)}">➜</tspan> <tspan fill="${hex(P.blue)}">~</tspan></text>`;
  const yb = baseline(y0);
  body.push(prompt(yb));
  body.push(`<text x="${cmdX}" y="${yb}" class="t" fill="${hex(P.fg)}">${CMD}</text>`);
  // a background-coloured cover slides right one character at a time, revealing the command;
  // it is a bit wider than the text so slightly wider fonts never leave a letter hidden
  const cmdCover = r2(CMD.length * CW * 1.2 + 12);
  body.push(`<rect x="${r2(cmdX)}" y="${r2(y0)}" width="${cmdCover}" height="${r2(LH)}" fill="${P.bg}" style="transform:translateX(${cmdCover}px);${loop([
    [0, 'transform:translateX(0px)'],
    ...typing(T_TYPE, CMD.length, T_CHAR, CW).slice(1, -1),
    [T_TYPED, `transform:translateX(${cmdCover}px)`],
    [T_CLEAR, 'transform:translateX(0px)'],
  ])}"/>`);
  // cursor: follows the typing, disappears on "Enter", comes back after `clear`
  const cursor = (x, top) => `<rect class="blink" x="${r2(x)}" y="${r2(top + 2)}" width="${r2(CW)}" height="${r2(LH - 3)}" fill="${hex(P.fg)}"/>`;
  body.push(`<g style="opacity:0;${loop([
    [0, 'opacity:1;transform:translateX(0px)'],
    ...typing(T_TYPE, CMD.length, T_CHAR, CW, (x) => `opacity:1;transform:translateX(${r2(x)}px)`).slice(1),
    [T_SPIN, 'opacity:0'],
    [T_CLEAR, 'opacity:1;transform:translateX(0px)'],
  ])}">${cursor(cmdX, y0)}</g>`);

  // ---- spinner (on the line where the card will appear)
  const spinY = baseline(cardTop);
  const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  const spinStep = 0.08;
  const spinN = Math.round(SPIN / spinStep);
  for (let k = 0; k < spinN; k++) {
    const t = T_SPIN + k * spinStep;
    body.push(`<text x="${PAD}" y="${spinY}" class="t" fill="${hex(P.dim)}" style="opacity:0;${loop([
      [0, 'opacity:0'], [t, 'opacity:1'], [t + spinStep, 'opacity:0'],
    ])}">${frames[k % frames.length]}</text>`);
  }
  body.push(`<text x="${r2(PAD + 2 * CW)}" y="${spinY}" class="t" fill="${hex(P.dim)}" style="opacity:0;${loop([
    [0, 'opacity:0'], [T_SPIN, 'opacity:1'], [T_CARD, 'opacity:0'],
  ])}">fetching phimaii@latest</text>`);

  // ---- portrait: braille decoded into dots, one path per row, revealed by a scan line
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
    const c = hex(rowColor(i));
    const t = T_CARD + (i / (ART.length + 1)) * SCAN;
    body.push(`<use href="#a${i}" fill="${c}" style="${loop([
      [0, 'opacity:0'],
      [t, `opacity:1;fill:#fff`, 'ease-out'],
      [t + 0.3, `opacity:1;fill:${c}`],
      [T_CLEAR, 'opacity:0'],
    ])}"/>`);
    maskUses.push(`<use href="#a${i}" fill="#fff"/>`);
  });

  // ---- shimmer: a soft diagonal band of light, masked to the dots
  const artW = ART_COLS * CW;
  const artH = ART.length * LH;
  defs.push(`<linearGradient id="band" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<mask id="dots" maskUnits="userSpaceOnUse">${maskUses.join('')}</mask>`);
  const rot = 'rotate(-30deg)';
  body.push(`<g mask="url(#dots)"><rect x="${r2(PAD - 120)}" y="${r2(cardTop - artH)}" width="90" height="${r2(artH * 3)}" fill="url(#band)" transform-origin="${r2(PAD)} ${r2(cardTop + artH / 2)}" style="opacity:0;${loop([
    [0, `opacity:0;transform:${rot} translateX(0px)`],
    [T_SHIMMER, `opacity:1;transform:${rot} translateX(0px)`, 'ease-in-out'],
    [T_SHIMMER + SHIMMER, `opacity:0;transform:${rot} translateX(${r2(artW + 260)}px)`],
  ])}"/></g>`);

  // ---- info lines, each typed out by a sliding cover
  const swatches = [P.blue, P.lilac, P.pink, P.orange, P.yellow, P.green, P.cyan, P.fg];
  info.forEach((line, j) => {
    const top = cardTop + j * LH;
    let len;
    if (line === 'swatches' || line === 'swatches-light') {
      swatches.forEach((c, k) => {
        const col = line === 'swatches' ? c : mix(c, P.white, 0.35);
        body.push(`<rect x="${r2(INFO_X + k * 3 * CW)}" y="${r2(top + 1)}" width="${r2(3 * CW + 0.5)}" height="${r2(LH - 1)}" fill="${hex(col)}"/>`);
      });
      len = 24;
    } else {
      if (!line.length) return;
      const spans = line.map((sg) => `<tspan fill="${hex(sg.color)}"${sg.bold ? ' font-weight="700"' : ''}>${esc(sg.text)}</tspan>`).join('');
      body.push(`<text x="${r2(INFO_X)}" y="${baseline(top)}" class="t">${spans}</text>`);
      len = line.reduce((n, sg) => n + [...sg.text].length, 0);
    }
    const coverW = r2(len * CW * 1.2 + 12);
    const start = T_CARD + TYPE_START + j * STAGGER;
    body.push(`<rect x="${r2(INFO_X - 2)}" y="${r2(top - 1)}" width="${coverW}" height="${r2(LH + 2)}" fill="${P.bg}" style="transform:translateX(${coverW}px);${loop([
      [0, 'transform:translateX(0px)'],
      [start, 'transform:translateX(0px)', `steps(${len},end)`],
      [start + TYPE_DUR, `transform:translateX(${coverW}px)`],
      [T_CLEAR, 'transform:translateX(0px)'],
    ])}"/>`);
  });

  // ---- last line: new prompt, then `clear` types itself and the loop restarts
  const eb = baseline(endY);
  const clearCover = r2(CLEAR.length * CW * 1.2 + 12);
  body.push(`<g style="${loop([[0, 'opacity:0'], [T_END, 'opacity:1'], [T_CLEAR, 'opacity:0']])}">
${prompt(eb)}
<text x="${cmdX}" y="${eb}" class="t" fill="${hex(P.fg)}">${CLEAR}</text>
<rect x="${r2(cmdX)}" y="${r2(endY)}" width="${clearCover}" height="${r2(LH)}" fill="${P.bg}" style="${loop([
    [0, 'transform:translateX(0px)'],
    ...typing(T_CLEAR_TYPE, CLEAR.length, T_CHAR, CW).slice(1, -1),
    [T_CLEAR_TYPE + CLEAR.length * T_CHAR, `transform:translateX(${clearCover}px)`],
  ])}"/>
<g style="${loop([
    [0, 'transform:translateX(0px)'],
    ...typing(T_CLEAR_TYPE, CLEAR.length, T_CHAR, CW).slice(1),
  ])}">${cursor(cmdX, endY)}</g>
</g>`);

  css.push(`.blink{animation:blink 1.1s steps(1) infinite}`);
  css.push(`@keyframes blink{50%{opacity:0}}`);
  css.push(`.t{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:${FS}px;white-space:pre}`);
  // reduced motion: no animation; every element's inline base style is the finished card
  css.push(`@media (prefers-reduced-motion:reduce){*{animation:none!important}}`);

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
