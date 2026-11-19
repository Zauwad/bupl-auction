/**
 * Generate the printable player catalogue (HTML) from
 * Final_Player_List.md + public/images/players/, then render to PDF via Playwright.
 *
 *   node scripts/generate-player-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SEGMENT_ORDER = ["Game Changer", "Stroke Maker", "Trump Card", "Assassin", "Young Blood"];
const SEGMENT_TAGLINE = {
  "Game Changer": "The headline acts — the names the room rises for.",
  "Stroke Maker": "Consistent, fluent, and always dangerous with the willow.",
  "Trump Card": "Match-ups, match-ups, match-ups — tactical aces for every plan.",
  "Assassin": "Clinical, ruthless, and lethal in the right conditions.",
  "Young Blood": "The future of the tournament — raw, athletic, hungry.",
};

// ---- Parse the markdown list ----
const md = fs.readFileSync(path.join(ROOT, "Final_Player_List.md"), "utf8");
const players = [];
for (const line of md.split("\n")) {
  const m = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(\d+)\*\*/);
  if (m) players.push({ name: m[1].trim(), segment: m[2].trim(), id: m[3].trim() });
}
if (players.length !== 50) {
  console.error(`Expected 50 players, parsed ${players.length}.`);
  process.exit(1);
}

// ---- Resolve images by ID ----
const imageDir = path.join(ROOT, "public", "images", "players");
const images = fs.readdirSync(imageDir).filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f));

// Downscale every photo to a print-adequate size for the PDF (keeps file modest), cached in /tmp
const resizeDir = path.join("/tmp", "player-catalogue-photos");
fs.rmSync(resizeDir, { recursive: true, force: true });
fs.mkdirSync(resizeDir, { recursive: true });
const { execFileSync } = await import("node:child_process");
const downscaled = new Map(); // source abs path -> resized abs path
const resizePhoto = (srcAbs) => {
  if (downscaled.has(srcAbs)) return downscaled.get(srcAbs);
  const ext = path.extname(srcAbs);
  const out = path.join(resizeDir, path.basename(srcAbs, ext) + ".jpg");
  execFileSync("sips", ["-Z", "640", "-s", "format", "jpeg", "-s", "formatOptions", "72", srcAbs, "--out", out], { stdio: "ignore" });
  downscaled.set(srcAbs, out.replace(/\\/g, "/"));
  return downscaled.get(srcAbs);
};

const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const photoPath = (id, name) => {
  const direct = images.find((f) => f.includes(id));
  const source = direct
    ? path.join(imageDir, direct)
    : (() => {
        // Fallback for a filename that carries no ID (e.g. "IMG_2152 - FARDEEN SHAHRIAR SHOCCHO.webp")
        const tokens = norm(name).split(" ").filter((t) => t.length > 3);
        if (tokens.length === 0) return null;
        const nameHit = images.find((f) => {
          const nf = norm(f.replace(/\.[^.]+$/, ""));
          return tokens.every((t) => nf.includes(t));
        });
        return nameHit ? path.join(imageDir, nameHit) : null;
      })();
  if (!source) return null;
  return `file://${resizePhoto(source)}`;
};
const bySegment = new Map(SEGMENT_ORDER.map((s) => [s, []]));
for (const p of players) {
  p.photo = photoPath(p.id, p.name);
  if (!p.photo) console.warn(`!! no photo for ${p.id} ${p.name}`);
  bySegment.get(p.segment).push(p);
}

// ---- Render HTML ----
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const css = `
@page {
  size: A4;
  margin: 14mm 14mm 16mm 14mm;
  @bottom-left { content: "BUPL Cricket Auction  ·  Player Catalogue 2026"; font-size: 6.5pt; color: #8a7a52; font-family: Georgia, serif; letter-spacing: .18em; text-transform: uppercase; }
  @bottom-right { content: "Page " counter(page); font-size: 6.5pt; color: #8a7a52; font-family: Georgia, serif; }
  @top-right { content: ""; }
}
* { box-sizing: border-box; margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body {
  font-family: Georgia, "Times New Roman", serif;
  background: #f7f3e8;
  color: #1c1a17;
  -webkit-font-smoothing: antialiased;
}
.cover {
  break-after: page;
  height: 267mm; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #12100d;
  color: #f5d87a;
  position: relative; overflow: hidden;
}
.cover::before {
  content: "";
  position: absolute; inset: 12mm;
  border: 1mm solid rgba(245, 216, 122, 0.25); border-radius: 4px;
}
.cover-inner { text-align: center; padding: 0 24mm; position: relative; }
.cover-eyebrow { font-size: 8pt; letter-spacing: .5em; text-transform: uppercase; color: #b8a25a; margin-bottom: 8mm; }
.cover-title { font-size: 46pt; line-height: .95; font-weight: 900; letter-spacing: .02em; text-transform: uppercase; }
.cover-title em { color: #e5c15a; font-style: normal; }
.cover-rule { width: 60mm; height: 1.2mm; background: #e5c15a; margin: 8mm auto; }
.cover-sub { font-size: 10.5pt; color: #d9cba1; letter-spacing: .3em; text-transform: uppercase; margin-top: 6mm; }
.cover-meta { display: flex; gap: 12mm; justify-content: center; margin-top: 10mm; }
.cover-meta div { text-align: center; }
.cover-meta .num { font-size: 28pt; font-weight: 900; color: #f5d87a; }
.cover-meta .lbl { font-size: 7pt; letter-spacing: .32em; text-transform: uppercase; color: #a8946a; margin-top: 1.5mm; }

.segment-page { break-before: page; }
.seg-head {
  border-bottom: 1.4pt solid #12100d; padding-bottom: 4mm; margin-bottom: 5mm;
  display: flex; align-items: flex-end; justify-content: space-between;
}
.seg-eyebrow { font-size: 7pt; letter-spacing: .4em; text-transform: uppercase; color: #8a7a52; }
.seg-name { font-size: 34pt; font-weight: 900; line-height: 1; text-transform: uppercase; letter-spacing: .01em; margin-top: 1.5mm; }
.seg-tag { margin-top: 1.5mm; font-size: 8.5pt; font-style: italic; color: #5a5245; }
.seg-count { text-align: right; }
.seg-count .n { font-size: 40pt; font-weight: 900; line-height: 1; color: #12100d; }
.seg-count .l { font-size: 7pt; letter-spacing: .3em; text-transform: uppercase; color: #8a7a52; }

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5mm;
}

.card {
  display: flex;
  background: #ffffff;
  border: 0.6pt solid #d8d2c2;
  border-radius: 3px;
  overflow: hidden;
  height: 58mm;
  break-inside: avoid;
  box-shadow: 0 1mm 2mm rgba(18, 16, 13, 0.10);
}
.card-photo {
  width: 44mm; flex: 0 0 44mm;
  background: #12100d;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.card-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 15%; }
.card-body { padding: 4mm; display: flex; flex-direction: column; justify-content: flex-end; flex: 1; text-align: center; }
.card-name { font-size: 15pt; font-weight: 800; line-height: 1.1; text-transform: uppercase; letter-spacing: .01em; }
.card-meta { margin-top: 1.5mm; font-size: 7pt; letter-spacing: .28em; text-transform: uppercase; color: #8a7a52; }
`;

const segPages = SEGMENT_ORDER.map((segment) => {
  const members = bySegment.get(segment);
  const cards = members.map((p, i) => {
    const num = String(i + 1).padStart(2, "0");
    return `
      <article class="card">
        <div class="card-photo">
          ${p.photo ? `<img src="${p.photo}" alt="${esc(p.name)}">` : "<span>?</span>"}
        </div>
        <div class="card-body">
          <div class="card-spacer"></div>
          <div>
            <div class="card-name">${esc(p.name)}</div>
            <p class="card-meta">${esc(segment)} · Player ${num}</p>
          </div>
        </div>
      </article>`;
  }).join("\n");

  return `
    <section class="segment-page">
      <header class="seg-head">
        <div>
          <p class="seg-eyebrow">Segment · ${SEGMENT_ORDER.indexOf(segment) + 1} of ${SEGMENT_ORDER.length}</p>
          <h1 class="seg-name">${esc(segment)}</h1>
          <p class="seg-tag">${esc(SEGMENT_TAGLINE[segment])}</p>
        </div>
        <div class="seg-count">
          <p class="n">${members.length}</p>
          <p class="l">Players</p>
        </div>
      </header>
      <div class="grid">
${cards}
      </div>
    </section>`;
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>BUPL Cricket Auction — Player Catalogue</title>
<style>${css}</style>
</head>
<body>
<section class="cover">
  <div class="cover-inner">
    <p class="cover-eyebrow">Official auction register</p>
    <h1 class="cover-title">BUPL<br><em>Cricket</em><br><em>Auction</em></h1>
    <div class="cover-rule"></div>
    <p class="cover-sub">Player Catalogue &nbsp;·&nbsp; 2026</p>
    <div class="cover-meta">
      <div><p class="num">50</p><p class="lbl">Players</p></div>
      <div><p class="num">5</p><p class="lbl">Segments</p></div>
      <div><p class="num">10</p><p class="lbl">Franchises</p></div>
    </div>
  </div>
</section>
${segPages}
</body>
</html>
`;

const out = path.join("/tmp", "player-catalogue.html");
fs.writeFileSync(out, html);
console.log("written:", out);
