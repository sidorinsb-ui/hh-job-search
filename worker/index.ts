/**
 * Cloudflare Worker proxy for HH.ru with OAuth client_credentials.
 * Everything wrapped in top-level try/catch so errors are visible in responses
 * instead of CF's generic empty-body 502s.
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
const TOKEN_CACHE_KEY = "https://hh-job-search.sidorinsb.workers.dev/__internal/oauth-token";
const ALLOWED_ROOTS = new Set([
  "vacancies",
  "areas",
  "dictionaries",
  "professional_roles",
  "specializations",
  "industries"
]);

async function readCachedToken(): Promise<CachedToken | null> {
  try {
    if (mem && mem.expiresAt > Date.now() + 60_000) return mem;
    const cache = (caches as any).default as Cache | undefined;
    if (!cache) return null;
    const cached = await cache.match(TOKEN_CACHE_KEY);
    if (!cached) return null;
    const token = await cached.text();
    const exp = cached.headers.get("X-Expires-At");
    const expiresAt = exp ? Number(exp) : 0;
    if (!token || !expiresAt || expiresAt <= Date.now() + 60_000) return null;
    mem = { token, expiresAt };
    return mem;
  } catch {
    return null;
  }
}

async function writeCachedToken(token: string, ttlSeconds: number): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  mem = { token, expiresAt };
  try {
    const cache = (caches as any).default as Cache | undefined;
    if (cache) {
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
  } catch {
    // best-effort; the in-memory mirror still wins for this isolate
  }
}

async function fetchFreshToken(env: Env): Promise<string> {
  if (!env.HH_CLIENT_ID || !env.HH_CLIENT_SECRET) {
    throw new Error("missing_client_credentials");
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
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`hh_oauth_${res.status}: ${text.slice(0, 300)}`);
  }
  let j: { access_token?: string; expires_in?: number };
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`hh_oauth_bad_json: ${text.slice(0, 200)}`);
  }
  if (!j.access_token) throw new Error("hh_oauth_no_access_token");
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
    return jsonError(404, `not_whitelisted: /api/hh${subPath}`);
  }

  let token: string;
  try {
    token = await getToken(env);
  } catch (e: any) {
    return jsonError(502, `oauth_failed: ${e?.message || String(e)}`);
  }

  const target = `https://api.hh.ru${subPath}${search}`;
  let hhRes: Response;
  try {
    hhRes = await fetch(target, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "HH-User-Agent": HH_USER_AGENT,
        Accept: "application/json"
      }
    });
  } catch (e: any) {
    return jsonError(502, `hh_fetch_failed: ${e?.message || String(e)}`);
  }

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
    try {
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
    } catch (e: any) {
      return jsonError(500, `worker_uncaught: ${e?.message || String(e)} | stack: ${(e?.stack || "").slice(0, 400)}`);
    }
  }
};
