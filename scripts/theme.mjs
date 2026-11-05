// Shared palette for profile graphs. Each SVG renders twice, once per GitHub
// theme, and the README swaps them with <picture> + prefers-color-scheme.
//
// Backgrounds are transparent so the chart sits on GitHub's own canvas
// instead of inside a boxed card. Colours are explicit hex (no opacity
// stacking) so contrast is predictable. Measured WCAG ratios:
//   dark   accent 10.5:1, muted 6.4:1, bars 3.1:1 on #0d1117
//   light  accent  5.4:1, muted 6.1:1, bars 2.6:1 on #ffffff
// Bars and line also differ by shape, so colour is never the only signal.

export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

export const THEMES = {
  dark: {
    accent: "#22D3EE",
    bar:    "#2a6a7a",
    text:   "#e6edf3",
    muted:  "#8b98a5",
    grid:   "#21262d",
    track:  "#161b22",
  },
  light: {
    accent: "#0e7490",
    bar:    "#6aa9b8",
    text:   "#1f2328",
    muted:  "#59636e",
    grid:   "#e6e9ec",
    track:  "#eff2f4",
  },
};
