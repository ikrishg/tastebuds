const textLanguages = () => [
  { type: "text" as const, languages: ["en"] },
];

/** Strip model "thinking" wrappers some on-device models emit before the visible answer. */
export const extractAnswerText = (raw: string): string =>
  raw.split("</think>").pop()?.trim() ?? raw.trim();

const chromeLanguageModel = (): LanguageModel | undefined =>
  typeof globalThis.LanguageModel !== "undefined" ? globalThis.LanguageModel : undefined;

/**
 * Run a single user prompt with Chrome built-in AI only (Gemini Nano via the Prompt API).
 * Listening data never leaves the device. Throws a clear error when Nano is missing or fails.
 */
export async function completeInBrowser(prompt: string): Promise<string> {
  const LanguageModelCtor = chromeLanguageModel();
  if (!LanguageModelCtor) {
    throw new Error(
      "Vibes need Chrome built-in AI (Gemini Nano). Use Chrome on desktop and enable the model in chrome://on-device-internals — listening data stays on your device.",
    );
  }

  const options = {
    expectedInputs: textLanguages(),
    expectedOutputs: textLanguages(),
  };

  const availability = await LanguageModelCtor.availability(options);
  if (availability === "unavailable") {
    throw new Error(
      "Chrome built-in AI isn't available on this device. Check chrome://on-device-internals to download or enable Gemini Nano.",
    );
  }

  const session = await LanguageModelCtor.create(options);
  try {
    const response = await session.prompt(prompt);
    const text = extractAnswerText(response);
    if (!text) {
      throw new Error("Chrome built-in AI returned an empty answer. Try again.");
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Chrome built-in AI")) {
      throw err;
    }
    const detail = err instanceof Error ? err.message : "request failed";
    throw new Error(`Chrome built-in AI couldn't complete this (${detail}).`);
  } finally {
    session.destroy();
  }
}
