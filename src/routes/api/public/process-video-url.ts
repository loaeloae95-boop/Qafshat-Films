import { createFileRoute } from "@tanstack/react-router";

const DIRECT_RE = /\.(mp4|webm|mov|m4v|mp3|m4a|wav|ogg|aac)(\?|#|$)/i;
const PLATFORM_RE =
  /(youtube\.com|youtu\.be|facebook\.com|fb\.watch|tiktok\.com|instagram\.com|twitter\.com|x\.com|reddit\.com|vimeo\.com|soundcloud\.com|dailymotion\.com|twitch\.tv|snapchat\.com|pinterest\.)/i;

const CORS = { "Access-Control-Allow-Origin": "*" };

function isBlocked(u: URL) {
  const h = u.hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

type Extracted = { mediaUrl: string; contentType?: string; filename?: string };

async function postJson(endpoint: string, body: unknown, apiKey?: string, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(apiKey ? { authorization: `Api-Key ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: res.ok, json };
  } catch {
    return { ok: false, json: null };
  } finally {
    clearTimeout(t);
  }
}

/** Cobalt-compatible extractors (self-hosted first if configured). */
async function resolveViaCobalt(url: string): Promise<Extracted | null> {
  const apiKey = process.env["COBALT_API_KEY"];
  const custom = process.env["COBALT_API_URL"];
  // `custom` (your own self-hosted instance, if configured) is tried first.
  // The rest are best-effort community-run fallbacks — see instances.cobalt.best
  // for the current list. None of these are guaranteed to stay online; for
  // reliable production use, self-host your own instance and set
  // COBALT_API_URL (+ COBALT_API_KEY if your instance requires one).
  const endpoints = [
    custom,
    "https://cobalt-api.kwiatekmiki.com/",
    "https://api.co.rooot.gay/",
    "https://cobalt-backend.canine.tools/",
    "https://api.cobalt.tools/",
  ].filter(Boolean) as string[];

  for (const endpoint of endpoints) {
    const { json } = await postJson(
      endpoint,
      { url, downloadMode: "auto", videoQuality: "720", filenameStyle: "basic" },
      endpoint === custom ? apiKey : apiKey,
    );
    if (!json) continue;
    const status = String(json["status"] ?? "");
    if ((status === "stream" || status === "redirect" || status === "tunnel") && json["url"]) {
      const fn = json["filename"];
      return typeof fn === "string"
        ? { mediaUrl: String(json["url"]), filename: fn }
        : { mediaUrl: String(json["url"]) };
    }
    if (status === "picker" && Array.isArray(json["picker"])) {
      const first = (json["picker"] as Array<Record<string, unknown>>).find((p) => p["url"]);
      if (first) return { mediaUrl: String(first["url"]) };
    }
  }
  return null;
}

/** Last-resort: read the page HTML and pull a media URL out of it. */
async function resolveFromHtml(url: string): Promise<Extracted | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        accept: "text/html,*/*",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const ct = res.headers.get("content-type") ?? "";
    if (/^(audio|video)\//i.test(ct)) return { mediaUrl: url, contentType: ct };
    if (!res.ok || !/text\/html/i.test(ct)) return null;

    const html = await res.text();
    const patterns = [
      /<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:video:url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i,
      /<video[^>]+src=["']([^"']+)["']/i,
      /<source[^>]+src=["']([^"']+)["']/i,
    ];
    const found: string[] = [];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) found.push(m[1].replace(/&amp;/g, "&"));
    }
    const direct = found.find((f) => DIRECT_RE.test(f));
    const pick = direct ?? found[0];
    if (!pick) return null;
    return { mediaUrl: new URL(pick, url).toString() };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const Route = createFileRoute("/api/public/process-video-url")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" },
        }),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { url?: string } | null;
        const raw = body?.url?.trim();
        if (!raw) return Response.json({ error: "أدخل رابطاً" }, { status: 400, headers: CORS });

        let u: URL;
        try {
          u = new URL(raw);
        } catch {
          return Response.json({ error: "الرابط غير صالح" }, { status: 400, headers: CORS });
        }
        if (!/^https?:$/.test(u.protocol) || isBlocked(u)) {
          return Response.json({ error: "رابط غير مسموح" }, { status: 400, headers: CORS });
        }

        // Direct media file: hand it straight back.
        if (DIRECT_RE.test(u.pathname) || DIRECT_RE.test(u.href)) {
          return Response.json({ mediaUrl: u.toString() }, { headers: CORS });
        }

        if (PLATFORM_RE.test(u.hostname)) {
          const viaCobalt = await resolveViaCobalt(u.toString());
          if (viaCobalt) return Response.json(viaCobalt, { headers: CORS });
          const viaHtml = await resolveFromHtml(u.toString());
          if (viaHtml) return Response.json(viaHtml, { headers: CORS });
          return Response.json(
            {
              error:
                "تعذر استخراج المقطع من هذه المنصة حالياً — جرّب رابطاً مباشراً للملف أو رابطاً آخر",
            },
            { status: 422, headers: CORS },
          );
        }

        const viaHtml = await resolveFromHtml(u.toString());
        if (viaHtml) return Response.json(viaHtml, { headers: CORS });

        const viaCobalt = await resolveViaCobalt(u.toString());
        if (viaCobalt) return Response.json(viaCobalt, { headers: CORS });

        return Response.json(
          { error: "لم نتمكن من استخراج مقطع من هذا الرابط" },
          { status: 422, headers: CORS },
        );
      },
    },
  },
});
