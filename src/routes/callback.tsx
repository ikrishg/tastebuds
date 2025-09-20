import { Window } from "~/components/Window";
import { createSignal, onMount, Show } from "solid-js";
import { apiKey, apiUrl, sharedSecret } from "~/config";
import md5 from "md5";

export default function Callback() {
  const [loading, setLoading] = createSignal(true);
  const [userName, setUserName] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [debugInfo, setDebugInfo] = createSignal<any>(null);
  const [needsReauth, setNeedsReauth] = createSignal(false);

  const isReauthError = (errorCode: number): boolean => {
    return [4, 9, 14, 15].includes(errorCode);
  };

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const token = urlParams.get("token");

    if (!token) {
      location.href = "/";
      return;
    }

    const getSessionUrl = new URL(apiUrl);

    const parameters = {
      method: "auth.getSession",
      api_key: apiKey,
      token: token,
    };

    const signature =
      Object.entries(parameters)
        .sort((a, b) => {
          return a[0].localeCompare(b[0]);
        })
        .flat()
        .join("") + sharedSecret;

    Object.entries(parameters).forEach(([key, value]) => {
      getSessionUrl.searchParams.append(key, value);
    });

    getSessionUrl.searchParams.append("api_sig", md5(signature));

    fetch(getSessionUrl)
      .then(async (response) => {
        const data = await response.json();

        if (data.error) {
          const errorCode = data.error;

          setLoading(false);

          if (isReauthError(errorCode)) {
            setError("Authentication expired. Please login again.");
            setNeedsReauth(true);
            localStorage.removeItem("sessionKey");
            setTimeout(() => {
              location.href = "/";
            }, 3000);
          } else {
            setError("Developer Error - Please check the debug info below:");
            setDebugInfo({
              errorCode,
              errorMessage: data.message || "No error message provided",
              fullResponse: data,
              requestUrl: getSessionUrl.toString(),
              timestamp: new Date().toISOString(),
            });
          }
          return;
        }

        if (data.session && data.session.key) {
          setLoading(false);

          localStorage.setItem("sessionKey", data.session.key);

          if (data.session.name) {
            localStorage.setItem("username", data.session.name);
            setUserName(data.session.name);
          }

          location.href = "/app";
        } else {
          setError("Unexpected response format from Last.fm");
          setDebugInfo({
            fullResponse: data,
            timestamp: new Date().toISOString(),
          });
          setLoading(false);
        }
      })
      .catch((fetchError) => {
        setError("Network error - Please check your connection and try again");
        setDebugInfo({
          error: fetchError.message,
          timestamp: new Date().toISOString(),
        });
        setLoading(false);
      });
  });

  return (
    <>
      <Show when={loading()}>
        <Window>
          <div class="loading-container">
            <h1>
              Loading<span class="loading-dots"></span>
            </h1>
          </div>
        </Window>
      </Show>

      <Show when={error()}>
        <Window>
          <div class="error-container">
            <h1 class="error-title">
              {needsReauth() ? "Authentication Required" : "Error"}
            </h1>
            <p>{error()}</p>

            <Show when={needsReauth()}>
              <p class="redirect-notice">
                Redirecting to login in a few seconds...
              </p>
            </Show>

            <Show when={debugInfo()}>
              <div class="debug-info">
                <h3>Debug Information:</h3>
                <pre>{JSON.stringify(debugInfo(), null, 2)}</pre>
              </div>
            </Show>
          </div>
        </Window>
      </Show>

      <Show when={!loading() && !error()}>
        <Window>
          <div class="success-container">
            <h1>✅ Welcome {userName() || ""}!</h1>
            <p>Welcome back!</p>
            <p class="redirect-notice">Redirecting to your dashboard...</p>
          </div>
        </Window>
      </Show>
    </>
  );
}
