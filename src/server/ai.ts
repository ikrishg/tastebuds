// Server-only. Talks to the Hack Club AI proxy (OpenAI-compatible, needs an API key).
const DEFAULT_BASE_URL = "https://ai.hackclub.com/proxy/v1";
const DEFAULT_MODELS = ["openai/gpt-4o-mini", "google/gemini-2.5-flash"];
const TIMEOUT_MS = 20_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AIUnavailableError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

function models(): string[] {
  const primary = process.env.AI_MODEL?.trim();
  const fallback = process.env.AI_FALLBACK_MODEL?.trim();
  const list = [primary || DEFAULT_MODELS[0], fallback || DEFAULT_MODELS[1]];
  return [...new Set(list)];
}

/** Try each model in order. Returns the first non-empty answer, or throws with every failure. */
export async function complete(messages: ChatMessage[]): Promise<{ text: string; model: string }> {
  const apiKey = process.env.HACKCLUB_AI_API_KEY;
  if (!apiKey) {
    throw new AIUnavailableError("The AI service isn't configured on the server (HACKCLUB_AI_API_KEY is missing).", 503);
  }
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const failures: string[] = [];

  for (const model of models()) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        failures.push(`${model}: HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.split("</think>").pop()?.trim();
      if (text) return { text, model };
      failures.push(`${model}: empty answer`);
    } catch (err) {
      failures.push(`${model}: ${err instanceof Error ? err.name === "TimeoutError" ? "timed out" : err.message : "request failed"}`);
    }
  }
  throw new AIUnavailableError(`The AI service didn't answer (${failures.join("; ")}).`);
}
