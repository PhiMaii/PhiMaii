/*!
 * <phimaii-terminal>: a tiny fake terminal that runs `npx phimaii` when it scrolls into view.
 * Zero dependencies. Embed:
 *   <script src="phimaii-terminal.js" defer></script>
 *   <phimaii-terminal></phimaii-terminal>
 */
(() => {
  'use strict';
  if (customElements.get('phimaii-terminal')) return;

  // Braille portrait. Generated from card/art.js by terminal/sync-art.js: do not edit by hand.
  /* ART:START */
  const ART = [
    "                ⣀⣀⣀⣀",
    "           ⢀⡤⡲⡫⢹⠰⡱⡸⢐⢫⢹⠢⡀",
    "           ⣎⡪⣔⢎⣎⡼⣰⣱⣱⣑⡅⡇⢎⢢⡀",
    "        ⢀⢴⢹⢕⢯⣺⢵⣳⣻⣳⣟⣞⢷⡯⣗⣇⢣⡇",
    "        ⢸⡕⣕⡯⣗⡯⣟⣽⢾⣻⡾⣟⣿⡽⣷⢽⣢⡹",
    "        ⢸⢵⢕⢽⣪⢯⣷⣿⣯⣿⣽⣿⣾⣻⣯⢗⣗⡇",
    "        ⢸⡱⣫⠚⡪⡱⡰⣪⢯⢿⡽⡪⣢⣇⣍⡓⢗⡇",
    "        ⣨⢊⢆⢾⣱⣱⡼⡵⡒⣵⡸⣗⣥⣮⣍⢇⡗⣧",
    "        ⣟⡜⡵⡸⡹⠵⢟⠟⡬⣗⣗⡝⣟⢞⢏⣮⢏⡞",
    "        ⢳⡪⡪⡺⡽⣿⡻⡝⡜⣝⡕⡽⣏⢿⣟⢮⡣⡇",
    "        ⠈⠚⣼⢱⢿⣗⠝⣎⣏⣗⣝⡚⡫⣵⡿⡽⡜",
    "          ⣇⠯⢝⡿⡯⣖⣷⣵⣷⣻⣟⣿⢫⢧⠃",
    "          ⣗⡍⡎⢎⢯⢻⢺⣺⣫⢗⢗⠭⣃⢇",
    "         ⢀⡷⡸⡸⡨⡊⡎⡏⡞⢜⢊⢎⣼⢞⣽⠝⢄",
    "      ⢀⡠⠔⠁⣷⡑⡯⣪⠮⣪⡾⣼⢵⣻⣻⣷⣿⢟⠀⢄⢑⢄",
    " ⣀⡠⠤⠒⠉⠁⠊⠀⠨⣿⣻⣮⣳⢝⢵⣻⣵⣿⣾⣿⣿⡋⢄⠪⡐⢌⡂⠋⠒⠤⣀⡀",
    "⠉⠀⠀⠀⠀⠀⠀⠀⠠⡽⣫⢿⣻⡿⣾⢺⣿⢟⣟⢟⣿⠗⠈⠂⡑⠈⠀⠀⠀⠀⠀⠈⠈⠑⠲⡤",
    "⠀⠀⠀⠀⠀⠀⢈⠂⢸⡗⣳⢳⡳⣝⡗⡷⣫⡵⣺⠾⡏⠀⡢⠂⢅⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
    "⠀⡐⠄⠀⠀⠀⠃⢌⢺⣿⣜⣟⣯⣾⣾⣷⣧⣯⡫⡟⡐⢅⠪⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀",
    "⠈⠠⠂⠀⠀⠀⡐⢅⠸⣿⣽⣿⣻⣿⣿⣿⣿⣿⡿⡐⡅⠕⡨⠂⡊⠀⠀⠠⡀⠀⠀⠀⠀⡠⠨⡀",
    "⠀⠀⠀⠀⠀⠘⠀⢑⠌⣿⢿⣽⣿⣿⣿⣿⣾⣿⢐⢔⠅⢕⠨⠊⠀⠀⢐⠔⢨⠀⠀⠀⠀⡪⠂⡣"
  ];
  /* ART:END */

  const P = {
    bg: '#1a1b26', bar: '#16161e', border: '#2a2b3d',
    blue: [122, 162, 247], lilac: [187, 154, 247], pink: [247, 118, 142],
    green: [158, 206, 106], orange: [255, 158, 100], yellow: [224, 175, 104],
    cyan: [125, 207, 255], fg: [192, 202, 245], dim: [86, 95, 137], white: [255, 255, 255],
  };
  const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
  function gradientAt(t) {
    const stops = [P.blue, P.lilac, P.pink];
    const s = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    const i = Math.min(Math.floor(s), stops.length - 2);
    return mix(stops[i], stops[i + 1], s - i);
  }
  const rowColor = (i) => gradientAt(i / Math.max(1, ART.length - 1));

  // ------------------------------------------------------------ content (mirrors the npm card)

  const FUN_FACTS = [
    'built a volume knob, PCB to app',
    'Stream Deck plugins for all',
    'wrote a Minecraft TNT logger',
    'WiFi countdown on an ESP8266',
    'spins motors with Clarke & Park',
    'wakes PCs over LAN in 1 click',
  ];
  const GITHUB_USER = 'PhiMaii';

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
  function zurichNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
    const m = parts.find((p) => p.type === 'minute').value;
    const mood = h < 5 ? 'night owl mode' : h < 12 ? 'good morning' : h < 18 ? 'good afternoon' : h < 22 ? 'good evening' : 'good night';
    return `${String(h).padStart(2, '0')}:${m} · ${mood}`;
  }
  const fit = (t, max = 31) => ([...t].length > max ? [...t].slice(0, max - 1).join('') + '…' : t);

  let githubCache = null;
  function fetchGitHub() {
    if (githubCache) return githubCache;
    const get = (path) => fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
    const data = Promise.all([get(`/users/${GITHUB_USER}`), get(`/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`)])
      .then(([user, repos]) => {
        const own = repos.filter((r) => !r.fork);
        const latest = own.find((r) => r.name.toLowerCase() !== GITHUB_USER.toLowerCase());
        return {
          repos: user.public_repos,
          stars: own.reduce((n, r) => n + r.stargazers_count, 0),
          since: new Date(user.created_at),
          lastPush: latest ? { name: latest.name, at: new Date(latest.pushed_at) } : null,
        };
      })
      .catch(() => null);
    githubCache = Promise.race([data, timeout]);
    return githubCache;
  }

  function buildInfo(gh) {
    const seg = (text, color, o = {}) => ({ text, color, ...o });
    const field = (label, value, color = P.blue, valueColor = P.fg) => [seg(label.padEnd(10), color, { bold: true }), seg(value, valueColor)];
    const since = gh ? gh.since : new Date('2022-09-26');
    const swatches = [P.blue, P.lilac, P.pink, P.orange, P.yellow, P.green, P.cyan, P.fg];
    return [
      [seg('phimaii', P.lilac, { bold: true }), seg('@', P.fg), seg('eth-zurich', P.pink, { bold: true })],
      [seg('-'.repeat(18), P.dim)],
      field('OS', 'Student @ ETH Zürich'),
      field('Location', `Zürich · ${zurichNow()}`),
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
      field('Fun fact', FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)], P.yellow),
      [],
      swatches.map((c) => seg('   ', null, { bg: c })),
      swatches.map((c) => seg('   ', null, { bg: mix(c, P.white, 0.35) })),
    ];
  }

  // ------------------------------------------------------------ styles

  const STYLE = `
    :host { display: block; max-width: 760px; margin: 0 auto; --font: "JetBrains Mono", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace; }
    .win { background: ${P.bg}; border: 1px solid ${P.border}; border-radius: 10px; overflow: hidden;
           box-shadow: 0 20px 50px -20px rgba(0,0,0,.6); font-family: var(--font); color: ${css(P.fg)}; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: ${P.bar}; border-bottom: 1px solid ${P.border}; }
    .dot { width: 12px; height: 12px; border-radius: 50%; flex: none; }
    .title { flex: 1; text-align: center; font-size: 12px; color: ${css(P.dim)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .replay { all: unset; cursor: pointer; font-size: 14px; color: ${css(P.dim)}; padding: 0 4px; border-radius: 4px; }
    .replay:hover, .replay:focus-visible { color: ${css(P.fg)}; background: ${P.border}; }
    .screen { padding: 14px 16px 16px; font-size: var(--fs, 13px); line-height: 1.25; min-height: calc(26 * 1.25em); white-space: pre; overflow: hidden; }
    .line { min-height: 1.25em; }
    .prompt { color: ${css(P.green)}; }
    .path { color: ${css(P.blue)}; }
    .muted { color: ${css(P.dim)}; }
    .card { display: grid; grid-template-columns: 37ch auto; column-gap: 1ch; margin: .6em 0; }
    .card.stacked { grid-template-columns: auto; }
    .art, .info { display: flex; flex-direction: column; }
    .card.stacked .info { margin-top: 1.25em; }
    .row { height: 1.25em; }
    .art canvas { display: block; }
    .probe { position: absolute; visibility: hidden; }
    .b { font-weight: 700; }
    .cursor { display: inline-block; width: .6em; height: 1.1em; vertical-align: text-bottom; background: ${css(P.fg)}; animation: blink 1.1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    a { color: inherit; }
  `;

  // ------------------------------------------------------------ element

  const PROMPT = '<span class="prompt">➜</span> <span class="path">~</span> ';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class PhimaiiTerminal extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>${STYLE}</style>
        <div class="win" role="region" aria-label="Terminal running npx phimaii">
          <div class="bar">
            <span class="dot" style="background:#ff5f57"></span>
            <span class="dot" style="background:#febc2e"></span>
            <span class="dot" style="background:#28c840"></span>
            <span class="title">phimaii — zsh</span>
            <button class="replay" title="Run again" aria-label="Run again">↻</button>
          </div>
          <div class="screen" aria-live="polite"></div>
        </div>`;
      this.screen = root.querySelector('.screen');
      this.win = root.querySelector('.win');
      root.querySelector('.replay').addEventListener('click', () => this.run());
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Scale the font so 80 columns fit; stack the card on narrow screens
      this.resize = new ResizeObserver(() => this.fitFont());
      this.resize.observe(this.win);

      this.showIdle();
      // Run once when it scrolls into view
      this.io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { this.io.disconnect(); this.run(); }
      }, { threshold: 0.35 });
      this.io.observe(this);
      fetchGitHub(); // warm up the live data early
    }

    disconnectedCallback() {
      this.io && this.io.disconnect();
      this.resize && this.resize.disconnect();
      this.runId = (this.runId || 0) + 1;
    }

    fitFont() {
      const w = this.win.clientWidth - 32;
      const charW = 0.6; // approx. width of a monospace char in em
      let fs = w / (79 * charW);
      this.stacked = fs < 10;
      if (this.stacked) fs = w / (42 * charW);
      this.style.setProperty('--fs', `${Math.max(7, Math.min(14, fs)).toFixed(2)}px`);
      const card = this.screen.querySelector('.card');
      if (card) card.classList.toggle('stacked', this.stacked);
      if (this._last && !this._animating) this.paint(...this._last);
    }

    showIdle() {
      this.screen.innerHTML = `<div class="line">${PROMPT}<span class="cursor"></span></div>`;
    }

    async run() {
      const id = (this.runId = (this.runId || 0) + 1);
      this._last = null;
      const alive = () => id === this.runId;
      const ghPromise = fetchGitHub();

      // 1. type the command
      this.screen.innerHTML = `<div class="line">${PROMPT}<span class="cmd"></span><span class="cursor"></span></div>`;
      const cmd = this.screen.querySelector('.cmd');
      const text = 'npx phimaii';
      if (!this.reduced) {
        await sleep(350);
        for (let i = 1; i <= text.length; i++) {
          if (!alive()) return;
          cmd.textContent = text.slice(0, i);
          await sleep(55 + Math.random() * 60);
        }
        await sleep(300);
      } else {
        cmd.textContent = text;
      }
      if (!alive()) return;
      this.screen.querySelector('.cursor').remove();

      // 2. a short "download" spinner while the GitHub data arrives
      const spin = document.createElement('div');
      spin.className = 'line muted';
      this.screen.appendChild(spin);
      const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
      let f = 0;
      const spinner = setInterval(() => { spin.textContent = `${frames[f++ % frames.length]} fetching phimaii@latest`; }, 80);
      const gh = await Promise.race([ghPromise, sleep(this.reduced ? 0 : 900).then(() => ghPromise)]);
      clearInterval(spinner);
      if (!alive()) return;
      spin.remove();

      // 3. the card
      const { card, artCells, artRows, infoRows } = this.buildCard(buildInfo(gh));
      this.screen.appendChild(card);
      this.fitFont();
      if (this.reduced) {
        this._last = [artCells, artRows, infoRows, Infinity, () => Infinity, null];
        this.paint(...this._last);
      } else {
        await this.animate(artCells, artRows, infoRows, alive);
        if (!alive()) return;
      }

      // 4. back to the prompt
      const end = document.createElement('div');
      end.className = 'line';
      end.innerHTML = `${PROMPT}<span class="cursor"></span>`;
      this.screen.appendChild(end);
    }

    buildCard(info) {
      const card = document.createElement('div');
      card.className = 'card' + (this.stacked ? ' stacked' : '');
      const art = document.createElement('div');
      art.className = 'art';
      art.setAttribute('aria-hidden', 'true');
      // The portrait is drawn on a canvas: braille glyphs are tiny and vary between
      // fonts, so each character is decoded into its 2x4 dots and painted directly.
      const canvas = document.createElement('canvas');
      art.appendChild(canvas);
      const artCells = { canvas };
      const artRows = null;
      const infoEl = document.createElement('div');
      infoEl.className = 'info';
      const infoRows = info.map((segs) => {
        const row = document.createElement('div');
        row.className = 'row';
        const spans = segs.map((sg) => {
          const s = document.createElement('span');
          if (sg.bold) s.className = 'b';
          if (sg.color) s.style.color = css(sg.color);
          if (sg.bg) s.style.background = css(sg.bg);
          row.appendChild(s);
          return { el: s, text: sg.text };
        });
        infoEl.appendChild(row);
        return spans;
      });
      card.append(art, infoEl);
      return { card, artCells, artRows, infoRows };
    }

    // Draw one frame: scan progress, typing progress per info line, shimmer position
    sizeCanvas(canvas) {
      // measure one monospace cell in the current font size
      const probe = document.createElement('span');
      probe.className = 'probe';
      probe.textContent = '0000000000';
      this.screen.appendChild(probe);
      const cw = probe.getBoundingClientRect().width / 10;
      const lh = parseFloat(getComputedStyle(this.screen).fontSize) * 1.25;
      probe.remove();
      const dpr = window.devicePixelRatio || 1;
      const cols = 37;
      canvas.style.width = `${cols * cw}px`;
      canvas.style.height = `${ART.length * lh}px`;
      canvas.width = Math.round(cols * cw * dpr);
      canvas.height = Math.round(ART.length * lh * dpr);
      canvas._m = { cw, lh, dpr };
    }

    paint(artCells, artRows, infoRows, scan, infoChars, shimmer) {
      const canvas = artCells.canvas;
      if (!canvas._m || this._lastFs !== this.style.getPropertyValue('--fs')) {
        this._lastFs = this.style.getPropertyValue('--fs');
        this.sizeCanvas(canvas);
      }
      const { cw, lh, dpr } = canvas._m;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const r = Math.max(0.6, Math.min(cw / 2, lh / 4) * 0.36); // dot radius
      // braille bit -> (column, row) inside the 2x4 cell
      const BITS = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [1, 3]];
      ART.forEach((line, i) => {
        const revealed = scan === Infinity || i < scan - 1;
        const isScan = !revealed && i === Math.floor(scan - 1);
        if (!revealed && !isScan) return;
        const base = rowColor(i);
        [...line].forEach((ch, x) => {
          const code = ch.codePointAt(0) - 0x2800;
          if (code <= 0 || code > 0xff) return;
          let c = base;
          if (isScan) c = P.white;
          else if (shimmer !== null) {
            const d = x * 0.45 + i - shimmer;
            c = mix(base, P.white, 0.85 * Math.exp(-(d * d) / 6));
          }
          ctx.fillStyle = css(c);
          ctx.beginPath();
          BITS.forEach(([bx, by], b) => {
            if (!(code & (1 << b))) return;
            const cx = x * cw + cw * (bx ? 0.72 : 0.28);
            const cy = i * lh + lh * (0.125 + by * 0.25);
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
          });
          ctx.fill();
        });
      });
      infoRows.forEach((spans, i) => {
        let left = infoChars(i);
        spans.forEach(({ el, text }) => {
          const chars = [...text];
          const n = Math.max(0, Math.min(chars.length, left));
          el.textContent = chars.slice(0, n).join('');
          left -= n;
        });
      });
    }

    animate(artCells, artRows, infoRows, alive) {
      const SCAN_MS = 650, TYPE_START = 120, TYPE_STAGGER = 40, TYPE_MS = 260;
      const SHIMMER_START = 1150, SHIMMER_MS = 1100, END = SHIMMER_START + SHIMMER_MS;
      const lens = infoRows.map((spans) => spans.reduce((n, s) => n + [...s.text].length, 0));
      const artWidth = Math.max(...ART.map((l) => [...l].length));
      return new Promise((resolve) => {
        this._animating = true;
        const t0 = performance.now();
        const step = (now) => {
          if (!alive()) { this._animating = false; return resolve(); }
          const t = now - t0;
          if (t >= END) {
            this._animating = false;
            this._last = [artCells, artRows, infoRows, Infinity, () => Infinity, null];
            this.paint(...this._last);
            return resolve();
          }
          const scan = t >= SCAN_MS ? Infinity : (t / SCAN_MS) * (ART.length + 1);
          const infoChars = (i) => Math.max(0, Math.floor(((t - TYPE_START - i * TYPE_STAGGER) / TYPE_MS) * (lens[i] || 1)));
          const shimmer = t < SHIMMER_START ? null : -8 + ((t - SHIMMER_START) / SHIMMER_MS) * (artWidth * 0.45 + ART.length + 16);
          this.paint(artCells, artRows, infoRows, scan, infoChars, shimmer);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
  }

  customElements.define('phimaii-terminal', PhimaiiTerminal);
})();
