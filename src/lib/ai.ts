import { completeInBrowser } from "./client-ai";
import { DEFAULT_RANGE, rangeLabel, type RangeId } from "./ranges";

const MAX_LINES = 120;
const MAX_LINE_LENGTH = 400;

const sanitizeMusicLines = (lines: string[]): string[] =>
  lines.slice(0, MAX_LINES).map((l) => l.slice(0, MAX_LINE_LENGTH));

export const generateMusicVibePrompt = (musicData: string[], range: RangeId = DEFAULT_RANGE): string => {
  const focus =
    range === "7day"
      ? "Focus heavily on RECENTLY PLAYED tracks:"
      : `This covers their listening over ${rangeLabel(range) === "All time" ? "all time" : `the last ${rangeLabel(range)}`}. Focus on the TOP tracks, artists and albums:`;
  return `Analyze this Last.fm data and generate a witty one-liner about this user's music vibe with a rating out of 10. ${focus}

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

export interface ComparePromptInput {
  me: string;
  friend: string;
  range: RangeId;
  score: number;
  sharedArtists: string[];
  sharedTracks: string[];
  myTopArtists: string[];
  friendTopArtists: string[];
}

export const generateComparePrompt = ({
  me,
  friend,
  range,
  score,
  sharedArtists,
  sharedTracks,
  myTopArtists,
  friendTopArtists,
}: ComparePromptInput): string =>
  `Two Last.fm users are comparing music taste over ${rangeLabel(range).toLowerCase()}.
Compatibility score: ${Math.round(score)}/100.
${me}'s top artists: ${myTopArtists.join(", ") || "none"}
${friend}'s top artists: ${friendTopArtists.join(", ") || "none"}
Shared artists: ${sharedArtists.join(", ") || "none"}
Shared tracks: ${sharedTracks.join(", ") || "none"}

Write ONE witty line (max 18 words) about how well their tastes match, in the spirit of the score. Mention a shared artist if there is one. Pop culture and meme references welcome. End with one fitting emoji. No quotes, no preamble, just the line.`;

/** Generate a vibe in the browser. Throws with a real error when every provider fails. */
export const requestVibe = async (musicData: string[], range: RangeId = DEFAULT_RANGE): Promise<string> => {
  const prompt = generateMusicVibePrompt(sanitizeMusicLines(musicData), range);
  return completeInBrowser(prompt);
};
