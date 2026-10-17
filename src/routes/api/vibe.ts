import type { APIEvent } from "@solidjs/start/server";
import { generateMusicVibePrompt } from "~/lib/ai";
import { AIUnavailableError, complete } from "~/server/ai";
import { guardAIRequest } from "~/server/guard";
import { DEFAULT_RANGE, isRangeId } from "~/lib/ranges";

const MAX_LINES = 120;
const MAX_LINE_LENGTH = 400;

export async function POST(event: APIEvent) {
  let body: { musicData?: unknown; range?: unknown };
  try {
    body = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const lines = body?.musicData;
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every((l) => typeof l === "string")) {
    return json({ error: "musicData must be a non-empty array of strings" }, 400);
  }
  const range = body.range === undefined ? DEFAULT_RANGE : body.range;
  if (!isRangeId(range)) {
    return json({ error: "range must be one of 7day, 1month, 6month, overall" }, 400);
  }
  const musicData = (lines as string[]).slice(0, MAX_LINES).map((l) => l.slice(0, MAX_LINE_LENGTH));

  // Only valid requests count against the limit, and the check runs before any quota is spent.
  const refused = guardAIRequest(event.request);
  if (refused) return refused;

  try {
    const { text, model } = await complete([{ role: "user", content: generateMusicVibePrompt(musicData, range) }]);
    return json({ vibe: text, model });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? err.status : 502;
    const message = err instanceof Error ? err.message : "The AI service failed.";
    console.error("vibe generation failed:", message);
    return json({ error: message }, status);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
