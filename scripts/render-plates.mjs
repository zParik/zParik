#!/usr/bin/env node
// Render the static profile plates (hero + project plates) in dark and light.
// Each project plate draws the mechanism of the project, not a logo.
// Output: assets/plate-<name>-<theme>.svg

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  THEMES, DISPLAY, DISPLAY_SEMI, MONO,
  measure, text, rng, pathOf, plate, trace, polyLen,
} from "./plate-kit.mjs";

const W = 1200;
const PAD = 64;

// ---------------------------------------------------------------- hero

function hero(c) {
  const H = 600;
  const size = 200;
  const l1 = "PARIKSHIETH", l2 = "HARISH";
  const y1 = 256, y2 = 452;
  const l2w = measure(DISPLAY, l2, size, -0.01);

  // Two channels to the right of HARISH: process events and pixel intensity.
  const x0 = PAD + l2w + 64, x1 = W - PAD;
  const r = rng(7);

  // CH1 processes: quiet baseline, event impulses, two anomalous bursts.
  const ch1Base = 352, ch1Amp = 46;
  const ch1 = [[x0, ch1Base]];
  const hotX = [];
  for (let x = x0 + 8; x < x1 - 8; x += 9 + r() * 14) {
    const burst = Math.abs(x - (x0 + (x1 - x0) * 0.62)) < 30;
    const a = burst ? ch1Amp * (0.75 + r() * 0.25) : r() < 0.35 ? ch1Amp * (0.15 + r() * 0.35) : 0;
    if (a === 0) { ch1.push([x, ch1Base]); continue; }
    ch1.push([x, ch1Base], [x + 1.5, ch1Base - a], [x + 3, ch1Base]);
    if (burst) hotX.push(x);
  }
  ch1.push([x1, ch1Base]);

  // CH2 pixels: one scanline across a scene, stepped luminance with sensor noise.
  const ch2Base = 452, ch2Amp = 44;
  const ch2 = [];
  let level = 0.3;
  for (let x = x0; x <= x1; x += 4) {
    if (r() < 0.1) level = 0.05 + r() * 0.95;
    ch2.push([x, ch2Base - (level + (r() - 0.5) * 0.06) * ch2Amp]);
  }

  const hotLo = Math.min(...hotX) - 10, hotHi = Math.max(...hotX) + 14;

  const body = `
  ${text(PAD, 64, "github.com/zParik", { size: 18, fill: c.dim })}
  ${text(W - PAD, 64, "VIT Vellore · BCA", { size: 18, fill: c.dim, anchor: "end" })}

  ${text(PAD - 6, y1, l1, { font: DISPLAY, size, fill: c.text, tracking: -0.01 })}
  ${text(PAD - 6, y2, l2, { font: DISPLAY, size, fill: c.text, tracking: -0.01 })}

  <line x1="${x0}" x2="${x1}" y1="${ch1Base}" y2="${ch1Base}" stroke="${c.grid}" stroke-width="1"/>
  <line x1="${x0}" x2="${x1}" y1="${ch2Base}" y2="${ch2Base}" stroke="${c.grid}" stroke-width="1"/>
  <rect class="reveal" style="--delay:700ms" x="${hotLo}" y="${ch1Base - ch1Amp - 14}" width="${hotHi - hotLo}" height="${ch1Amp + 14}" fill="none" stroke="${c.hot}" stroke-width="1.5" rx="3"/>
  ${text(hotHi, ch1Base - ch1Amp - 22, "anomaly", { size: 16, fill: c.hot, anchor: "end", cls: "reveal" }).replace('class="reveal"', 'class="reveal" style="--delay:700ms"')}
  ${trace(pathOf(ch1), { stroke: c.sig, width: 2, len: polyLen(ch1) })}
  ${trace(pathOf(ch2), { stroke: c.cold, width: 2, len: polyLen(ch2), delay: 120 })}
  ${text(x0, ch1Base - ch1Amp - 22, "CH1 processes", { size: 16, fill: c.sig })}
  ${text(x0, ch2Base - ch2Amp - 20, "CH2 pixels", { size: 16, fill: c.dim })}

  <line x1="${PAD}" x2="${W - PAD}" y1="508" y2="508" stroke="${c.frame}" stroke-width="1"/>
  ${text(PAD, 558, "Systems that watch processes and pixels.", { font: DISPLAY_SEMI, size: 40, fill: c.text })}
  ${text(W - PAD, 556, "ML · vision · security · HPC", { size: 18, fill: c.dim, anchor: "end" })}`;

  return plate({
    w: W, h: H, c, body,
    fonts: [DISPLAY, DISPLAY_SEMI, MONO],
    label: "Parikshieth Harish. Systems that watch processes and pixels. Two oscilloscope channels: process events with an anomaly flagged, and a pixel scanline.",
  });
}

// ------------------------------------------------------- project plate shell

// Left column: title, description lines, status. Right column: diagram.
function projectPlate(c, { title, lines, status, statusHot = false, label, diagram, h = 360 }) {
  const leftW = 420;
  const tSize = Math.min(132, (leftW - 8) / (measure(DISPLAY, title, 100, -0.01) / 100));
  const body = `
  ${text(PAD - 4, 64 + tSize * 0.72, title, { font: DISPLAY, size: tSize, fill: c.text, tracking: -0.01 })}
  ${lines.map((l, i) => text(PAD, 64 + tSize * 0.72 + 52 + i * 30, l, { size: 19, fill: c.dim })).join("\n  ")}
  <circle cx="${PAD + 6}" cy="${h - 58}" r="6" fill="${statusHot ? c.hot : c.sig}"/>
  ${text(PAD + 22, h - 52, status, { size: 18, fill: statusHot ? c.hot : c.sig })}
  <line x1="${PAD + leftW + 24}" x2="${PAD + leftW + 24}" y1="40" y2="${h - 40}" stroke="${c.frame}" stroke-width="1"/>
  ${diagram({ x0: PAD + leftW + 64, x1: W - PAD, y0: 56, y1: h - 48 })}`;
  return plate({ w: W, h, c, body, label });
}

// ---------------------------------------------------------------- Dommel

function dommel(c) {
  return projectPlate(c, {
    title: "DOMMEL",
    lines: ["Open cyber-physical EMT", "engine for inverter-dominated", "power grids."],
    status: "in progress",
    label: "Dommel: open cyber-physical EMT engine for inverter-dominated power grids. Diagram: three-phase grid voltages above the inverter switching signal that produces them.",
    diagram: ({ x0, x1, y0, y1 }) => {
      const wv = x1 - x0;
      const mid = y0 + 78, amp = 64;
      const cycles = 2.5;
      const phase = (k, colour, delay) => {
        const pts = [];
        for (let x = 0; x <= wv; x += 3) pts.push([x0 + x, mid - amp * Math.sin((x / wv) * cycles * 2 * Math.PI - (k * 2 * Math.PI) / 3)]);
        return trace(pathOf(pts), { stroke: colour, width: 2.25, len: polyLen(pts), delay });
      };
      // Sine-triangle PWM for phase A: carrier vs reference.
      const pwmTop = y1 - 64, pwmBot = y1 - 8;
      const pwm = [];
      let prev = null;
      for (let x = 0; x <= wv; x += 0.5) {
        const ref = Math.sin((x / wv) * cycles * 2 * Math.PI);
        const t = ((x / wv) * cycles * 15) % 1;
        const carrier = 1 - 4 * Math.abs(t - 0.5);
        const hi = ref > carrier;
        const y = hi ? pwmTop : pwmBot;
        if (prev !== null && prev !== hi) pwm.push([x0 + x, prev ? pwmTop : pwmBot]);
        pwm.push([x0 + x, y]);
        prev = hi;
      }
      const lab = (y, s, fill) => text(x0, y, s, { size: 16, fill });
      return `
  <line x1="${x0}" x2="${x1}" y1="${mid}" y2="${mid}" stroke="${c.grid}"/>
  ${phase(2, c.coldLo === "#2a3644" ? "#5d6b7a" : "#9a9284", 240)}
  ${phase(1, c.hot, 120)}
  ${phase(0, c.sig, 0)}
  ${lab(y0 - 8 + 0, "grid voltage  Va Vb Vc", c.dim)}
  ${lab(pwmTop - 16, "inverter switching, phase A", c.dim)}
  ${trace(pathOf(pwm), { stroke: c.sig, width: 1.5, len: polyLen(pwm), delay: 200 })}`;
    },
  });
}

// ---------------------------------------------------------------- ZonFormer

function zonformer(c) {
  return projectPlate(c, {
    title: "ZONFORMER",
    lines: ["Deep RL for HPC batch scheduling.", "Do published DRL gains survive", "cleaned traces and honest", "baselines? Mostly, no."],
    status: "in progress",
    label: "ZonFormer: deep reinforcement learning for HPC batch scheduling, tested against backfilling. Diagram: two job schedules on eight nodes, backfilling and a DRL policy, finishing at nearly the same time.",
    h: 380,
    diagram: ({ x0, x1, y0, y1 }) => {
      const nodes = 6, rowH = 12, gap = 3;
      const blockH = nodes * (rowH + gap);
      const r = rng(42);
      const jobs = Array.from({ length: 24 }, () => ({ w: 1 + Math.floor(r() * 3), t: 0.6 + r() * 2.4 }));
      // Greedy first-fit packing of one job list in a given order.
      function pack(order) {
        const free = Array(nodes).fill(0);
        const placed = [];
        for (const j of order) {
          let best = 0, bestT = Infinity;
          for (let n = 0; n + j.w <= nodes; n++) {
            const start = Math.max(...free.slice(n, n + j.w));
            if (start < bestT) { bestT = start; best = n; }
          }
          for (let n = best; n < best + j.w; n++) free[n] = bestT + j.t;
          placed.push({ ...j, n: best, s: bestT });
        }
        return { placed, makespan: Math.max(...free) };
      }
      // The point of the plate: a different schedule, nearly the same makespan.
      const a = pack(jobs);
      let b = null;
      for (let seed = 1; seed < 500 && !b; seed++) {
        const rr = rng(seed);
        const cand = pack([...jobs].sort(() => rr() - 0.5));
        if (Math.abs(cand.makespan - a.makespan) / a.makespan < 0.012) b = cand;
      }
      const span = Math.max(a.makespan, b.makespan) * 1.03;
      const sx = t => x0 + (t / span) * (x1 - x0 - 8);
      const block = (res, top, fill, accentFill, delay) => res.placed.map((j, i) =>
        `<rect class="reveal" style="--delay:${delay + i * 18}ms" x="${sx(j.s).toFixed(1)}" y="${(top + j.n * (rowH + gap)).toFixed(1)}" width="${Math.max(2, sx(j.s + j.t) - sx(j.s) - 2).toFixed(1)}" height="${(j.w * (rowH + gap) - gap).toFixed(1)}" rx="2" fill="${i % 5 === 0 ? accentFill : fill}"/>`).join("");
      const topA = y0 + 36, topB = topA + blockH + 44;
      const mx = sx(Math.max(a.makespan, b.makespan)) + 3;
      return `
  ${text(x0, topA - 12, "EASY backfilling", { size: 16, fill: c.dim })}
  ${block(a, topA, c.coldLo, c.cold === "#c4cfda" ? "#4a5868" : "#b5ad9c", 0)}
  ${text(x0, topB - 12, "DRL policy", { size: 16, fill: c.dim })}
  ${block(b, topB, c.sigLo, c.sig, 200)}
  <line x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${topA - 30}" y2="${topB + blockH + 6}" stroke="${c.hot}" stroke-width="2" stroke-dasharray="6 5"/>
  ${text(mx - 10, topA - 12, "same makespan", { size: 16, fill: c.hot, anchor: "end" })}`;
    },
  });
}

// ---------------------------------------------------------------- PaleGuard

function paleguard(c) {
  return projectPlate(c, {
    title: "PALEGUARD",
    lines: ["3D-CNN over process behaviour", "as a spatio-temporal volume.", "88% detection on malware", "families unseen in training."],
    status: "published · Scientific Reports 2026",
    statusHot: true,
    h: 380,
    label: "PaleGuard: endpoint detection that reads process behaviour as a spatio-temporal volume with a 3D-CNN. 88 percent detection on unseen malware families. Published in Scientific Reports, 2026. Diagram: stacked time slices of a process-by-feature grid, with a malicious pattern highlighted across slices.",
    diagram: ({ x0, x1, y0, y1 }) => {
      const cols = 10, rows = 7, cell = 17, slices = 7;
      const dx = 46, dy = -16;               // offset between time slices
      const skew = 0.42;                      // horizontal shear per row
      const sw = cols * cell, shH = rows * cell;
      const baseX = x0 + 8, baseY = y1 - 26;
      const r = rng(11);
      const hot = new Set();
      // A malicious pattern that drifts across processes over time.
      for (let s = 0; s < slices; s++) for (let k = 0; k < 4; k++) hot.add(`${s},${(3 + s + k) % cols},${(2 + (k % 3) + (s > 3 ? 1 : 0)) % rows}`);
      let out = "";
      for (let s = slices - 1; s >= 0; s--) {
        const ox = baseX + s * dx, oy = baseY + s * dy;
        const P = (cx, cy) => [ox + cx * cell + (rows - cy) * cell * skew, oy - (rows - cy) * cell];
        const corners = [P(0, 0), P(cols, 0), P(cols, rows), P(0, rows)];
        let cells = "";
        for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
          const isHot = hot.has(`${s},${cx},${cy}`);
          const lit = !isHot && r() < 0.16;
          if (!isHot && !lit) continue;
          const q = [P(cx + 0.12, cy + 0.12), P(cx + 0.88, cy + 0.12), P(cx + 0.88, cy + 0.88), P(cx + 0.12, cy + 0.88)];
          cells += `<path d="${pathOf(q)}Z" fill="${isHot ? c.hot : c.sigLo}"/>`;
        }
        out += `<g class="reveal" style="--delay:${(slices - 1 - s) * 70}ms"><path d="${pathOf(corners)}Z" fill="${c.bg}" stroke="${s === 0 ? c.sig : c.frame}" stroke-width="${s === 0 ? 1.75 : 1}"/>${cells}</g>`;
      }
      const ax = baseX + sw + rows * cell * skew;
      return `
  ${out}
  ${text(baseX, y0 + 10, "processes × features, per time slice", { size: 16, fill: c.dim })}
  ${text(baseX + (slices - 1) * dx + sw + rows * cell * skew + 14, baseY + (slices - 1) * dy - shH / 2, "time →", { size: 16, fill: c.dim })}
  ${text(x1, y1 + 4, "malicious pattern, tracked across slices", { size: 16, fill: c.hot, anchor: "end" })}`;
    },
  });
}

// ---------------------------------------------------------------- write

const PLATES = { hero, dommel, zonformer, paleguard };
mkdirSync(resolve("assets"), { recursive: true });
for (const [name, fn] of Object.entries(PLATES)) {
  for (const [theme, c] of Object.entries(THEMES)) {
    const out = resolve(`assets/plate-${name}-${theme}.svg`);
    writeFileSync(out, fn(c));
    console.log(`wrote ${out}`);
  }
}
