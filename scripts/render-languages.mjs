#!/usr/bin/env node
// Render top languages across owned, non-fork repos (public + private).
// Writes assets/languages-dark.svg and assets/languages-light.svg.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { FONT, THEMES } from "./theme.mjs";

const TOKEN = process.env.GH_TOKEN;
const USER  = process.env.GH_USER || "zParik";
const TOPN  = Number(process.env.TOP_LANGS || 8);

if (!TOKEN) {
  console.error("GH_TOKEN required");
  process.exit(1);
}

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
const topRows = ranked.slice(0, TOPN).map(([name, size]) => ({ name, pct: (size / sumAll) * 100 }));
const maxPct  = Math.max(...topRows.map(r => r.pct));
const stamp   = new Date().toISOString().slice(0, 10);

// Layout. Spacing on a 4px grid.
const W = 600, ROW_H = 32, PAD_T = 8, PAD_B = 44, PAD_X = 0;
const H = PAD_T + topRows.length * ROW_H + PAD_B;
const labelW = 112, pctW = 56;
const trackX = PAD_X + labelW;
const trackW = W - PAD_X - pctW - trackX;

function render(c) {
  const rows = topRows.map((r, i) => {
    const y = PAD_T + i * ROW_H;
    return `
  <g transform="translate(0,${y})">
    <text x="${PAD_X}" y="20" font-size="14" fill="${c.text}">${r.name}</text>
    <rect x="${trackX}" y="10" width="${trackW}" height="12" rx="2" fill="${c.track}"/>
    <rect x="${trackX}" y="10" width="${((r.pct / maxPct) * trackW).toFixed(1)}" height="12" rx="2" fill="${c.accent}"/>
    <text x="${W - PAD_X}" y="20" text-anchor="end" font-size="14" fill="${c.muted}">${r.pct.toFixed(1)}%</text>
  </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Top ${topRows.length} languages by code size: ${topRows.map(r => `${r.name} ${r.pct.toFixed(1)} percent`).join(", ")}.">
  <style>text { font-family: ${FONT}; font-variant-numeric: tabular-nums; }</style>
  ${rows}
  <text x="${PAD_X}" y="${H - 12}" font-size="12" fill="${c.muted}">Share of code bytes in owned, non-fork repositories, public and private. Updated ${stamp}.</text>
</svg>
`;
}

mkdirSync(resolve("assets"), { recursive: true });
for (const [name, colours] of Object.entries(THEMES)) {
  const out = resolve(`assets/languages-${name}.svg`);
  writeFileSync(out, render(colours));
  console.log(`wrote ${out}`);
}
console.log(`${topRows.length} of ${ranked.length} languages`);
