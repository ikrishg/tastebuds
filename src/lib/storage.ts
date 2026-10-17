import type { LastFmArtist, LastFmTrack } from "./types";
import { DEFAULT_RANGE, isRangeId, type RangeId } from "./ranges";

// Everything lives in this browser's localStorage, the only storage Tastebuds has.

export interface CachedAnalysis {
  vibe: string;
  topSongs: LastFmTrack[];
  topArtists: LastFmArtist[];
  generatedAt: number;
}

export interface HistoryEntry {
  vibe: string;
  range: RangeId;
  generatedAt: number;
  topSongs: string[];
  topArtists: string[];
}

export const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const HISTORY_KEY = "tb:history";
const HISTORY_LIMIT = 100;
const cacheKey = (range: RangeId) => `tb:cache:${range}`;

const readJSON = <T>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const LEGACY_KEYS = ["music_vibe", "top_songs", "top_artists", "last_generated"];

/** Try a localStorage write. Returns false instead of throwing (for example when storage is full). */
const tryWrite = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Move the pre-range cache (7 days only) into the 7-day slot once. The old keys are removed only
 * after the copy is saved, or when they are unreadable, so a full storage never loses the old vibe.
 */
export const migrateLegacyCache = () => {
  if (!LEGACY_KEYS.some((k) => localStorage.getItem(k) !== null)) return;
  const vibe = localStorage.getItem("music_vibe");
  const songs = localStorage.getItem("top_songs");
  const artists = localStorage.getItem("top_artists");
  const at = Number(localStorage.getItem("last_generated"));

  let entry: CachedAnalysis | null = null;
  if (vibe && songs && artists && at) {
    try {
      entry = { vibe, topSongs: JSON.parse(songs), topArtists: JSON.parse(artists), generatedAt: at };
    } catch {
      entry = null;
    }
  }

  if (entry && !localStorage.getItem(cacheKey(DEFAULT_RANGE))) {
    if (!tryWrite(cacheKey(DEFAULT_RANGE), JSON.stringify(entry))) return; // keep the old copy, retry next load
  }
  // Free the legacy keys first so the history write has their space to use.
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  if (entry) addHistory(DEFAULT_RANGE, entry);
};

export const getCachedAnalysis = (range: RangeId): CachedAnalysis | null => {
  migrateLegacyCache();
  const entry = readJSON<CachedAnalysis>(cacheKey(range));
  if (!entry || typeof entry.vibe !== "string" || !Array.isArray(entry.topSongs) || !Array.isArray(entry.topArtists)) {
    return null;
  }
  return entry;
};

/** Save a result and add it to history. Never throws; reports which writes worked. */
export const saveAnalysis = (range: RangeId, entry: CachedAnalysis): { cached: boolean; history: boolean } => ({
  cached: tryWrite(cacheKey(range), JSON.stringify(entry)),
  history: addHistory(range, entry),
});

export const clearAnalysis = (range: RangeId) => localStorage.removeItem(cacheKey(range));

export const getHistory = (): HistoryEntry[] => {
  const list = readJSON<HistoryEntry[]>(HISTORY_KEY);
  if (!Array.isArray(list)) return [];
  return list
    .filter((h) => h && typeof h.vibe === "string" && isRangeId(h.range) && Number.isFinite(h.generatedAt))
    .sort((a, b) => b.generatedAt - a.generatedAt);
};

const artistName = (song: LastFmTrack): string =>
  typeof song.artist === "string" ? song.artist : song.artist?.name || song.artist?.["#text"] || "";

const addHistory = (range: RangeId, entry: CachedAnalysis): boolean => {
  const list = getHistory().filter((h) => !(h.range === range && h.generatedAt === entry.generatedAt));
  list.unshift({
    vibe: entry.vibe,
    range,
    generatedAt: entry.generatedAt,
    topSongs: entry.topSongs.slice(0, 5).map((s) => `${s.name}${artistName(s) ? ` by ${artistName(s)}` : ""}`),
    topArtists: entry.topArtists.slice(0, 5).map((a) => a.name),
  });
  // If storage is full, drop the oldest entries until it fits.
  for (let n = Math.min(list.length, HISTORY_LIMIT); n > 0; n = Math.floor(n / 2)) {
    if (tryWrite(HISTORY_KEY, JSON.stringify(list.slice(0, n)))) return true;
  }
  return false;
};

export const clearAllForUser = () => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("tb:")) localStorage.removeItem(k);
};
