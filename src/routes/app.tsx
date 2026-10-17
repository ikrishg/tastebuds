import { Window } from "~/components/Window";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { requestVibe } from "~/lib/ai";
import { fetchAllMusicData, type LastFmArtist, type LastFmTrack } from "~/lib/api";
import { formatTime, handleAuthError, isAuthError } from "~/lib/utils";
import { DEFAULT_RANGE, isRangeId, RANGES, rangeLabel, type RangeId } from "~/lib/ranges";
import {
  clearAnalysis,
  COOLDOWN_MS,
  getCachedAnalysis,
  getHistory,
  migrateLegacyCache,
  saveAnalysis,
  type HistoryEntry,
} from "~/lib/storage";

const RANGE_KEY = "tb:range";

interface Snapshot {
  range: RangeId;
  vibe: string;
  vibeError: string | null;
  topSongs: LastFmTrack[];
  topArtists: LastFmArtist[];
  generatedAt: number | null;
}

const songArtist = (song: LastFmTrack): string =>
  typeof song.artist === "string" ? song.artist : song.artist?.name || song.artist?.["#text"] || "";

export default function App() {
  const [range, setRange] = createSignal<RangeId>(DEFAULT_RANGE);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal(false);
  const [musicVibe, setMusicVibe] = createSignal("");
  const [vibeError, setVibeError] = createSignal<string | null>(null);
  const [topSongs, setTopSongs] = createSignal<LastFmTrack[]>([]);
  const [topArtists, setTopArtists] = createSignal<LastFmArtist[]>([]);
  const [generatedAt, setGeneratedAt] = createSignal<number | null>(null);
  const [now, setNow] = createSignal(Date.now());
  const [history, setHistory] = createSignal<HistoryEntry[]>([]);
  const [notice, setNotice] = createSignal<string | null>(null);
  const [loadingStatus, setLoadingStatus] = createSignal("Initializing...");
  let requestId = 0;
  // What the user was last looking at, so a failed range switch can go back to it.
  let lastShown: Snapshot | null = null;

  const snapshot = (): Snapshot => ({
    range: range(),
    vibe: musicVibe(),
    vibeError: vibeError(),
    topSongs: topSongs(),
    topArtists: topArtists(),
    generatedAt: generatedAt(),
  });

  const display = (snap: Snapshot) => {
    setRange(snap.range);
    localStorage.setItem(RANGE_KEY, snap.range);
    setMusicVibe(snap.vibe);
    setVibeError(snap.vibeError);
    setTopSongs(snap.topSongs);
    setTopArtists(snap.topArtists);
    setGeneratedAt(snap.generatedAt);
    setError(null);
    setLoading(false);
    setSuccess(true);
    lastShown = snap;
  };

  const remaining = () => {
    const at = generatedAt();
    return at === null ? 0 : Math.max(0, COOLDOWN_MS - (now() - at));
  };
  const canRegenerate = () => vibeError() !== null || remaining() === 0;
  const regenerateText = () =>
    vibeError() !== null
      ? "🔄 Try again"
      : remaining() > 0
        ? `🔄 Available in ${formatTime(remaining())}`
        : "🔄 Regenerate Analysis";

  const fail = (err: unknown, r: RangeId) => {
    const message =
      typeof err === "string" ? err : err instanceof Error ? err.message : JSON.stringify(err) || "Unknown error";
    if (isAuthError(message)) {
      handleAuthError();
      return;
    }
    if (lastShown) {
      // Go back to what was on screen and say why the new result didn't load.
      display(lastShown);
      setNotice(`Couldn't load ${rangeLabel(r).toLowerCase()}: ${message}`);
      return;
    }
    setLoading(false);
    setError(message);
  };

  const generate = async (r: RangeId) => {
    const id = ++requestId;
    setLoading(true);
    setSuccess(false);
    setError(null);
    setNotice(null);
    try {
      setLoadingStatus(`Fetching your top music for ${rangeLabel(r).toLowerCase()}...`);
      const { musicData, topSongs: songs, topArtists: artists } = await fetchAllMusicData(r);
      if (id !== requestId) return;
      setTopSongs(songs);
      setTopArtists(artists);

      setLoadingStatus("AI is analyzing your music vibe...");
      let vibe: string;
      try {
        vibe = await requestVibe(musicData, r);
      } catch (aiError) {
        if (id !== requestId) return;
        // Keep the lists on screen and say exactly why the vibe is missing.
        // Nothing is cached, so the user can retry right away.
        display({
          range: r,
          vibe: "",
          vibeError: aiError instanceof Error ? aiError.message : String(aiError),
          topSongs: songs,
          topArtists: artists,
          generatedAt: null,
        });
        return;
      }
      if (id !== requestId) return;

      const at = Date.now();
      const saved = saveAnalysis(r, { vibe, topSongs: songs, topArtists: artists, generatedAt: at });
      display({ range: r, vibe, vibeError: null, topSongs: songs, topArtists: artists, generatedAt: at });
      setHistory(getHistory());
      if (!saved.cached || !saved.history) {
        setNotice("Your browser storage is full, so this vibe wasn't saved to history.");
      }
    } catch (err) {
      if (id === requestId) fail(err, r);
    }
  };

  const show = (r: RangeId) => {
    const cached = getCachedAnalysis(r);
    if (cached && Date.now() - cached.generatedAt < COOLDOWN_MS) {
      requestId++;
      setNotice(null);
      display({
        range: r,
        vibe: cached.vibe,
        vibeError: null,
        topSongs: cached.topSongs,
        topArtists: cached.topArtists,
        generatedAt: cached.generatedAt,
      });
      return;
    }
    void generate(r);
  };

  const selectRange = (r: RangeId) => {
    if (r === range() && !error()) return;
    if (success()) lastShown = snapshot();
    setRange(r);
    localStorage.setItem(RANGE_KEY, r);
    show(r);
  };

  const handleRegenerate = () => {
    clearAnalysis(range());
    void generate(range());
  };

  onMount(() => {
    if (!localStorage.getItem("username")) {
      location.href = "/";
      return;
    }
    const saved = localStorage.getItem(RANGE_KEY);
    const initial = isRangeId(saved) ? saved : DEFAULT_RANGE;
    setRange(initial);
    migrateLegacyCache(); // before reading history, so migrated entries show up
    setHistory(getHistory());
    show(initial);
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    onCleanup(() => clearInterval(timer));
  });

  const picker = () => (
    <div class="range-picker" role="group" aria-label="Time range">
      <For each={RANGES}>
        {(r) => (
          <button
            class="range-option"
            classList={{ active: range() === r.id }}
            aria-pressed={range() === r.id}
            onClick={() => selectRange(r.id)}
          >
            {r.label}
          </button>
        )}
      </For>
    </div>
  );

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
            <p>Retry or pick another time range:</p>
            {picker()}
            <button class="button" onClick={() => (location.href = "/")}>
              Restart
            </button>
          </div>
        </Window>
      </Show>
      <Show when={success()}>
        <Window>
          <h1>Your Music Vibe Analysis</h1>

          {picker()}
          <Show when={notice()}>
            <p class="range-notice" role="status">
              {notice()}
            </p>
          </Show>

          <div class="music-analysis">
            <div class="vibe-section">
              <h2>🎵 Your Vibe ({rangeLabel(range())})</h2>
              <Show
                when={!vibeError()}
                fallback={<p class="music-vibe-text vibe-error">Couldn't generate your vibe: {vibeError()}</p>}
              >
                <p class="music-vibe-text">{musicVibe()}</p>
              </Show>
            </div>

            <div class="music-lists">
              <div class="top-songs-section">
                <h2>🔥 Top Songs ({rangeLabel(range())})</h2>
                <ol class="music-list">
                  <For each={topSongs().slice(0, 5)}>
                    {(song) => (
                      <li class="music-item">
                        <span class="track-name">{song.name}</span>
                        <span class="artist-name">{songArtist(song)}</span>
                        <span class="play-count">{song.playcount} plays</span>
                      </li>
                    )}
                  </For>
                </ol>
              </div>

              <div class="top-artists-section">
                <h2>🎤 Top Artists ({rangeLabel(range())})</h2>
                <ol class="music-list">
                  <For each={topArtists().slice(0, 5)}>
                    {(artist) => (
                      <li class="music-item">
                        <span class="artist-name">{artist.name}</span>
                        <span class="play-count">{artist.playcount} plays</span>
                      </li>
                    )}
                  </For>
                </ol>
              </div>
            </div>
          </div>

          <div class="button-container">
            <button class="button" onClick={handleRegenerate} disabled={!canRegenerate()}>
              {regenerateText()}
            </button>
          </div>

          <Show when={history().length > 0}>
            <section class="vibe-history">
              <h2>🗓️ Vibe History</h2>
              <p class="vibe-history-note">Saved in this browser only.</p>
              <ol class="vibe-history-list">
                <For each={history()}>
                  {(h) => (
                    <li class="vibe-history-item">
                      <time datetime={new Date(h.generatedAt).toISOString()}>
                        {new Date(h.generatedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      <span class="vibe-history-range">{rangeLabel(h.range)}</span>
                      <span class="vibe-history-vibe">{h.vibe}</span>
                    </li>
                  )}
                </For>
              </ol>
            </section>
          </Show>
        </Window>
      </Show>
    </>
  );
}
