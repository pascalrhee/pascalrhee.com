// Rolling 24h page-view counter.
// Static asset requests are delegated to env.ASSETS; /api/* is handled here.

import { WINDOW_HOURS, BUCKET_TTL_SECONDS } from "../lib/counter";

// Minimum count before the counter is shown publicly.
// Flip > 0 later to hide the number until it's above a threshold.
const PUBLIC_THRESHOLD = 0;

const BOT_UA_PATTERNS: RegExp[] = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /^Go-http-client/i,
  /uptimerobot/i,
  /pingdom/i,
  /headlesschrome/i,
];

function hourBucketKey(when: Date): string {
  // "views:YYYY-MM-DDTHH" using the UTC hour, which matches the ISO string prefix.
  return `views:${when.toISOString().slice(0, 13)}`;
}

function last24HourKeys(now: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < WINDOW_HOURS; i++) {
    keys.push(hourBucketKey(new Date(now.getTime() - i * 60 * 60 * 1000)));
  }
  return keys;
}

function isBotUA(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_UA_PATTERNS.some((re) => re.test(ua));
}

async function handleTrack(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (isBotUA(request.headers.get("User-Agent"))) {
    return new Response(null, { status: 204 });
  }
  const key = hourBucketKey(new Date());
  const current = await env.VIEWS_KV.get(key);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  await env.VIEWS_KV.put(key, String(next), { expirationTtl: BUCKET_TTL_SECONDS });
  return new Response(null, { status: 204 });
}

async function handleViews(env: Env): Promise<Response> {
  const keys = last24HourKeys(new Date());
  const values = await Promise.all(keys.map((k) => env.VIEWS_KV.get(k)));
  const total = values.reduce((sum, v) => sum + (v ? parseInt(v, 10) : 0), 0);
  const visible = total >= PUBLIC_THRESHOLD;
  return Response.json(
    { count: total, visible, threshold: PUBLIC_THRESHOLD },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/track") return handleTrack(request, env);
    if (url.pathname === "/api/views") return handleViews(env);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
