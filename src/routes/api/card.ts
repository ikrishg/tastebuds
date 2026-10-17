import type { APIEvent } from "@solidjs/start/server";
import { fromShareParams } from "~/lib/share";
import { renderCard } from "~/server/card";

// GET /api/card?u=&v=&r=&t=  ->  1200x630 PNG. Same params as the share link.
export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const data = fromShareParams(url.searchParams);
  if (!data) {
    return new Response("Missing u (user) or v (vibe)", { status: 400, headers: { "Content-Type": "text/plain" } });
  }
  try {
    const { png, complete } = await renderCard(data);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // A complete card is a pure function of the query string. One missing an emoji (CDN
        // outage) is cached briefly so the next request can render it properly.
        "Cache-Control": complete ? "public, max-age=86400, s-maxage=31536000, immutable" : "public, max-age=60, s-maxage=60",
        ...(url.searchParams.get("download") === "1"
          ? { "Content-Disposition": `attachment; filename="tastebuds-${data.user.replace(/[^\w-]/g, "")}.png"` }
          : {}),
      },
    });
  } catch (err) {
    console.error("card render failed:", err);
    return new Response("Couldn't render the card", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}
