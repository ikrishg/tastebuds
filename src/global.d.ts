/// <reference types="@solidjs/start/env" />

/** Chrome Prompt API (Gemini Nano). See https://developer.chrome.com/docs/ai/prompt-api */
interface LanguageModelCreateOptions {
  expectedInputs?: { type: "text" | "image" | "audio"; languages?: string[] }[];
  expectedOutputs?: { type: "text" | "image" | "audio"; languages?: string[] }[];
  initialPrompts?: { role: "system" | "user" | "assistant"; content: string }[];
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

interface LanguageModel {
  availability(
    options?: LanguageModelCreateOptions,
  ): Promise<"unavailable" | "downloadable" | "downloading" | "readily">;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

declare global {
  // eslint-disable-next-line no-var
  var LanguageModel: LanguageModel | undefined;
}

export {};
