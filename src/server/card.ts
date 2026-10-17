// Server-only: renders the 1200x630 vibe card PNG used for downloads and OG previews.
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { rangeLabel } from "~/lib/ranges";
import type { ShareData } from "~/lib/share";
import pixelFont from "./fonts/PressStart2P-Regular.ttf?inline";
import textFont from "./fonts/Inter-Bold.ttf?inline";

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

// Vite inlines the fonts as data URLs, so the bundle needs no file access at runtime.
const fromDataUrl = (url: string) => Uint8Array.from(atob(url.slice(url.indexOf(",") + 1)), (c) => c.charCodeAt(0)).buffer;

const fonts = [
  { name: "Pixel", data: fromDataUrl(pixelFont), weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: fromDataUrl(textFont), weight: 700 as const, style: "normal" as const },
];

const emojiCache = new Map<string, string | undefined>();

/** Fetch a Twemoji SVG so emoji in the vibe render. Missing emoji are skipped, not fatal. */
async function loadEmoji(segment: string): Promise<string | undefined> {
  const code = [...segment]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((c) => c !== "fe0f")
    .join("-");
  if (emojiCache.has(code)) return emojiCache.get(code);
  let svg: string | undefined;
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) svg = `data:image/svg+xml,${encodeURIComponent(await res.text())}`;
  } catch {
    svg = undefined;
  }
  if (svg !== undefined) emojiCache.set(code, svg); // only cache hits, so a CDN blip can recover
  return svg;
}

export async function renderCard(d: ShareData): Promise<Uint8Array> {
  const songs = d.songs.length ? d.songs : ["No top songs yet"];
  const tree = h(
    "div",
    {
      width: 1200,
      height: 630,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "48px 64px",
      color: "#ffffff",
      fontFamily: "Inter",
      backgroundImage: "linear-gradient(135deg, #0b6e4f 0%, #087e8b 45%, #3c1a5b 100%)",
    },
    h(
      "div",
      { display: "flex", justifyContent: "space-between", alignItems: "center" },
      h("div", { fontFamily: "Pixel", fontSize: 40, textShadow: "4px 4px 0 #000" }, "TASTEBUDS"),
      h("div", { fontSize: 26, opacity: 0.85 }, `@${d.user} · ${rangeLabel(d.range)}`),
    ),
    h(
      "div",
      { display: "flex", flexDirection: "column" },
      h("div", { fontSize: 24, opacity: 0.8, marginBottom: 12 }, "MUSIC VIBE"),
      h("div", { fontSize: d.vibe.length > 70 ? 40 : 52, lineHeight: 1.15, display: "flex", flexWrap: "wrap" }, d.vibe),
    ),
    h(
      "div",
      { display: "flex", flexDirection: "column", fontSize: 24, lineHeight: 1.3, opacity: 0.95 },
      h("div", { fontSize: 22, opacity: 0.75, marginBottom: 8 }, "TOP 5"),
      ...songs.slice(0, 5).map((s, i) =>
        h("div", { display: "flex", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 1072 }, `${i + 1}. ${s}`),
      ),
    ),
  );

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts,
    loadAdditionalAsset: async (code, segment) =>
      (code === "emoji" ? await loadEmoji(segment) : undefined) as string,
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
