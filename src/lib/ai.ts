export interface ChatMessage {
  role: string;
  content: string;
}

export interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export const callAI = async (
  messages: ChatMessage[]
): Promise<string | null> => {
  try {
    const response = await fetch("https://ai.hackclub.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (response.ok) {
      const data: AIResponse = await response.json();
      return (
        data.choices?.[0]?.message?.content?.split("</think>").pop()?.trim() ||
        null
      );
    }
    return null;
  } catch (error) {
    console.error("AI API Error:", error);
    return null;
  }
};

export const generateMusicVibePrompt = (musicData: string[]): string => {
  return `Analyze this Last.fm data and generate a witty one-liner about this user's music vibe with a rating out of 10. Focus heavily on RECENTLY PLAYED tracks:

${musicData.join("\n")}

Generate a clever couple of words that captures their musical essence (MAX 4 WORDS), and include a rating (X/10) at the end.

Examples:
- Depressed, need heart break therapy core 💔
- Barbie fell in golden glitter core ✨
- I love sad songs that make me cry 😢
- Married to Mozart 🎼

Format: {vibe} | ({X/10})

Don't give nothing more than what is asked, no extra text, no explanations, just the vibe and rating in the format above. Add an emoji that fits the vibe at the end. Vibe should be a short, catchy phrase that reflects their musical taste, and the rating should be a number from 1 to 10. The vibe should be unique and not generic, capturing the essence of their music preferences. The vibe should be related to pop culture, memes, or current trends, and should resonate with the user's personality and musical habits. Avoid using overly complex or technical terms, keep it simple and relatable. The vibe should be something that could be used as a catchy phrase or slogan for their music taste.`;
};
