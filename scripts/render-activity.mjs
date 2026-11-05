#!/usr/bin/env node
// Render running-total line + monthly bars of GitHub contributions.
// Writes assets/activity-dark.svg and assets/activity-light.svg.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { FONT, THEMES } from "./theme.mjs";

const TOKEN  = process.env.GH_TOKEN;
const USER   = process.env.GH_USER || "zParik";
const MONTHS = Number(process.env.MONTHS || 24);

if (!TOKEN) {
  console.error("GH_TOKEN required");
  process.exit(1);
}

const query = `
query($login:String!, $from:DateTime!, $to:DateTime!) {
  user(login:$login) {
    contributionsCollection(from:$from, to:$to) {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function fetchRange(from, to) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type":  "application/json",
      "User-Agent":    "zParik-activity-render",
    },
    body: JSON.stringify({ query, variables: { login: USER, from, to } }),
  });
  if (!r.ok) throw new Error(`GraphQL ${r.status}: ${await r.text()}`);
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap(w => w.contributionDays);
}

// Fetch in 1-year slices (GitHub limit).
function isoStart(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)).toISOString(); }
function isoEnd(d)   { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59)).toISOString(); }

const now   = new Date();
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));
const slices = [];
let cursor = new Date(start);
while (cursor < now) {
  const sliceEnd = new Date(Math.min(
    Date.UTC(cursor.getUTCFullYear() + 1, cursor.getUTCMonth(), cursor.getUTCDate()) - 1000,
    now.getTime(),
  ));
  slices.push([isoStart(cursor), isoEnd(sliceEnd)]);
  cursor = new Date(sliceEnd.getTime() + 1000);
}

const allDays = (await Promise.all(slices.map(([a, b]) => fetchRange(a, b)))).flat();

const byMonth = new Map();
for (const d of allDays) {
  const key = d.date.slice(0, 7);
  byMonth.set(key, (byMonth.get(key) || 0) + d.contributionCount);
}

const months = [];
for (let i = 0; i < MONTHS; i++) {
  const dt = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
  const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  months.push({ key, label: dt.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), year: dt.getUTCFullYear(), count: byMonth.get(key) || 0 });
}

let cum = 0;
for (const m of months) { cum += m.count; m.cumulative = cum; }

const total      = cum;
// Round axis tops up so ticks land on readable steps (1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8 x 10^k).
const TICKS = 4;
function niceTop(v) {
  const raw  = Math.max(1, v) / TICKS;
  const mag  = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * mag).find(s => s >= raw);
  return step * TICKS;
}
const maxMonthly = niceTop(Math.max(...months.map(m => m.count)));
const maxCum     = niceTop(total);
const stamp      = new Date().toISOString().slice(0, 10);

// Layout. Spacing on a 4px grid.
const W = 1200, H = 340;
const PAD = { t: 64, r: 72, b: 56, l: 72 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;
const base   = PAD.t + innerH;

const xStep = innerW / months.length;
const barW  = Math.max(6, xStep * 0.56);
const xMid  = i => PAD.l + xStep * (i + 0.5);
const yBar  = c => base - (c / maxMonthly) * innerH;
const yLine = c => base - (c / maxCum) * innerH;

const pts      = months.map((m, i) => [xMid(i), yLine(m.cumulative)]);
const linePath = "M " + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
let pathLen = 0;
for (let i = 1; i < pts.length; i++) pathLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
pathLen = Math.ceil(pathLen);

const yTicks = i => base - (innerH * i) / TICKS;
const labelStride = months.length > 18 ? 3 : months.length > 12 ? 2 : 1;
const lp = pts.at(-1);

function render(c) {
  const t = (x, y, s, { anchor = "start", fill = c.muted, size = 13, weight = 400 } = {}) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

  const grid = Array.from({ length: TICKS + 1 }, (_, i) =>
    `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${yTicks(i).toFixed(1)}" y2="${yTicks(i).toFixed(1)}" stroke="${c.grid}" stroke-width="1"/>`).join("");

  const leftTicks = Array.from({ length: TICKS + 1 }, (_, i) =>
    t(PAD.l - 12, (yTicks(i) + 4).toFixed(1), Math.round((maxCum * i) / TICKS), { anchor: "end" })).join("");
  const rightTicks = Array.from({ length: TICKS + 1 }, (_, i) =>
    t(W - PAD.r + 12, (yTicks(i) + 4).toFixed(1), Math.round((maxMonthly * i) / TICKS))).join("");

  const xLabels = months.map((m, i) => {
    if (i % labelStride !== 0 && i !== months.length - 1) return "";
    const showYear = i === 0 || months[i - 1]?.year !== m.year;
    return t(xMid(i).toFixed(1), H - PAD.b + 28, showYear ? `${m.label} ${m.year}` : m.label, { anchor: "middle" });
  }).join("");

  const bars = months.map((m, i) => {
    const y = yBar(m.count);
    return `<rect x="${(xMid(i) - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${(base - y).toFixed(1)}" rx="2" fill="${c.bar}"><title>${m.label} ${m.year}: ${m.count} contributions</title></rect>`;
  }).join("");

  // Legend: shape carries the meaning, not colour alone.
  const legend = `
    <line x1="${PAD.l}" x2="${PAD.l + 20}" y1="28" y2="28" stroke="${c.accent}" stroke-width="2.5" stroke-linecap="round"/>
    ${t(PAD.l + 28, 32, "Running total (left axis)", { fill: c.text })}
    <rect x="${PAD.l + 220}" y="22" width="10" height="12" rx="2" fill="${c.bar}"/>
    ${t(PAD.l + 238, 32, "Per month (right axis)", { fill: c.text })}
    ${t(W - PAD.r, 32, `Updated ${stamp}`, { anchor: "end" })}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${total} GitHub contributions over the last ${MONTHS} months, shown as a running total and monthly bars.">
  <style>
    text { font-family: ${FONT}; font-variant-numeric: tabular-nums; }
    .line { stroke-dasharray: ${pathLen}; animation: draw 800ms cubic-bezier(0.16, 1, 0.3, 1) both; }
    @keyframes draw { from { stroke-dashoffset: ${pathLen}; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .line { animation: none; } }
  </style>
  ${legend}
  ${grid}
  ${bars}
  <path class="line" d="${linePath}" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="4" fill="${c.accent}"/>
  ${t((lp[0] - 12).toFixed(1), (lp[1] + 5).toFixed(1), total, { anchor: "end", fill: c.text, size: 15, weight: 600 })}
  ${leftTicks}
  ${rightTicks}
  ${xLabels}
</svg>
`;
}

mkdirSync(resolve("assets"), { recursive: true });
for (const [name, colours] of Object.entries(THEMES)) {
  const out = resolve(`assets/activity-${name}.svg`);
  writeFileSync(out, render(colours));
  console.log(`wrote ${out}`);
}
console.log(`${months.length} months, ${total} contributions`);
