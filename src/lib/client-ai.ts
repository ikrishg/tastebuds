const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const POLLINATIONS_MODEL = "openai";
const TIMEOUT_MS = 20_000;

const textLanguages = () => [
  { type: "text" as const, languages: ["en"] },
];

/** Strip model "thinking" wrappers some backends emit before the visible answer. */
export const extractAnswerText = (raw: string): string =>
  raw.split("</think>").pop()?.trim() ?? raw.trim();

const chromeLanguageModel = (): LanguageModel | undefined =>
  typeof globalThis.LanguageModel !== "undefined" ? globalThis.LanguageModel : undefined;

async function completeWithChrome(prompt: string): Promise<string> {
  const LanguageModelCtor = chromeLanguageModel();
  if (!LanguageModelCtor) {
    throw new Error("Chrome built-in AI (Gemini Nano) is not available in this browser.");
  }

  const options = {
    expectedInputs: textLanguages(),
    expectedOutputs: textLanguages(),
  };

  const availability = await LanguageModelCtor.availability(options);
  if (availability === "unavailable") {
    throw new Error("Chrome built-in AI is unavailable on this device (check chrome://on-device-internals).");
  }

  const session = await LanguageModelCtor.create(options);
  try {
    const response = await session.prompt(prompt);
    const text = extractAnswerText(response);
    if (!text) throw new Error("Chrome built-in AI returned an empty answer.");
    return text;
  } finally {
    session.destroy();
  }
}

async function completeWithPollinations(prompt: string): Promise<string> {
  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: POLLINATIONS_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Pollinations text API returned HTTP ${res.status}.`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = extractAnswerText(data.choices?.[0]?.message?.content ?? "");
  if (!text) throw new Error("Pollinations text API returned an empty answer.");
  return text;
}

/**
 * Run a single user prompt in the browser: Chrome built-in AI first, then Pollinations.
 * Throws a combined error when both providers fail (no fake vibes).
 */
export async function completeInBrowser(prompt: string): Promise<string> {
  const failures: string[] = [];

  try {
    return await completeWithChrome(prompt);
  } catch (err) {
    failures.push(`Chrome built-in AI: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    return await completeWithPollinations(prompt);
  } catch (err) {
    failures.push(
      `Pollinations: ${err instanceof Error ? err.name === "TimeoutError" ? "timed out" : err.message : "request failed"}`,
    );
  }

  throw new Error(`Couldn't generate text in your browser (${failures.join("; ")}).`);
}
