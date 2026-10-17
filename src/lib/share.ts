import { DEFAULT_RANGE, isRangeId, type RangeId } from "./ranges";

/** Everything a share link carries. It lives in the URL, so no storage is needed. */
export interface ShareData {
  user: string;
  vibe: string;
  range: RangeId;
  songs: string[];
}

const MAX_USER = 32;
const MAX_VIBE = 140;
const MAX_SONG = 90;
const MAX_SONGS = 5;
const SEP = "\n";

const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export const toShareParams = (d: ShareData): URLSearchParams => {
  const p = new URLSearchParams();
  p.set("u", clean(d.user, MAX_USER));
  p.set("v", clean(d.vibe, MAX_VIBE));
  p.set("r", d.range);
  p.set("t", d.songs.slice(0, MAX_SONGS).map((s) => clean(s, MAX_SONG)).join(SEP));
  return p;
};

/** Parse and sanitise share params. Returns null when the link is missing the vibe or user. */
export const fromShareParams = (p: URLSearchParams): ShareData | null => {
  const user = clean(p.get("u") || "", MAX_USER);
  const vibe = clean(p.get("v") || "", MAX_VIBE);
  if (!user || !vibe) return null;
  const r = p.get("r");
  const songs = (p.get("t") || "")
    .split(SEP)
    .map((s) => clean(s, MAX_SONG))
    .filter(Boolean)
    .slice(0, MAX_SONGS);
  return { user, vibe, range: isRangeId(r) ? r : DEFAULT_RANGE, songs };
};

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
