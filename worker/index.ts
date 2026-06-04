/**
 * Cloudflare Worker: proxies /api/hh/* to api.hh.ru with an OAuth application token
 * (HH closed anonymous access to /vacancies — client_credentials grant is required).
 *
 * Token lifecycle:
 *   - Stored as a cached Response in `caches.default` keyed by a synthetic URL.
 *   - TTL = expires_in - 1h (default 14 days). Cache is per-data-center; all
 *     isolates in the same DC share it.
 *   - Per-isolate in-memory mirror to avoid hitting the Cache API on hot path.
 *
 * Why this matters: HH rate-limits POST /oauth/token aggressively ("app token
 * refresh too early"). Without cross-isolate caching, every cold isolate would
 * try to fetch its own token and get rejected.
 */

export interface Env {
  HH_CLIENT_ID: string;
  HH_CLIENT_SECRET: string;
  ASSETS: Fetcher;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let mem: CachedToken | null = null;
let inflight: Promise<string> | null = null;

const HH_USER_AGENT = "hh-job-search/0.1 (sidorinsb@gmail.com)";
const TOKEN_CACHE_KEY = "https://hh-job-search.internal/oauth-token";
const ALLOWED_ROOTS = new Set([
  "vacancies",
  "areas",
  "dictionaries",
  "professional_roles",
  "specializations",
  "industries"
]);

async function readCachedToken(): Promise<CachedToken | null> {
  if (mem && mem.expiresAt > Date.now() + 60_000) return mem;
  const cache = (caches as any).default as Cache;
  const cached = await cache.match(TOKEN_CACHE_KEY);
  if (!cached) return null;
  const token = await cached.text();
  // Use the cached Response's Expires header to determine remaining TTL
  const exp = cached.headers.get("X-Expires-At");
  const expiresAt = exp ? Number(exp) : 0;
  if (!token || !expiresAt || expiresAt <= Date.now() + 60_000) return null;
  mem = { token, expiresAt };
  return mem;
}

async function writeCachedToken(token: string, ttlSeconds: number): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  mem = { token, expiresAt };
  const cache = (caches as any).default as Cache;
  await cache.put(
    TOKEN_CACHE_KEY,
    new Response(token, {
      headers: {
        "Cache-Control": `public, max-age=${ttlSeconds}`,
        "X-Expires-At": String(expiresAt),
        "Content-Type": "text/plain"
      }
    })
  );
}

async function fetchFreshToken(env: Env): Promise<string> {
  if (!env.HH_CLIENT_ID || !env.HH_CLIENT_SECRET) {
    throw new Error("Worker secrets HH_CLIENT_ID / HH_CLIENT_SECRET not set");
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.HH_CLIENT_ID,
    client_secret: env.HH_CLIENT_SECRET
  });
  const res = await fetch("https://hh.ru/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": HH_USER_AGENT
    },
    body: body.toString()
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HH oauth ${res.status}: ${text.slice(0, 300)}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  // Shave 1h off declared TTL for safety; default to 13 days if HH didn't say
  const declared = j.expires_in && j.expires_in > 0 ? j.expires_in : 14 * 24 * 3600;
  const safeTtl = Math.max(60, declared - 3600);
  await writeCachedToken(j.access_token, safeTtl);
  return j.access_token;
}

async function getToken(env: Env): Promise<string> {
  const c = await readCachedToken();
  if (c) return c.token;
  if (inflight) return inflight;
  inflight = fetchFreshToken(env).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function proxyHH(
  request: Request,
  env: Env,
  subPath: string,
  search: string
): Promise<Response> {
  const parts = subPath.split("/").filter(Boolean);
  if (!parts.length || !ALLOWED_ROOTS.has(parts[0])) {
    return jsonError(
      404,
      `Endpoint /api/hh${subPath} is not whitelisted in the proxy.`
    );
  }

  const target = `https://api.hh.ru${subPath}${search}`;
  let token: string;
  try {
    token = await getToken(env);
  } catch (e: any) {
    return jsonError(502, `oauth_failed: ${e?.message || String(e)}`);
  }

  const hhRes = await fetch(target, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "HH-User-Agent": HH_USER_AGENT,
      Accept: "application/json"
    }
  });

  // Mirror response, including hh.ru error bodies — we don't auto-refresh on
  // 401/403 here because that's the path that previously caused refresh storms.
  // A real expired token will only get refreshed after the cache TTL elapses.
  return new Response(hhRes.body, {
    status: hhRes.status,
    headers: {
      "Content-Type":
        hhRes.headers.get("Content-Type") || "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "X-Proxied-By": "hh-job-search-worker"
    }
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ errors: [{ type: "proxy_error", message }] }),
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const c = await readCachedToken();
      return new Response(
        JSON.stringify({
          ok: true,
          has_client_id: Boolean(env.HH_CLIENT_ID),
          has_client_secret: Boolean(env.HH_CLIENT_SECRET),
          token_cached: Boolean(c),
          token_expires_at: c?.expiresAt ?? null,
          ttl_seconds_left: c ? Math.round((c.expiresAt - Date.now()) / 1000) : null
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname.startsWith("/api/hh/")) {
      return proxyHH(
        request,
        env,
        url.pathname.slice("/api/hh".length),
        url.search
      );
    }

    return env.ASSETS.fetch(request);
  }
};
