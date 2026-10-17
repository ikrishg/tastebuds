import type { APIEvent } from "@solidjs/start/server";
import { AIUnavailableError, complete } from "~/server/ai";
import { isRangeId, rangeLabel } from "~/lib/ranges";

const MAX_ITEMS = 20;
const MAX_LEN = 200;

const strings = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((s) => typeof s === "string")
    ? (v as string[]).slice(0, MAX_ITEMS).map((s) => s.slice(0, MAX_LEN))
    : null;

export async function POST(event: APIEvent) {
  let body: Record<string, unknown>;
  try {
    body = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const me = typeof body.me === "string" ? body.me.slice(0, 32) : "";
  const friend = typeof body.friend === "string" ? body.friend.slice(0, 32) : "";
  const score = body.score;
  const range = body.range;
  const sharedArtists = strings(body.sharedArtists);
  const sharedTracks = strings(body.sharedTracks);
  const myTopArtists = strings(body.myTopArtists);
  const friendTopArtists = strings(body.friendTopArtists);

  if (!me || !friend) return json({ error: "me and friend are required" }, 400);
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
    return json({ error: "score must be a number from 0 to 100" }, 400);
  }
  if (!isRangeId(range)) return json({ error: "range must be one of 7day, 1month, 6month, overall" }, 400);
  if (!sharedArtists || !sharedTracks || !myTopArtists || !friendTopArtists) {
    return json({ error: "artist and track lists must be arrays of strings" }, 400);
  }

  const prompt = `Two Last.fm users are comparing music taste over ${rangeLabel(range).toLowerCase()}.
Compatibility score: ${Math.round(score)}/100.
${me}'s top artists: ${myTopArtists.join(", ") || "none"}
${friend}'s top artists: ${friendTopArtists.join(", ") || "none"}
Shared artists: ${sharedArtists.join(", ") || "none"}
Shared tracks: ${sharedTracks.join(", ") || "none"}

Write ONE witty line (max 18 words) about how well their tastes match, in the spirit of the score. Mention a shared artist if there is one. Pop culture and meme references welcome. End with one fitting emoji. No quotes, no preamble, just the line.`;

  try {
    const { text, model } = await complete([{ role: "user", content: prompt }]);
    return json({ line: text.replace(/^["']|["']$/g, ""), model });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? err.status : 502;
    const message = err instanceof Error ? err.message : "The AI service failed.";
    console.error("compare line failed:", message);
    return json({ error: message }, status);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
