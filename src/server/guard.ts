// Server-only guard for the AI routes, which spend the shared HACKCLUB_AI_API_KEY quota.
//
// 1. Same-origin check: browsers always send Origin on cross-site POSTs. The Origin must be the
//    host this request was sent to (so every production, preview and local URL of this exact
//    deployment works and nothing else does) or the production domain. The body must also be
//    sent as application/json, which forces a CORS preflight that other sites can't pass.
//    Scripts can fake Origin, hence step 2.
// 2. Per-IP fixed-window limit kept in memory. On Vercel each warm instance has its own memory,
//    so this is best effort. A shared store (for example Vercel KV) would make it exact, but
//    that is a new resource and is left for Krish to decide on.

const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = Number(process.env.AI_RATE_LIMIT_PER_IP) || 12;
const GLOBAL = Number(process.env.AI_RATE_LIMIT_GLOBAL) || 300;
const MAX_TRACKED = 5000;

const hits = new Map<string, { count: number; start: number }>();
let global = { count: 0, start: Date.now() };

const PRODUCTION_HOST = "tastebuds.krishg.com";

function requestHost(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const raw = forwarded || req.headers.get("host") || new URL(req.url).host;
  return raw.replace(/:\d+$/, "").toLowerCase();
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Returns a Response to send back when the request should be refused, otherwise null. */
export function guardAIRequest(req: Request): Response | null {
  const type = req.headers.get("content-type") || "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return refuse(415, "Send the request body as application/json.");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).hostname.toLowerCase();
    } catch {
      host = "";
    }
    if (host !== requestHost(req) && host !== PRODUCTION_HOST) {
      return refuse(403, "Requests must come from the Tastebuds site.");
    }
  }

  const now = Date.now();
  if (now - global.start > WINDOW_MS) global = { count: 0, start: now };
  if (global.count >= GLOBAL) return refuse(429, "Tastebuds is very busy right now. Try again in a few minutes.");

  const ip = clientIp(req);
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size >= MAX_TRACKED) {
      for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
      if (hits.size >= MAX_TRACKED) hits.clear();
    }
    hits.set(ip, { count: 1, start: now });
  } else if (entry.count >= PER_IP) {
    const wait = Math.ceil((WINDOW_MS - (now - entry.start)) / 60000);
    return refuse(429, `Too many requests. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
  } else {
    entry.count++;
  }
  global.count++;
  return null;
}

function refuse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
