import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 80 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "range, content-type",
};

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

function typeFromExt(pathname: string): string | null {
  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
  };
  return map[ext] ?? null;
}

export const Route = createFileRoute("/api/public/media-proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url");
        if (!target) {
          return Response.json({ error: "رابط مفقود" }, { status: 400, headers: CORS });
        }
        let u: URL;
        try {
          u = new URL(target);
        } catch {
          return Response.json({ error: "رابط غير صالح" }, { status: 400, headers: CORS });
        }
        if (!/^https?:$/.test(u.protocol) || isBlocked(u)) {
          return Response.json({ error: "رابط غير مسموح" }, { status: 400, headers: CORS });
        }

        const range = request.headers.get("range");
        const fetchOnce = (extraHeaders: Record<string, string>) =>
          fetch(u.toString(), {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
              accept: "*/*",
              ...(range ? { range } : {}),
              ...extraHeaders,
            },
            redirect: "follow",
          });

        let upstream: Response;
        try {
          upstream = await fetchOnce({ referer: u.origin + "/" });
          if (upstream.status >= 500) upstream = await fetchOnce({});
        } catch {
          return Response.json({ error: "تعذر الوصول إلى الملف" }, { status: 502, headers: CORS });
        }

        if (!upstream.ok && upstream.status !== 206) {
          return Response.json(
            { error: `المصدر رد بالخطأ ${upstream.status}` },
            { status: 422, headers: CORS },
          );
        }

        let contentType = upstream.headers.get("content-type") ?? "";
        if (!/^(audio|video|application\/octet-stream)/i.test(contentType)) {
          const guessed = typeFromExt(u.pathname);
          if (!guessed) {
            return Response.json(
              { error: "هذا الرابط ليس ملف وسائط" },
              { status: 415, headers: CORS },
            );
          }
          contentType = guessed;
        }

        const len = Number(upstream.headers.get("content-length") ?? "0");
        if (len && len > MAX_BYTES) {
          return Response.json({ error: "الملف كبير جداً (أكثر من 80 م.ب)" }, { status: 413, headers: CORS });
        }

        const headers = new Headers(CORS);
        headers.set("content-type", contentType);
        const cl = upstream.headers.get("content-length");
        if (cl) headers.set("content-length", cl);
        const cr = upstream.headers.get("content-range");
        if (cr) headers.set("content-range", cr);
        headers.set("accept-ranges", "bytes");
        headers.set("cache-control", "no-store");

        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
