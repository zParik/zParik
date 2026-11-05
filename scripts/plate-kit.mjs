// Shared visual system for every SVG on the profile.
//
// Concept: each image is an instrument plate. Dark theme reads as an
// oscilloscope (phosphor on black glass); light theme reads as a chart
// recorder (ink on warm paper). Same geometry, two inks.
//
// Type: Big Shoulders Display for names and titles, JetBrains Mono for
// readouts and numbers (measurement, not costume). Both SIL OFL 1.1,
// subset and embedded as base64 WOFF2 because SVGs shown through <img>
// cannot fetch external fonts. Rebuild subsets with scripts/build-fonts.sh.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const metrics = JSON.parse(readFileSync(resolve(root, "fonts/metrics.json"), "utf8"));

export const DISPLAY = "BigShouldersDisplay-800";
export const DISPLAY_SEMI = "BigShouldersDisplay-600";
export const MONO = "JetBrainsMono-Medium";

// Explicit colours, no opacity stacking. WCAG contrast against bg:
//   dark   text 17.6  dim 6.8  sig 10.8  hot 9.6  cold 12.4
//   light  text 15.5  dim 6.1  sig  5.3  hot 5.0  cold 10.5
// sigLo and coldLo are fills for secondary data marks only, never text.
export const THEMES = {
  dark: {
    bg:     "#080c11",
    frame:  "#223040",
    grid:   "#121b25",
    text:   "#eef3f7",
    dim:    "#8a9aab",
    sig:    "#22d3ee",
    sigLo:  "#1d5e6c",
    hot:    "#f5a524",
    cold:   "#c4cfda",
    coldLo: "#2a3644",
  },
  light: {
    bg:     "#f3f0e8",
    frame:  "#cfc7b5",
    grid:   "#e3ddcf",
    text:   "#15191e",
    dim:    "#5e594f",
    sig:    "#0b6b85",
    sigLo:  "#9cc6d0",
    hot:    "#b93b0a",
    cold:   "#3a3631",
    coldLo: "#d3ccbd",
  },
};

const fontCache = new Map();
function fontFace(name) {
  if (!fontCache.has(name)) {
    const b64 = readFileSync(resolve(root, `fonts/${name}.woff2`)).toString("base64");
    fontCache.set(name, `@font-face{font-family:"${name}";src:url(data:font/woff2;base64,${b64}) format("woff2");}`);
  }
  return fontCache.get(name);
}

// Width of a string in px, from real advance widths (kerning ignored).
export function measure(font, str, size, tracking = 0) {
  const m = metrics[font];
  let units = 0;
  for (const ch of str) units += m.adv[ch] ?? m.upm * 0.5;
  return (units / m.upm) * size + tracking * size * Math.max(0, [...str].length - 1);
}

export const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Text helper. font is one of DISPLAY / DISPLAY_SEMI / MONO.
export function text(x, y, str, { font = MONO, size = 18, fill, anchor = "start", tracking = 0, cls = "" } = {}) {
  const ls = tracking ? ` letter-spacing="${(tracking * size).toFixed(2)}"` : "";
  const c = cls ? ` class="${cls}"` : "";
  return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-family="${font}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${ls}${c}>${esc(str)}</text>`;
}

// Deterministic PRNG so plates are stable between renders.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pathOf = pts => "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");

// Wrap a plate: background, frame, fonts, the one entrance animation.
// Elements with class "trace" draw in once; reduced motion shows them static.
export function plate({ w, h, c, label, fonts = [DISPLAY, MONO], body, transparent = false }) {
  const css = `
    ${fonts.map(fontFace).join("\n    ")}
    text { font-variant-numeric: tabular-nums; }
    .trace { stroke-dasharray: var(--len); stroke-dashoffset: 0; animation: draw 900ms cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--delay, 0ms); }
    .reveal { animation: reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--delay, 0ms); }
    @keyframes draw { from { stroke-dashoffset: var(--len); } }
    @keyframes reveal { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .trace, .reveal { animation: none; } }`;
  const frame = transparent ? "" :
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="${c.bg}" stroke="${c.frame}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
  <style>${css}
  </style>
  ${frame}
  ${body}
</svg>
`;
}

// A path that draws itself in. len must be >= real path length.
export function trace(d, { stroke, width = 2.5, len = 4000, delay = 0, extra = "" } = {}) {
  return `<path class="trace" style="--len:${Math.ceil(len)};--delay:${delay}ms" d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
}

export function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L + 2;
}
