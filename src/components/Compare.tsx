import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import {
  compareTastes,
  fetchTaste,
  isValidUsername,
  requestCompatibilityLine,
  type Compatibility,
} from "~/lib/compare";
import { rangeLabel, type RangeId } from "~/lib/ranges";

interface Result extends Compatibility {
  friend: string;
  range: RangeId;
  line: string | null;
  lineError: string | null;
}

export function Compare(props: { range: RangeId }) {
  const [friend, setFriend] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<Result | null>(null);
  let requestId = 0;

  // Leaving the page invalidates pending work, so an abandoned comparison never reaches the AI.
  onCleanup(() => requestId++);

  // A comparison belongs to one range: clear it and drop any pending request when the range changes.
  createEffect(
    on(
      () => props.range,
      () => {
        requestId++;
        setResult(null);
        setError(null);
        setBusy(false);
      },
      { defer: true },
    ),
  );

  const submit = async (e: Event) => {
    e.preventDefault();
    const name = friend().trim();
    const me = localStorage.getItem("username") || "";
    setError(null);
    if (!isValidUsername(name)) {
      setError("That doesn't look like a Last.fm username.");
      return;
    }
    if (name.toLowerCase() === me.toLowerCase()) {
      setError("That's you. Try a friend's username.");
      return;
    }

    const range = props.range;
    const id = ++requestId;
    const current = () => id === requestId;
    setBusy(true);
    setResult(null);
    try {
      let theirs;
      try {
        theirs = await fetchTaste(name, range);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(/not found/i.test(msg) ? `No Last.fm user called "${name}".` : msg);
      }
      if (theirs.artists.length === 0) {
        throw new Error(`${name} has no scrobbles for ${rangeLabel(range).toLowerCase()}.`);
      }
      const mine = await fetchTaste(me, range);
      if (mine.artists.length === 0) {
        throw new Error(`You have no scrobbles for ${rangeLabel(range).toLowerCase()}.`);
      }
      if (!current()) return;
      const compat = compareTastes(mine, theirs);
      const base: Result = { ...compat, friend: name, range, line: null, lineError: null };
      setResult(base);

      try {
        const line = await requestCompatibilityLine({
          me,
          friend: name,
          range,
          score: compat.score,
          sharedArtists: compat.sharedArtists.slice(0, 10),
          sharedTracks: compat.sharedTracks.slice(0, 10),
          myTopArtists: mine.artists.slice(0, 10),
          friendTopArtists: theirs.artists.slice(0, 10),
        });
        if (current()) setResult({ ...base, line });
      } catch (err) {
        if (current()) setResult({ ...base, lineError: err instanceof Error ? err.message : String(err) });
      }
    } catch (err) {
      if (current()) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (current()) setBusy(false);
    }
  };

  return (
    <section class="compare">
      <h2>🤝 Compare with a friend</h2>
      <form class="compare-form" onSubmit={submit}>
        <label for="friend-username">Friend's Last.fm username</label>
        <input
          id="friend-username"
          class="compare-input"
          type="text"
          autocomplete="off"
          spellcheck={false}
          maxlength={15}
          value={friend()}
          onInput={(e) => setFriend(e.currentTarget.value)}
          placeholder="username"
          disabled={busy()}
        />
        <button class="button" type="submit" disabled={busy() || !friend().trim()}>
          {busy() ? "Comparing..." : "Compare"}
        </button>
      </form>
      <div role="alert">
        <Show when={error()}>
          <p class="compare-error">{error()}</p>
        </Show>
      </div>
      <div role="status" aria-live="polite">
        <Show when={busy() && !result()}>
          <p class="compare-line">Comparing your tastes...</p>
        </Show>
        <Show when={result()}>
          {(r) => (
            <div class="compare-result">
              <p class="compare-score">
                You and {r().friend}: <strong>{r().score}/100</strong> ({rangeLabel(r().range)})
              </p>
              <Show when={r().line}>
                <p class="compare-line">{r().line}</p>
              </Show>
              <Show when={r().lineError}>
                <p class="compare-error">Couldn't write your compatibility line: {r().lineError}</p>
              </Show>
              <Show when={!r().line && !r().lineError}>
                <p class="compare-line">Writing your compatibility line...</p>
              </Show>
              <Show when={r().sharedArtists.length > 0} fallback={<p>No shared top artists. Opposites attract?</p>}>
                <p>Shared artists:</p>
                <ul class="compare-shared">
                  <For each={r().sharedArtists.slice(0, 5)}>{(a) => <li>{a}</li>}</For>
                </ul>
              </Show>
            </div>
          )}
        </Show>
      </div>
    </section>
  );
}
