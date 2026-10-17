import { createSignal, Show } from "solid-js";
import type { RangeId } from "~/lib/ranges";
import { toShareParams } from "~/lib/share";

export function ShareCard(props: { user: string; vibe: string; range: RangeId; songs: string[] }) {
  const [status, setStatus] = createSignal<string | null>(null);
  const params = () =>
    toShareParams({ user: props.user, vibe: props.vibe, range: props.range, songs: props.songs }).toString();
  const shareUrl = () => `${location.origin}/s?${params()}`;
  const imageUrl = () => `/api/card?${params()}`;

  const copyLink = async () => {
    const url = shareUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Tastebuds vibe", text: props.vibe, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus(`Couldn't copy automatically. Here's the link: ${url}`);
    }
  };

  return (
    <section class="share-card">
      <h2>📤 Share your vibe</h2>
      <img class="share-preview" src={imageUrl()} alt={`Vibe card: ${props.vibe}`} width="1200" height="630" loading="lazy" />
      <div class="button-container">
        <a class="button" href={`${imageUrl()}&download=1`} download="tastebuds-vibe.png">
          🖼️ Download image
        </a>
        <button class="button" onClick={copyLink}>
          🔗 Share link
        </button>
      </div>
      <Show when={status()}>
        <p class="share-status">{status()}</p>
      </Show>
    </section>
  );
}
