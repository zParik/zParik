<!--
  Parikshieth Harish · GitHub profile README

  Every image is an "instrument plate": oscilloscope in dark theme, chart
  recorder in light theme. Each <picture> swaps variants by colour scheme.
    scripts/render-plates.mjs     hero, project, tools, contact plates (run by hand, needs qrencode)
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

**PaleGuard** in *Scientific Reports*, 2026: [doi:10.1038/s41598-026-65582-6](https://doi.org/10.1038/s41598-026-65582-6) · [code](https://github.com/zParik/CapStoneProject). The full capstone system goes further: a Flutter client captures packets through Npcap over Dart FFI, streams them over gRPC to a FastAPI server, renders each 512-packet window as a 256×256 traffic image, and flags anomalous network traffic with a convolutional memory-augmented autoencoder. Solo design, implementation, and evaluation.

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

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/plate-tools-dark.svg">
  <img src="./assets/plate-tools-light.svg" width="100%" alt="Tools as a patch bay. Cables join tools that shipped together: in PaleGuard, Python to PyTorch, Dart to Npcap, FastAPI to gRPC and to InfluxDB; Python to OpenCV in CV-Project; Rust to Tauri and TypeScript to React in Qyra; Node.js to AES-GCM in ARCHON; Hyprland to Lua in Valkyrn.">
</picture>

<details>
<summary>Tools as text</summary>

<br/>

**Languages:** C++, C, Python, Rust, TypeScript, Dart\
**ML and vision:** PyTorch, OpenCV, YOLOv8, MediaPipe\
**App and web:** Tauri, Flutter, React, Next.js, Node.js, FastAPI, Django, Flask\
**Networking and security:** Npcap, gRPC, Protobuf, AES-GCM, RSA blind signatures, ECDHE\
**Data and infrastructure:** PostgreSQL, InfluxDB, MongoDB, Supabase, Docker, CMake\
**OS and shell:** Arch Linux, Windows, Bash, PowerShell, Hyprland, Lua

</details>

## Telemetry

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/activity-dark.svg">
  <img src="./assets/activity-light.svg" width="100%" alt="GitHub contributions over the last 24 months, as a running total line over monthly bars. Refreshed weekly.">
</picture>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/languages-dark.svg">
  <img src="./assets/languages-light.svg" width="100%" alt="Top eight languages by share of code in repositories pushed in the last 12 months. Refreshed weekly.">
</picture>

<br/>

<a href="https://zparik.github.io/portfolioPage/">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/plate-contact-dark.svg">
  <img src="./assets/plate-contact-light.svg" width="100%" alt="Contact: parikshieth@gmail.com, LinkedIn in/parikshieth-harish, and a QR code that opens the portfolio.">
</picture>
</a>
