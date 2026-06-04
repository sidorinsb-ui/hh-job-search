/**
 * Cloudflare Worker: proxies /api/hh/* to api.hh.ru with an OAuth application token
 * (HH closed anonymous access to /vacancies — client_credentials grant is required).
 *
 * Token is cached in-memory per isolate; on cold start we fetch a fresh one.
 * HH application tokens live ~14 days; we refetch when close to expiry.
 *
 * For any path not starting with /api/hh/ we fall through to the static asset binding.
 */

export interface Env {
  HH_CLIENT_ID: string;
  HH_CLIENT_SECRET: string;
  ASSETS: Fetcher;
}

interface CachedToken {
  token: string;
  expiresAt: number; // unix ms
}

let cached: CachedToken | null = null;
let inflight: Promise<string> | null = null;

const HH_USER_AGENT = "hh-job-search/0.1 (sidorinsb@gmail.com)";
const ALLOWED_PATHS = new Set([
  "/vacancies",
  "/areas",
  "/dictionaries",
  "/professional_roles",
  "/specializations",
  "/industries"
]);

async function fetchToken(env: Env): Promise<string> {
  if (!env.HH_CLIENT_ID || !env.HH_CLIENT_SECRET) {
    throw new Error(
      "Worker secrets HH_CLIENT_ID / HH_CLIENT_SECRET not set"
    );
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
    throw new Error(`HH oauth ${res.status}: ${text.slice(0, 200)}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  const ttl = (j.expires_in && j.expires_in > 0 ? j.expires_in : 60 * 60 * 24 * 14) * 1000;
  cached = { token: j.access_token, expiresAt: Date.now() + ttl };
  return j.access_token;
}

async function getToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60_000) return cached.token;
  if (inflight) return inflight;
  inflight = fetchToken(env).finally(() => {
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
  // Whitelist: only known read-only public endpoints
  const root = "/" + subPath.split("/")[1];
  if (!ALLOWED_PATHS.has(root)) {
    return jsonError(404, `Endpoint ${subPath} not allowed via this proxy`);
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

  // If token went stale unexpectedly (e.g. revoked), force-refresh once
  if (hhRes.status === 401 || hhRes.status === 403) {
    cached = null;
    try {
      token = await getToken(env);
      const retry = await fetch(target, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "HH-User-Agent": HH_USER_AGENT,
          Accept: "application/json"
        }
      });
      return mirror(retry);
    } catch (e: any) {
      return jsonError(502, `oauth_retry_failed: ${e?.message || String(e)}`);
    }
  }

  return mirror(hhRes);
}

function mirror(hhRes: Response): Response {
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
  return new Response(JSON.stringify({ errors: [{ type: "proxy_error", message }] }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cheap health endpoint (does not hit hh.ru)
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          ok: true,
          has_client_id: Boolean(env.HH_CLIENT_ID),
          has_client_secret: Boolean(env.HH_CLIENT_SECRET),
          token_cached: Boolean(cached),
          token_expires_at: cached?.expiresAt ?? null
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname.startsWith("/api/hh/")) {
      const subPath = url.pathname.slice("/api/hh".length); // e.g. /vacancies
      return proxyHH(request, env, subPath, url.search);
    }

    // Everything else — static SPA assets
    return env.ASSETS.fetch(request);
  }
};
