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

const fetchLastFmData = async <T extends LastFmMethod>(
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
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

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

export const fetchAllMusicData = async () => {
  try {
    const recentTracks = await fetchLastFmData("user.getRecentTracks", {}, 50);
    const topAlbums = await fetchLastFmData(
      "user.getTopAlbums",
      { period: "7day" },
      10
    );
    const topArtists = await fetchLastFmData(
      "user.getTopArtists",
      { period: "7day" },
      10
    );
    const topTags = await fetchLastFmData("user.getTopTags", {}, 10);
    const topTracks = await fetchLastFmData(
      "user.getTopTracks",
      { period: "7day" },
      15
    );

    return {
      musicData: [
        recentTracks.recenttracks.track.map((track, index) =>
          formatTrack(
            track,
            index,
            `RECENTLY PLAYED, ${track.date?.["#text"] || ""}`
          )
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
