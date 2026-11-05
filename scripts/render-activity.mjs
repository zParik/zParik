#!/usr/bin/env node
// Render running-total line + monthly bars of GitHub contributions.
// Writes assets/activity-dark.svg and assets/activity-light.svg.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { THEMES, DISPLAY, MONO, measure, text, plate, trace, polyLen, pathOf } from "./plate-kit.mjs";

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
const W = 1200, H = 460;
const PAD = { t: 156, r: 88, b: 72, l: 88 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;
const base   = PAD.t + innerH;

const xStep = innerW / months.length;
const barW  = Math.max(6, xStep * 0.56);
const xMid  = i => PAD.l + xStep * (i + 0.5);
const yBar  = c => base - (c / maxMonthly) * innerH;
const yLine = c => base - (c / maxCum) * innerH;

const pts = months.map((m, i) => [xMid(i), yLine(m.cumulative)]);
const yTicks = i => base - (innerH * i) / TICKS;
const labelStride = months.length > 18 ? 3 : months.length > 12 ? 2 : 1;
const lp = pts.at(-1);

function render(c) {
  const m = (x, y, s, o = {}) => text(x, y, s, { size: 16, fill: c.dim, ...o });

  const grid = Array.from({ length: TICKS + 1 }, (_, i) =>
    `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${yTicks(i).toFixed(1)}" y2="${yTicks(i).toFixed(1)}" stroke="${c.grid}" stroke-width="1"/>`).join("");
  const leftTicks = Array.from({ length: TICKS + 1 }, (_, i) =>
    m(PAD.l - 14, yTicks(i) + 5, Math.round((maxCum * i) / TICKS), { anchor: "end" })).join("");
  const rightTicks = Array.from({ length: TICKS + 1 }, (_, i) =>
    m(W - PAD.r + 14, yTicks(i) + 5, Math.round((maxMonthly * i) / TICKS))).join("");
  const xLabels = months.map((mo, i) => {
    if (i % labelStride !== 0 && i !== months.length - 1) return "";
    const showYear = i === 0 || months[i - 1]?.year !== mo.year;
    return m(xMid(i), H - PAD.b + 32, showYear ? `${mo.label} ${mo.year}` : mo.label, { anchor: "middle" });
  }).join("");
  const bars = months.map((mo, i) => {
    const y = yBar(mo.count);
    return `<rect class="reveal" style="--delay:${i * 15}ms" x="${(xMid(i) - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${(base - y).toFixed(1)}" rx="2" fill="${c.sigLo}"><title>${mo.label} ${mo.year}: ${mo.count} contributions</title></rect>`;
  }).join("");

  const title = "CONTRIBUTIONS";
  const tSize = 72;
  const lx = W - 64 - 250;
  const body = `
  ${text(60, 52 + tSize * 0.72, title, { font: DISPLAY, size: tSize, fill: c.text, tracking: -0.01 })}
  ${text(64 + measure(DISPLAY, title, tSize, -0.01) + 16, 52 + tSize * 0.72, `last ${MONTHS} months`, { size: 18, fill: c.dim })}
  <line x1="${lx}" x2="${lx + 24}" y1="66" y2="66" stroke="${c.sig}" stroke-width="3" stroke-linecap="round"/>
  ${m(lx + 36, 72, "running total, left", { fill: c.text })}
  <rect x="${lx + 5}" y="88" width="14" height="16" rx="2" fill="${c.sigLo}"/>
  ${m(lx + 36, 102, "per month, right", { fill: c.text })}
  ${grid}
  ${bars}
  ${trace(pathOf(pts), { stroke: c.sig, width: 3, len: polyLen(pts) })}
  <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="5" fill="${c.sig}"/>
  ${text(lp[0] - 14, lp[1] + 6, total, { size: 20, fill: c.text, anchor: "end" })}
  ${leftTicks}
  ${rightTicks}
  ${xLabels}
  ${m(W - 64, H - 18, `updated ${stamp}`, { anchor: "end", size: 14 })}`;

  return plate({
    w: W, h: H, c, body,
    label: `${total} GitHub contributions over the last ${MONTHS} months, shown as a running total line over monthly bars.`,
  });
}

mkdirSync(resolve("assets"), { recursive: true });
for (const [name, colours] of Object.entries(THEMES)) {
  const out = resolve(`assets/activity-${name}.svg`);
  writeFileSync(out, render(colours));
  console.log(`wrote ${out}`);
}
console.log(`${months.length} months, ${total} contributions`);
