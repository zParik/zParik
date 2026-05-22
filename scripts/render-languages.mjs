#!/usr/bin/env node
// Render top languages across owned, non-fork public repos as a compact SVG.
// Cyan-ladder bars (one-accent brand law).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TOKEN = process.env.GH_TOKEN;
const USER  = process.env.GH_USER || "zParik";
const TOPN  = Number(process.env.TOP_LANGS || 8);
const OUT   = resolve("assets/top-languages.svg");

if (!TOKEN) {
  console.error("GH_TOKEN required");
  process.exit(1);
}

const BRAND = {
  bg:     "#0B1220",
  bgTop:  "#0E1626",
  accent: "#22D3EE",
  text:   "#E2ECF5",
  muted:  "#9FB2C8",
  axis:   "#7A8FA8",
  track:  "#16213A",
};

const query = `
query($login:String!, $cursor:String) {
  user(login:$login) {
    repositories(first:100, after:$cursor, ownerAffiliations:OWNER, isFork:false) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        languages(first:20, orderBy:{field:SIZE, direction:DESC}) {
          edges { size node { name } }
        }
      }
    }
  }
}`;

async function gql(cursor) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type":  "application/json",
      "User-Agent":    "zParik-langs-render",
    },
    body: JSON.stringify({ query, variables: { login: USER, cursor } }),
  });
  if (!r.ok) throw new Error(`GraphQL ${r.status}: ${await r.text()}`);
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data.user.repositories;
}

const totals = new Map();
let cursor = null;
do {
  const page = await gql(cursor);
  for (const repo of page.nodes) {
    for (const edge of repo.languages.edges) {
      totals.set(edge.node.name, (totals.get(edge.node.name) || 0) + edge.size);
    }
  }
  cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (cursor);

const sumAll  = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
const ranked  = [...totals.entries()].sort((a, b) => b[1] - a[1]);
const topRows = ranked.slice(0, TOPN).map(([name, size]) => ({
  name,
  size,
  pct: (size / sumAll) * 100,
}));

// Layout — compact column.
const W = 540, ROW_H = 30, PAD_T = 64, PAD_B = 32, PAD_L = 22, PAD_R = 22;
const H = PAD_T + topRows.length * ROW_H + PAD_B;
const labelW = 110;
const pctW   = 56;
const trackX = PAD_L + labelW;
const trackW = W - PAD_R - pctW - trackX - 10;

const maxPct = Math.max(...topRows.map(r => r.pct));

const stamp = new Date().toISOString().slice(0, 10);

const rows = topRows.map((r, i) => {
  const y       = PAD_T + i * ROW_H;
  const barW    = (r.pct / maxPct) * trackW;
  const opacity = (1 - i / (topRows.length + 1)).toFixed(2);
  const delay   = (i * 0.08).toFixed(2);
  return `
  <g transform="translate(0,${y})">
    <text x="${PAD_L}" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="12" font-weight="500" fill="${BRAND.text}">${r.name}</text>
    <rect x="${trackX}" y="10" width="${trackW}" height="10" rx="2" fill="${BRAND.track}"/>
    <rect x="${trackX}" y="10" width="0" height="10" rx="2" fill="${BRAND.accent}" fill-opacity="${opacity}">
      <animate attributeName="width" from="0" to="${barW.toFixed(1)}" dur="1.1s" begin="${delay}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.16 1 0.3 1"/>
    </rect>
    <text x="${W - PAD_R}" y="18" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="12" font-weight="500" fill="${BRAND.muted}">${r.pct.toFixed(1)}%</text>
  </g>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Top ${topRows.length} languages across owned public and private repositories. ${topRows.map(r => `${r.name} ${r.pct.toFixed(1)} percent`).join(", ")}.">
  <defs>
    <linearGradient id="lbg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${BRAND.bgTop}"/>
      <stop offset="1" stop-color="${BRAND.bg}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="url(#lbg)" stroke="${BRAND.accent}" stroke-opacity="0.18"/>

  <text x="${PAD_L}" y="32" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="12" font-weight="600" letter-spacing="2.2" fill="${BRAND.text}">T O P &#160; L A N G U A G E S</text>
  <text x="${W - PAD_R}" y="32" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="11" letter-spacing="0.8" fill="${BRAND.accent}" fill-opacity="0.9">refreshed ${stamp}</text>
  <text x="${PAD_L}" y="50" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="10" font-weight="500" letter-spacing="1.4" fill="${BRAND.axis}">owned, non-fork &#183; public + private</text>

  ${rows}
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`wrote ${OUT} · ${topRows.length} of ${ranked.length} languages`);
