#!/usr/bin/env node
// Render cumulative-commit line + monthly-volume bars as a single SVG.
// Pulls contribution calendar via GitHub GraphQL, buckets by month.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TOKEN  = process.env.GH_TOKEN;
const USER   = process.env.GH_USER || "zParik";
const MONTHS = Number(process.env.MONTHS || 24);
const OUT    = resolve("assets/activity-cumulative.svg");

if (!TOKEN) {
  console.error("GH_TOKEN required");
  process.exit(1);
}

const BRAND = {
  bg:        "#0B1220",
  bgTop:     "#0E1626",
  accent:    "#22D3EE",
  accentDim: "#22D3EE",
  text:      "#E2ECF5",
  muted:     "#9FB2C8",
  axis:      "#7A8FA8",
  grid:      "#243454",
};

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

// Bucket by YYYY-MM.
const byMonth = new Map();
for (const d of allDays) {
  const key = d.date.slice(0, 7);
  byMonth.set(key, (byMonth.get(key) || 0) + d.contributionCount);
}

// Build ordered month list from start..now.
const months = [];
for (let i = 0; i < MONTHS; i++) {
  const dt = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
  const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  months.push({ key, label: dt.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), year: dt.getUTCFullYear(), count: byMonth.get(key) || 0 });
}

let cum = 0;
for (const m of months) { cum += m.count; m.cumulative = cum; }

const total      = cum;
const maxMonthly = Math.max(1, ...months.map(m => m.count));
const maxCum     = Math.max(1, total);

// SVG layout.
const W = 1200, H = 360;
const PAD = { t: 72, r: 78, b: 62, l: 78 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

const xStep = innerW / months.length;
const barW  = Math.max(6, xStep * 0.62);

const yBar = c => PAD.t + innerH - (c / maxMonthly) * innerH;
const yLine = c => PAD.t + innerH - (c / maxCum) * innerH;
const xMid = i => PAD.l + xStep * (i + 0.5);

// Cumulative path (smooth, monotone).
const linePts = months.map((m, i) => [xMid(i), yLine(m.cumulative)]);
const linePath = "M " + linePts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
const areaPath = linePath + ` L ${linePts.at(-1)[0].toFixed(1)} ${PAD.t + innerH} L ${linePts[0][0].toFixed(1)} ${PAD.t + innerH} Z`;

// Y-axis ticks (cumulative).
const tickCount = 4;
const cumTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxCum * i) / tickCount));
const monthTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxMonthly * i) / tickCount));

// Month labels: every Nth depending on count.
const labelStride = months.length > 18 ? 3 : months.length > 12 ? 2 : 1;

const stamp = new Date().toISOString().slice(0, 10);

const bars = months.map((m, i) => {
  const x = xMid(i) - barW / 2;
  const y = yBar(m.count);
  const h = (PAD.t + innerH) - y;
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${BRAND.accent}" fill-opacity="0.22"><title>${m.label} ${m.year} · ${m.count} commits</title></rect>`;
}).join("");

const gridLines = cumTicks.map((_, i) => {
  const y = PAD.t + innerH - (innerH * i) / tickCount;
  return `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${BRAND.grid}" stroke-width="0.8"/>`;
}).join("");

const ylLabels = cumTicks.map((v, i) => {
  const y = PAD.t + innerH - (innerH * i) / tickCount;
  return `<text x="${PAD.l - 12}" y="${(y + 5).toFixed(1)}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="14" font-weight="500" fill="${BRAND.muted}">${v}</text>`;
}).join("");

const yrLabels = monthTicks.map((v, i) => {
  const y = PAD.t + innerH - (innerH * i) / tickCount;
  return `<text x="${W - PAD.r + 12}" y="${(y + 5).toFixed(1)}" text-anchor="start" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="14" font-weight="500" fill="${BRAND.muted}">${v}</text>`;
}).join("");

const xLabels = months.map((m, i) => {
  if (i % labelStride !== 0 && i !== months.length - 1) return "";
  const showYear = i === 0 || months[i - 1]?.year !== m.year;
  const label = showYear ? `${m.label} '${String(m.year).slice(2)}` : m.label;
  return `<text x="${xMid(i).toFixed(1)}" y="${H - PAD.b + 30}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="14" font-weight="500" fill="${BRAND.muted}" letter-spacing="0.4">${label}</text>`;
}).join("");

// Latest point + pulsing dot.
const lp = linePts.at(-1);

// Total stroke length approx for draw-in animation (Manhattan upper bound — fine for SMIL).
let pathLen = 0;
for (let i = 1; i < linePts.length; i++) {
  const dx = linePts[i][0] - linePts[i - 1][0];
  const dy = linePts[i][1] - linePts[i - 1][1];
  pathLen += Math.hypot(dx, dy);
}
pathLen = Math.ceil(pathLen);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cumulative commits and monthly volume across public repositories over the last ${MONTHS} months. Total ${total} commits.">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${BRAND.bgTop}"/>
      <stop offset="1" stop-color="${BRAND.bg}"/>
    </linearGradient>
    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${BRAND.accent}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${BRAND.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="url(#bg)" stroke="${BRAND.accent}" stroke-opacity="0.18"/>

  <!-- eyebrow -->
  <text x="${PAD.l}" y="36" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="14" font-weight="600" letter-spacing="1.2" fill="${BRAND.text}">COMMIT ACTIVITY &#160;&#183;&#160; LAST ${MONTHS} MONTHS</text>
  <text x="${W - PAD.r}" y="36" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="14" letter-spacing="0.8" fill="${BRAND.accent}" fill-opacity="0.9">${total} commits &#183; refreshed ${stamp}</text>

  <!-- left axis label -->
  <text x="${PAD.l - 12}" y="${PAD.t - 16}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="13" font-weight="600" letter-spacing="1.6" fill="${BRAND.axis}">cumulative &#8593;</text>
  <text x="${W - PAD.r + 12}" y="${PAD.t - 16}" text-anchor="start" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="13" font-weight="600" letter-spacing="1.6" fill="${BRAND.axis}">per month</text>

  ${gridLines}
  ${bars}

  <!-- cumulative area + line -->
  <path d="${areaPath}" fill="url(#area)"/>
  <path d="${linePath}" fill="none" stroke="${BRAND.accent}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${pathLen}" stroke-dashoffset="${pathLen}">
    <animate attributeName="stroke-dashoffset" from="${pathLen}" to="0" dur="2.2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.16 1 0.3 1"/>
  </path>

  <!-- latest point pulse -->
  <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="3" fill="${BRAND.accent}">
    <animate attributeName="r" values="2.4;4;2.4" dur="2.4s" repeatCount="indefinite" begin="2.2s"/>
    <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite" begin="2.2s"/>
  </circle>
  <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="3" fill="none" stroke="${BRAND.accent}" stroke-opacity="0.5">
    <animate attributeName="r" values="3;14;3" dur="2.4s" repeatCount="indefinite" begin="2.2s"/>
    <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" repeatCount="indefinite" begin="2.2s"/>
  </circle>

  ${ylLabels}
  ${yrLabels}
  ${xLabels}
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`wrote ${OUT} · ${months.length} months · ${total} commits`);
