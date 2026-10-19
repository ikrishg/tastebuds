import { completeInBrowser } from "./client-ai";
import { generateComparePrompt } from "./ai";
import { fetchLastFmData, type LastFmArtist, type LastFmTrack } from "./api";
import type { RangeId } from "./ranges";

const LIST_SIZE = 50;
// Last.fm usernames: 2-15 characters, start with a letter, then letters, digits, "_" or "-".
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_-]{1,14}$/;

export interface Taste {
  artists: string[];
  tracks: string[];
}

export interface Compatibility {
  score: number;
  sharedArtists: string[];
  sharedTracks: string[];
}

export const isValidUsername = (name: string): boolean => USERNAME_RE.test(name);

const norm = (s: string) => s.trim().toLowerCase();
const trackKey = (t: LastFmTrack) => {
  const artist = typeof t.artist === "string" ? t.artist : t.artist?.name || t.artist?.["#text"] || "";
  return `${t.name} by ${artist}`;
};

export const fetchTaste = async (user: string, range: RangeId): Promise<Taste> => {
  const [artists, tracks] = await Promise.all([
    fetchLastFmData("user.getTopArtists", { user, period: range }, LIST_SIZE),
    fetchLastFmData("user.getTopTracks", { user, period: range }, LIST_SIZE),
  ]);
  return {
    artists: (artists.topartists.artist as LastFmArtist[]).map((a) => a.name),
    tracks: (tracks.toptracks.track as LastFmTrack[]).map(trackKey),
  };
};

/** Rank weights: the first item weighs most, weights sum to 1. */
const weights = (list: string[]): Map<string, number> => {
  const n = list.length;
  const total = (n * (n + 1)) / 2;
  const m = new Map<string, number>();
  list.forEach((item, i) => {
    const key = norm(item);
    if (!m.has(key)) m.set(key, (n - i) / total);
  });
  return m;
};

/** Weighted overlap in [0, 1]: sum of the smaller weight for every shared item. */
const overlap = (a: string[], b: string[]): { sim: number; shared: string[] } => {
  const wa = weights(a);
  const wb = weights(b);
  let sim = 0;
  const shared: { name: string; w: number }[] = [];
  for (const item of a) {
    const key = norm(item);
    const x = wa.get(key);
    const y = wb.get(key);
    if (x !== undefined && y !== undefined && !shared.some((s) => norm(s.name) === key)) {
      sim += Math.min(x, y);
      shared.push({ name: item, w: x + y });
    }
  }
  shared.sort((p, q) => q.w - p.w);
  return { sim, shared: shared.map((s) => s.name) };
};

/**
 * Score out of 100. Artists count for 70%, tracks for 30%. The square root spreads
 * the low raw overlaps most pairs have, so a handful of shared favourites reads as a match.
 */
export const compareTastes = (mine: Taste, theirs: Taste): Compatibility => {
  const artists = overlap(mine.artists, theirs.artists);
  const tracks = overlap(mine.tracks, theirs.tracks);
  const raw = 0.7 * artists.sim + 0.3 * tracks.sim;
  return {
    score: Math.round(100 * Math.sqrt(Math.min(1, raw))),
    sharedArtists: artists.shared,
    sharedTracks: tracks.shared,
  };
};

/** Generate a one-line verdict in the browser. Throws when every provider fails. */
export const requestCompatibilityLine = async (input: {
  me: string;
  friend: string;
  range: RangeId;
  score: number;
  sharedArtists: string[];
  sharedTracks: string[];
  myTopArtists: string[];
  friendTopArtists: string[];
}): Promise<string> => {
  const text = await completeInBrowser(generateComparePrompt(input));
  return text.replace(/^["']|["']$/g, "");
};
