<!--
  Parikshieth Harish · GitHub profile README

  Every image is an "instrument plate": oscilloscope in dark theme, chart
  recorder in light theme. Each <picture> swaps variants by colour scheme.
    scripts/render-plates.mjs     hero + project plates (run by hand)
    scripts/render-activity.mjs   contributions plate  (weekly, CI)
    scripts/render-languages.mjs  languages plate      (weekly, CI)
    scripts/plate-kit.mjs         palette, type, frame shared by all three
    scripts/build-fonts.sh        rebuilds the embedded font subsets
-->

<a href="https://zparik.github.io/portfolioPage/">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/plate-hero-dark.svg">
  <img src="./assets/plate-hero-light.svg" width="100%" alt="Parikshieth Harish. Systems that watch processes and pixels.">
</picture>
</a>

<br/>

Third-year BCA at VIT Vellore. I build malware detection from process behaviour, computer vision pipelines, and the desktop tools I wanted and could not find.

**[parikshieth@gmail.com](mailto:parikshieth@gmail.com)** · **[LinkedIn](https://linkedin.com/in/parikshieth-harish-10481528b/)** · **[Portfolio](https://zparik.github.io/portfolioPage/)**

## Now building

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/plate-dommel-dark.svg">
  <img src="./assets/plate-dommel-light.svg" width="100%" alt="Dommel: an open cyber-physical EMT engine for inverter-dominated power grids. In progress.">
</picture>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/plate-zonformer-dark.svg">
  <img src="./assets/plate-zonformer-light.svg" width="100%" alt="ZonFormer: deep reinforcement learning for HPC batch scheduling. It tests whether published DRL gains over backfilling survive cleaned traces and honest baselines. Mostly, they do not. In progress.">
</picture>

## Published

<a href="https://doi.org/10.1038/s41598-026-65582-6">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/plate-paleguard-dark.svg">
  <img src="./assets/plate-paleguard-light.svg" width="100%" alt="PaleGuard: a 3D-CNN over process behaviour as a spatio-temporal volume. 88% detection on malware families unseen in training. Published in Scientific Reports, 2026.">
</picture>
</a>

**PaleGuard** in *Scientific Reports*, 2026: [doi:10.1038/s41598-026-65582-6](https://doi.org/10.1038/s41598-026-65582-6) · [code](https://github.com/zParik/CapStoneProject). Solo design, implementation, and evaluation.

## Also shipped

**[Qyra](https://github.com/zParik/Qyra)** · Tauri, React, TypeScript, Rust\
Free, offline PDF toolkit for Windows and Linux. I patched the Wayland edge cases so the AppImage runs correctly on Arch and Hyprland.

**[ARCHON](https://github.com/zParik/ARCHON)** · TypeScript, Node, React\
Anonymous distributed messaging over a Tor-style relay graph, with crypto keycard authentication and no account data. The operator cannot surveil its own users.

**[CV-Project](https://github.com/zParik/CV-Project)** · Python\
Indoor navigation assist. Fuses object detection with depth and scene cues to guide a person through unfamiliar interiors.

**[NotBigBrother](https://github.com/zParik/NotBigBrother)** · JavaScript\
Activity monitoring that keeps behaviour data on your machine.

**[Compressor](https://github.com/zParik/Compressor)** · HTML, JavaScript\
File compression in the browser tab. No upload, no server.

<details>
<summary>Earlier work and hackathons</summary>

<br/>

[congenial-octo-giggle](https://github.com/zParik/congenial-octo-giggle) was my first computer vision build, a sign language interpreter. It led to CV-Project and PaleGuard. [EcresWeb](https://github.com/zParik/EcresWeb) is a Django e-commerce exercise with the cleanest CRUD layer I have written.

Hackathons: [CodeCultivators at Agrithon](https://github.com/zParik/CodeCultivators---Agrithon) · [CodeCultivators at CommHackathon](https://github.com/zParik/CodeCultivators---CommHackathon) · [Devjams](https://github.com/zParik/Devjams)

</details>

## Tools

**ML and vision:** Python, PyTorch, OpenCV, YOLOv8, MediaPipe\
**Security:** AES-GCM, RSA blind signatures, ECDHE\
**Web:** TypeScript, React, Next.js, Node.js, Django, Flask\
**Desktop and mobile:** Tauri, Rust, Flutter, Dart\
**Data and infrastructure:** PostgreSQL, MongoDB, InfluxDB, Supabase, Docker, Linux

## Telemetry

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/activity-dark.svg">
  <img src="./assets/activity-light.svg" width="100%" alt="GitHub contributions over the last 24 months, as a running total line over monthly bars. Refreshed weekly.">
</picture>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/languages-dark.svg">
  <img src="./assets/languages-light.svg" width="100%" alt="Top eight languages by share of code across owned repositories. Refreshed weekly.">
</picture>
