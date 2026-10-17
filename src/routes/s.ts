import type { APIEvent } from "@solidjs/start/server";
import { escapeHtml, fromShareParams, toShareParams } from "~/lib/share";
import { rangeLabel } from "~/lib/ranges";

const SITE = "https://tastebuds.krishg.com";

// GET /s?u=&v=&r=&t=  ->  a small server-rendered page whose OG tags describe this exact vibe.
export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const data = fromShareParams(url.searchParams);
  if (!data) return Response.redirect(`${SITE}/`, 302);

  const origin = url.host.endsWith("krishg.com") || url.host.startsWith("localhost") ? url.origin : SITE;
  const params = toShareParams(data).toString();
  const pageUrl = `${origin}/s?${params}`;
  const imageUrl = `${origin}/api/card?${params}`;
  const title = `${data.user}'s music vibe: ${data.vibe} • Tastebuds`;
  const description = data.songs.length
    ? `Top songs (${rangeLabel(data.range).toLowerCase()}): ${data.songs.join("; ")}. Find your own vibe on Tastebuds.`
    : `Find your own music vibe on Tastebuds.`;
  const e = escapeHtml;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${e(title)}</title>
<meta name="description" content="${e(description)}" />
<link rel="canonical" href="${e(pageUrl)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Tastebuds" />
<meta property="og:url" content="${e(pageUrl)}" />
<meta property="og:title" content="${e(title)}" />
<meta property="og:description" content="${e(description)}" />
<meta property="og:image" content="${e(imageUrl)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${e(`${data.user}'s Tastebuds vibe card`)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${e(title)}" />
<meta name="twitter:description" content="${e(description)}" />
<meta name="twitter:image" content="${e(imageUrl)}" />
<link rel="icon" href="/favicon.ico" />
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; padding: 1.5rem; box-sizing: border-box; font-family: system-ui, sans-serif; background: #0b3d3a; color: #fff; text-align: center; }
  img { width: 100%; max-width: 900px; height: auto; border: 3px solid #000; box-shadow: 6px 6px 0 #000; }
  a { color: #000; background: #fff; padding: 0.75rem 1.25rem; border: 3px solid #000; box-shadow: 4px 4px 0 #000; text-decoration: none; font-weight: 700; }
</style>
</head>
<body>
<img src="${e(imageUrl)}" alt="${e(`${data.user}'s vibe: ${data.vibe}`)}" width="1200" height="630" />
<a href="/">Find your own vibe</a>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=86400" },
  });
}
