import { apiKey, apiUrl } from "~/config";
import {
  type LastFmTrack,
  type LastFmArtist,
  type LastFmAlbum,
  type LastFmTag,
  type RecentTracksResponse,
  type TopTracksResponse,
  type TopArtistsResponse,
  type TopAlbumsResponse,
  type TopTagsResponse,
} from "./types";
import { handleApiError } from "./errors";
import { DEFAULT_RANGE, type RangeId } from "./ranges";

export type { LastFmTrack, LastFmArtist, LastFmAlbum, LastFmTag };

type LastFmMethod =
  | "user.getRecentTracks"
  | "user.getTopAlbums"
  | "user.getTopArtists"
  | "user.getTopTags"
  | "user.getTopTracks";

type MethodResponseMap = {
  "user.getRecentTracks": RecentTracksResponse;
  "user.getTopAlbums": TopAlbumsResponse;
  "user.getTopArtists": TopArtistsResponse;
  "user.getTopTags": TopTagsResponse;
  "user.getTopTracks": TopTracksResponse;
};

export const fetchLastFmData = async <T extends LastFmMethod>(
  method: T,
  params: Record<string, string> = {},
  limit = 10
): Promise<MethodResponseMap[T]> => {
  const username = localStorage.getItem("username");
  if (!username) {
    throw new Error("Invalid Session: No username found");
  }

  const url = new URL(apiUrl);
  const parameters: Record<string, string> = {
    method,
    api_key: apiKey,
    user: username,
    limit: limit.toString(),
    format: "json",
    ...params,
  };

  Object.entries(parameters).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url);
    // Last.fm sends its error as JSON even on 4xx (for example 404 {"error":6,"message":"User not found"}),
    // so read the body before falling back to the bare HTTP status.
    const data = await response.json().catch(() => null);
    if (!response.ok && !data?.error) {
      throw new Error(`Last.fm returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`);
    }
    if (!data) {
      throw new Error("Last.fm sent a response Tastebuds couldn't read. Try again in a moment.");
    }

    if (data.error) {
      throw new Error(`Last.fm API error: ${data.message || data.error}`);
    }

    // Additional check to handle the case where the response might still be an error type
    if ("error" in data) {
      throw new Error(handleApiError(data));
    }

    return data as MethodResponseMap[T];
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const formatTrack = (
  track: LastFmTrack,
  index: number,
  prefix: string
): string => {
  const artist =
    typeof track.artist === "string"
      ? track.artist
      : track.artist?.name || track.artist?.["#text"] || "Unknown";

  return `${prefix} ${index + 1}: Track Name: "${
    track.name
  }" | Artist: "${artist}" | Album: "${
    track.album?.["#text"] || track.album?.name || "Unknown"
  }" | Play Count: ${track.playcount || "Unknown"}`;
};

export const formatArtist = (
  artist: LastFmArtist,
  index: number,
  prefix: string
): string => {
  return `${prefix} ${index + 1}: Artist Name: "${artist.name}" | Play Count: ${
    artist.playcount || "Unknown"
  }`;
};

export const formatAlbum = (
  album: LastFmAlbum,
  index: number,
  prefix: string
): string => {
  const artist =
    typeof album.artist === "string"
      ? album.artist
      : album.artist?.name || "Unknown";

  return `${prefix} ${index + 1}: Album Name: "${
    album.name
  }" | Artist: "${artist}" | Play Count: ${album.playcount || "Unknown"}`;
};

export const formatTag = (
  tag: LastFmTag,
  index: number,
  prefix: string
): string => {
  return `${prefix} ${index + 1}: Tag: "${tag.name}" | Count: ${
    tag.count || "Unknown"
  }`;
};

export const fetchAllMusicData = async (range: RangeId = DEFAULT_RANGE) => {
  try {
    const [recentTracks, topAlbums, topArtists, topTags, topTracks] = await Promise.all([
      // Recent plays only describe the last few days, so they only feed the 7-day vibe.
      range === "7day"
        ? fetchLastFmData("user.getRecentTracks", {}, 50)
        : Promise.resolve({ recenttracks: { track: [] as LastFmTrack[] } }),
      fetchLastFmData("user.getTopAlbums", { period: range }, 10),
      fetchLastFmData("user.getTopArtists", { period: range }, 10),
      fetchLastFmData("user.getTopTags", {}, 10),
      fetchLastFmData("user.getTopTracks", { period: range }, 15),
    ]);

    return {
      musicData: [
        recentTracks.recenttracks.track.map((track, index) =>
          formatTrack(
            track,
            index,
            `RECENTLY PLAYED, ${track.date?.["#text"] || ""}`
          )
        ),
        topTracks.toptracks.track.map((track, index) =>
          formatTrack(track, index, "TOP TRACK")
        ),
        topAlbums.topalbums.album.map((album, index) =>
          formatAlbum(album, index, "TOP ALBUM")
        ),
        topArtists.topartists.artist.map((artist, index) =>
          formatArtist(artist, index, "TOP ARTIST")
        ),
        topTags.toptags.tag.map((tag, index) =>
          formatTag(tag, index, "TOP TAG")
        ),
      ].flat(),
      topSongs: topTracks.toptracks.track,
      topArtists: topArtists.topartists.artist,
    };
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
