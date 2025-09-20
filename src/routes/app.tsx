import { Window } from "~/components/Window";
import { createSignal, onMount, Show } from "solid-js";
import { callAI, generateMusicVibePrompt } from "~/lib/ai";
import { fetchAllMusicData, LastFmTrack, LastFmArtist } from "~/lib/api";
import {
  formatTime,
  handleAuthError,
  isAuthError,
  getCachedData,
  setCachedData,
  clearCachedData,
} from "~/lib/utils";

export default function App() {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal(false);
  const [musicVibe, setMusicVibe] = createSignal<string>("");
  const [topSongs, setTopSongs] = createSignal<LastFmTrack[]>([]);
  const [topArtists, setTopArtists] = createSignal<LastFmArtist[]>([]);
  const [regenerateDisabled, setRegenerateDisabled] = createSignal(true);
  const [regenerateText, setRegenerateText] = createSignal(
    "🔄 Available in 24h"
  );
  const [loadingStatus, setLoadingStatus] =
    createSignal<string>("Initializing...");

  const errHandler = (error: any) => {
    const errorMessage =
      typeof error === "string"
        ? error
        : error.message || JSON.stringify(error) || "Unknown error";

    if (isAuthError(errorMessage)) {
      handleAuthError();
      return;
    }

    setLoading(false);
    setError(errorMessage);
  };

  const handleRegenerate = () => {
    clearCachedData();
    location.reload();
  };

  onMount(() => {
    console.log("onMount started");
    const username = localStorage.getItem("username");
    if (!username) {
      location.href = "/";
      return;
    }

    const lastGenerated = localStorage.getItem("last_generated");
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    let shouldFetchData = true;
    let timeRemaining = 0;

    if (lastGenerated) {
      const timeDifference = now - parseInt(lastGenerated);
      if (timeDifference < twentyFourHours) {
        shouldFetchData = false;
        timeRemaining = twentyFourHours - timeDifference;
      }
    }

    console.log("shouldFetchData:", shouldFetchData);

    if (shouldFetchData) {
      // Handle async data fetching
      (async () => {
        try {
          setLoadingStatus("Fetching your recent tracks...");
          const {
            musicData,
            topSongs: songs,
            topArtists: artists,
          } = await fetchAllMusicData();

          // Store the top songs and artists for display
          setTopSongs(songs);
          setTopArtists(artists);

          setLoadingStatus("Processing your music data...");
          const vibePrompt = generateMusicVibePrompt(musicData);

          let musicVibeResult =
            "Your music taste is as mysterious as a hidden track. - Rating: 7/10";

          setLoadingStatus("AI is analyzing your music vibe...");
          const vibeResult = await callAI([
            { role: "user", content: vibePrompt },
          ]);
          if (vibeResult) {
            musicVibeResult = vibeResult;
          }

          setLoadingStatus("Saving your analysis...");
          setCachedData(musicVibeResult, songs, artists);

          setMusicVibe(musicVibeResult);
          setLoading(false);
          setSuccess(true);
          console.log("Fresh data loaded, loading set to false");

          setRegenerateDisabled(true);
          setRegenerateText("🔄 Available in 24h");
        } catch (error) {
          errHandler(error);
        }
      })();
    } else {
      setLoadingStatus("Loading your saved analysis...");
      console.log("Loading cached data...");

      const {
        vibe,
        topSongs: savedTopSongs,
        topArtists: savedTopArtists,
      } = getCachedData();
      console.log("savedVibe:", vibe);

      if (vibe && savedTopSongs && savedTopArtists) {
        setMusicVibe(vibe);
        setTopSongs(JSON.parse(savedTopSongs));
        setTopArtists(JSON.parse(savedTopArtists));
        setLoading(false);
        setSuccess(true);
        console.log("Cached data loaded, loading set to false");

        if (timeRemaining > 0) {
          setRegenerateDisabled(true);
          setRegenerateText(`🔄 Available in ${formatTime(timeRemaining)}`);

          const updateCountdown = () => {
            const currentTime = new Date().getTime();
            const remaining =
              twentyFourHours - (currentTime - parseInt(lastGenerated!));

            if (remaining <= 0) {
              setRegenerateDisabled(false);
              setRegenerateText("🔄 Regenerate Analysis");
            } else {
              setRegenerateText(`🔄 Available in ${formatTime(remaining)}`);
              setTimeout(updateCountdown, 60000);
            }
          };

          setTimeout(updateCountdown, 60000);
        }
      } else {
        console.log("No cached data found, clearing timestamp");
        clearCachedData();
        setLoading(false);
        setError(
          "Cached data is missing. Please refresh to regenerate your analysis."
        );
      }
    }
    console.log("onMount completed");
  });

  if (loading()) {
    console.log("Rendering loading state, loading():", loading());
  }

  return (
    <>
      <Show when={loading()}>
        <Window>
          <div class="loading-container">
            <h1>
              Loading<span class="loading-dots"></span>
            </h1>
            <p>{loadingStatus()}</p>
          </div>
        </Window>
      </Show>
      <Show when={error()}>
        <Window>
          <div class="error-container">
            <h1 class="error-title">An error occurred during generation.</h1>
            <p>Please try again. Please report to Krish. Debug info:</p>
            <p class="error-debug">{error()}</p>
            <button class="button" onClick={() => (location.href = "/")}>
              Restart
            </button>
          </div>
        </Window>
      </Show>
      <Show when={success()}>
        <Window>
          <h1>Your Music Vibe Analysis</h1>

          <div class="music-analysis">
            <div class="vibe-section">
              <h2>🎵 Your Vibe</h2>
              <p class="music-vibe-text">{musicVibe()}</p>
            </div>

            <div class="music-lists">
              <div class="top-songs-section">
                <h2>🔥 Top Songs (7 Days)</h2>
                <ol class="music-list">
                  {topSongs()
                    .slice(0, 5)
                    .map((song: any) => (
                      <li class="music-item">
                        <span class="track-name">{song.name}</span>
                        <span class="artist-name">
                          {Array.isArray(song.artist)
                            ? song.artist[0]["#text"]
                            : song.artist?.name || song.artist}
                        </span>
                        <span class="play-count">{song.playcount} plays</span>
                      </li>
                    ))}
                </ol>
              </div>

              <div class="top-artists-section">
                <h2>🎤 Top Artists (7 Days)</h2>
                <ol class="music-list">
                  {topArtists()
                    .slice(0, 5)
                    .map((artist: any) => (
                      <li class="music-item">
                        <span class="artist-name">{artist.name}</span>
                        <span class="play-count">{artist.playcount} plays</span>
                      </li>
                    ))}
                </ol>
              </div>
            </div>
          </div>

          <div class="button-container">
            <button
              class="button"
              onClick={handleRegenerate}
              disabled={regenerateDisabled()}
            >
              {regenerateText()}
            </button>
          </div>
        </Window>
      </Show>
    </>
  );
}
