#!/usr/bin/env node
// Render top languages across owned, non-fork repos (public + private).
// Writes assets/languages-dark.svg and assets/languages-light.svg.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { THEMES, DISPLAY, MONO, measure, text, plate } from "./plate-kit.mjs";

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

// Layout: same two-column shell as the project plates.
const W = 1200, PAD = 64, ROW_H = 34;
const H = Math.max(360, 72 + topRows.length * ROW_H + 40);
const leftW = 420;
const x0 = PAD + leftW + 64, x1 = W - PAD;
const labelW = 128, pctW = 72;
const trackX = x0 + labelW, trackW = x1 - pctW - trackX;

function render(c) {
  const rows = topRows.map((r, i) => {
    const y = 64 + i * ROW_H;
    const w = (r.pct / maxPct) * trackW;
    return `
  ${text(x0, y + 22, r.name, { size: 18, fill: c.text })}
  <rect x="${trackX}" y="${y + 8}" width="${trackW}" height="16" rx="2" fill="${c.grid}"/>
  <rect class="reveal" style="--delay:${i * 50}ms" x="${trackX}" y="${y + 8}" width="${w.toFixed(1)}" height="16" rx="2" fill="${i === 0 ? c.sig : c.sigLo}"/>
  ${text(x1, y + 22, `${r.pct.toFixed(1)}%`, { size: 18, fill: c.dim, anchor: "end" })}`;
  }).join("");

  const title = "LANGUAGES";
  const tSize = 104;
  const body = `
  ${text(PAD - 4, 64 + tSize * 0.72, title, { font: DISPLAY, size: tSize, fill: c.text, tracking: -0.01 })}
  ${["Share of code bytes in owned,", "non-fork repositories,", "public and private."].map((l, i) => text(PAD, 64 + tSize * 0.72 + 52 + i * 30, l, { size: 19, fill: c.dim })).join("")}
  ${text(PAD, H - 52, `updated ${stamp}`, { size: 18, fill: c.dim })}
  <line x1="${PAD + leftW + 24}" x2="${PAD + leftW + 24}" y1="40" y2="${H - 40}" stroke="${c.frame}" stroke-width="1"/>
  ${rows}`;

  return plate({
    w: W, h: H, c, body,
    label: `Top ${topRows.length} languages by share of code: ${topRows.map(r => `${r.name} ${r.pct.toFixed(1)} percent`).join(", ")}.`,
  });
}

mkdirSync(resolve("assets"), { recursive: true });
for (const [name, colours] of Object.entries(THEMES)) {
  const out = resolve(`assets/languages-${name}.svg`);
  writeFileSync(out, render(colours));
  console.log(`wrote ${out}`);
}
console.log(`${topRows.length} of ${ranked.length} languages`);
