const CREATE_TIMEOUT_READY_MS = 60_000;
const CREATE_TIMEOUT_DOWNLOAD_MS = 5 * 60_000;
const PROMPT_TIMEOUT_MS = 45_000;

const textLanguages = () => [
  { type: "text" as const, languages: ["en"] },
];

/** Strip model "thinking" wrappers some on-device models emit before the visible answer. */
export const extractAnswerText = (raw: string): string =>
  raw.split("</think>").pop()?.trim() ?? raw.trim();

const chromeLanguageModel = (): LanguageModel | undefined =>
  typeof globalThis.LanguageModel !== "undefined" ? globalThis.LanguageModel : undefined;

const timeoutMessage = (phase: "create" | "prompt", downloading: boolean): string => {
  if (phase === "create") {
    return downloading
      ? "Chrome built-in AI timed out while downloading Gemini Nano. Check progress in chrome://on-device-internals, then try again."
      : "Chrome built-in AI timed out while starting. Try again in a moment.";
  }
  return "Chrome built-in AI timed out generating your answer. Try again.";
};

const rethrowChromeError = (err: unknown, phase: "create" | "prompt", downloading: boolean): void => {
  if (err instanceof Error && err.name === "TimeoutError") {
    throw new Error(timeoutMessage(phase, downloading));
  }
  if (err instanceof Error && err.message.startsWith("Chrome built-in AI")) {
    throw err;
  }
  const detail = err instanceof Error ? err.message : "request failed";
  throw new Error(`Chrome built-in AI couldn't complete this (${detail}).`);
};

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

  const downloading = availability === "downloadable" || availability === "downloading";
  const createTimeoutMs = downloading ? CREATE_TIMEOUT_DOWNLOAD_MS : CREATE_TIMEOUT_READY_MS;

  let session: LanguageModelSession | undefined;
  try {
    session = await LanguageModelCtor.create({
      ...options,
      signal: AbortSignal.timeout(createTimeoutMs),
    });
  } catch (err) {
    rethrowChromeError(err, "create", downloading);
    throw err;
  }

  if (!session) {
    throw new Error("Chrome built-in AI couldn't start a session. Try again.");
  }

  try {
    const response = await session.prompt(prompt, {
      signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS),
    });
    const text = extractAnswerText(response);
    if (!text) {
      throw new Error("Chrome built-in AI returned an empty answer. Try again.");
    }
    return text;
  } catch (err) {
    rethrowChromeError(err, "prompt", downloading);
    throw err;
  } finally {
    session.destroy();
  }
}
