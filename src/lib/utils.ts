export const formatTime = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export const handleAuthError = (): void => {
  localStorage.removeItem("username");
  location.href = "/";
};

export const isAuthError = (errorMessage: string): boolean => {
  return (
    errorMessage.includes("Unauthorized") ||
    errorMessage.includes("401") ||
    errorMessage.includes("Invalid session")
  );
};

export const getCachedData = () => {
  return {
    vibe: localStorage.getItem("music_vibe"),
    topSongs: localStorage.getItem("top_songs"),
    topArtists: localStorage.getItem("top_artists"),
    lastGenerated: localStorage.getItem("last_generated"),
  };
};

export const setCachedData = (
  vibe: string,
  topSongs: any[],
  topArtists: any[]
) => {
  const now = new Date().getTime();
  localStorage.setItem("music_vibe", vibe);
  localStorage.setItem("top_songs", JSON.stringify(topSongs));
  localStorage.setItem("top_artists", JSON.stringify(topArtists));
  localStorage.setItem("last_generated", now.toString());
  return now;
};

export const clearCachedData = () => {
  localStorage.removeItem("last_generated");
  localStorage.removeItem("music_vibe");
  localStorage.removeItem("top_songs");
  localStorage.removeItem("top_artists");
};
