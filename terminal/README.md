# phimaii-terminal

A tiny fake terminal for the web. When it scrolls into view, it types `npx phimaii` and plays my
neofetch-style card ([npm: phimaii](https://www.npmjs.com/package/phimaii)) with the same scan,
typing and shimmer animation as the real CLI, including live GitHub stats and Zürich time.

- One file, zero dependencies, ~19 kB unminified
- Web component with Shadow DOM, so your site's CSS can't break it (and it can't break yours)
- Scales to fit its container; stacks the card on phones
- Respects `prefers-reduced-motion` (shows the final card without animation)
- ↻ button in the title bar replays it

## Embed

```html
<script src="phimaii-terminal.js" defer></script>

<phimaii-terminal></phimaii-terminal>
```

The script is hosted on GitHub Pages, deployed automatically from this folder:

```html
<script src="https://phimaii.github.io/PhiMaii/phimaii-terminal.js" defer></script>
```

Demo page: https://phimaii.github.io/PhiMaii/

You can also just copy `phimaii-terminal.js` next to your page.

### Sizing

The element is `display: block` with `max-width: 760px`, centered. Override it from your page:

```css
phimaii-terminal { max-width: 900px; margin: 2rem auto; }
```

## Try it locally

```bash
cd terminal && python3 -m http.server 8000
```

Then open http://localhost:8000 and scroll down.

## Notes

- The portrait is drawn on a `<canvas>` from braille data: each braille character is decoded into
  its 2×4 dots, so it looks crisp in every browser, regardless of font support for braille.
- Live data comes from the public GitHub API (60 requests/hour per visitor IP, 2 per run). If it's
  slow or unavailable, the card falls back to static text after 2.5 s.
- The portrait is copied from `../card/art.js` by `node terminal/sync-art.js`. The deploy workflow
  runs it automatically, so a new portrait in the npm card also lands on the web.
- The info rows mirror `../card/index.js`. When you change those, update `buildInfo()` here too.

## Deploy

`.github/workflows/deploy-terminal.yml` publishes `index.html` and `phimaii-terminal.js` to GitHub
Pages on every push to `main` that touches `terminal/` or `card/art.js`. It takes about a minute.
