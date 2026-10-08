import type { APIEvent } from "@solidjs/start/server";
import { apiKey, apiUrl } from "~/config";
import { lastFmApiSignature } from "~/lib/lastfm-sign";

export async function POST(event: APIEvent) {
  const sharedSecret = process.env.LASTFM_SHARED_SECRET;
  if (!sharedSecret) {
    return json({ error: "LASTFM_SHARED_SECRET is not configured" }, 500);
  }

  let body: { token?: string };
  try {
    body = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const token = body.token;
  if (!token || typeof token !== "string") {
    return json({ error: "Missing token" }, 400);
  }

  const parameters: Record<string, string> = {
    method: "auth.getSession",
    api_key: apiKey,
    token,
  };

  const getSessionUrl = new URL(apiUrl);
  for (const [key, value] of Object.entries(parameters)) {
    getSessionUrl.searchParams.append(key, value);
  }
  getSessionUrl.searchParams.append(
    "api_sig",
    lastFmApiSignature(parameters, sharedSecret)
  );

  try {
    const response = await fetch(getSessionUrl);
    const data = await response.json();
    return json(data, response.ok ? 200 : response.status);
  } catch {
    return json({ error: "Failed to reach Last.fm" }, 502);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
