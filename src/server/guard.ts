// Server-only guard for the AI routes, which spend the shared HACKCLUB_AI_API_KEY quota.
//
// 1. Same-origin check: browsers always send Origin on cross-site POSTs, so this blocks other
//    sites from using the endpoint from their pages. Scripts can fake Origin, hence step 2.
// 2. Per-IP fixed-window limit kept in memory. On Vercel each warm instance has its own memory,
//    so this is best effort. A shared store (for example Vercel KV) would make it exact, but
//    that is a new resource and is left for Krish to decide on.

const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = Number(process.env.AI_RATE_LIMIT_PER_IP) || 12;
const GLOBAL = Number(process.env.AI_RATE_LIMIT_GLOBAL) || 300;
const MAX_TRACKED = 5000;

const hits = new Map<string, { count: number; start: number }>();
let global = { count: 0, start: Date.now() };

const allowedHost = (host: string): boolean =>
  host === "tastebuds.krishg.com" ||
  host.endsWith(".vercel.app") ||
  host === "localhost" ||
  host === "127.0.0.1";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Returns a Response to send back when the request should be refused, otherwise null. */
export function guardAIRequest(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).hostname;
    } catch {
      host = "";
    }
    if (!allowedHost(host)) return refuse(403, "Requests must come from the Tastebuds site.");
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
