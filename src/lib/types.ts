export interface LastFmTrack {
  name: string;
  artist: { name?: string; "#text"?: string } | string;
  album?: { name?: string; "#text"?: string };
  playcount?: string;
  date?: { "#text": string };
}

export interface LastFmArtist {
  name: string;
  playcount?: string;
}

export interface LastFmAlbum {
  name: string;
  artist: { name?: string } | string;
  playcount?: string;
}

export interface LastFmTag {
  name: string;
  count?: string;
}

export interface RecentTracksResponse {
  recenttracks: { track: LastFmTrack[] };
}

export interface TopTracksResponse {
  toptracks: { track: LastFmTrack[] };
}

export interface TopArtistsResponse {
  topartists: { artist: LastFmArtist[] };
}

export interface TopAlbumsResponse {
  topalbums: { album: LastFmAlbum[] };
}

export interface TopTagsResponse {
  toptags: { tag: LastFmTag[] };
}
