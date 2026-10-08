import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Scissors,
  Upload,
  Play,
  Pause,
  Download,
  Share2,
  Music,
  Image as ImageIcon,
  Video,
  Link2,
  Loader2,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "قص الصوت والفيديو — قفشات أفلام" },
      {
        name: "description",
        content: "اقص المقاطع الصوتية والفيديو، أضف صورة غلاف، وشاركها كقفشات أفلام على السوشل ميديا",
      },
      { property: "og:title", content: "قص الصوت والفيديو — قفشات أفلام" },
      {
        property: "og:description",
        content: "اقص المقاطع الصوتية والفيديو، أضف صورة غلاف، وشاركها كقفشات أفلام على السوشل ميديا",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

function encodeWav(rendered: AudioBuffer): Blob {
  const channels = rendered.numberOfChannels;
  const frames = rendered.length;
  const rate = rendered.sampleRate;
  const bytesPerSample = 2;
  const dataSize = frames * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, ch) => rendered.getChannelData(ch));
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const v = Math.max(-1, Math.min(1, channelData[ch]?.[i] ?? 0));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function renderTrim(source: AudioBuffer, start: number, end: number) {
  const rate = source.sampleRate;
  const len = Math.max(1, Math.floor((end - start) * rate));
  const ctx = new OfflineAudioContext(source.numberOfChannels, len, rate);
  const node = ctx.createBufferSource();
  node.buffer = source;
  node.connect(ctx.destination);
  node.start(0, start, end - start);
  return ctx.startRendering();
}

function pickMime(candidates: string[]) {
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

async function encodeCompressedAudio(rendered: AudioBuffer) {
  const ctx = new AudioContext();
  const destination = ctx.createMediaStreamDestination();
  const source = ctx.createBufferSource();
  source.buffer = rendered;
  source.connect(destination);
  const mime = pickMime(["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]);
  if (!mime) {
    await ctx.close();
    return encodeWav(rendered);
  }
  const recorder = new MediaRecorder(destination.stream, {
    mimeType: mime,
    audioBitsPerSecond: 64_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });
  recorder.start(250);
  source.start();
  source.onended = () => recorder.stop();
  const blob = await done;
  await ctx.close();
  return blob;
}

async function shareOrDownload(blob: Blob, name: string) {
  const f = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f], title: name });
      return;
    } catch {
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast.success("تم التنزيل — شاركه من معرض الملفات");
}

/** Extracts a media URL from an internet link, then downloads it through our
 *  same-origin proxy (so the resulting File has no CORS/tainting issues and
 *  can be trimmed/exported exactly like a locally uploaded file). */
async function importFromUrl(rawUrl: string, kind: "audio" | "video"): Promise<File> {
  const resolveRes = await fetch("/api/public/process-video-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: rawUrl }),
  });
  const resolved = (await resolveRes.json().catch(() => null)) as
    | { mediaUrl?: string; filename?: string; contentType?: string; error?: string }
    | null;
  if (!resolveRes.ok || !resolved?.mediaUrl) {
    throw new Error(resolved?.error || "تعذر استخراج المقطع من هذا الرابط");
  }

  const proxyRes = await fetch(
    `/api/public/media-proxy?url=${encodeURIComponent(resolved.mediaUrl)}`,
  );
  if (!proxyRes.ok) {
    const errJson = (await proxyRes.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errJson?.error || "تعذر تحميل الملف من الرابط");
  }

  const blob = await proxyRes.blob();
  const contentType =
    proxyRes.headers.get("content-type") ||
    resolved.contentType ||
    (kind === "audio" ? "audio/mpeg" : "video/mp4");
  const ext = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("webm")
      ? "webm"
      : contentType.includes("quicktime")
        ? "mov"
        : contentType.includes("wav")
          ? "wav"
          : contentType.includes("ogg")
            ? "ogg"
            : contentType.includes("mpeg") && kind === "audio"
              ? "mp3"
              : kind === "audio"
                ? "mp3"
                : "mp4";
  const name = resolved.filename || `مقطع-من-الإنترنت.${ext}`;
  return new File([blob], name, { type: contentType });
}

function ImportFromUrl({
  kind,
  onImported,
}: {
  kind: "audio" | "video";
  onImported: (file: File) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const file = await importFromUrl(trimmed, kind);
      onImported(file);
      setUrl("");
      toast.success("تم استخراج المقطع من الرابط 🔗");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر استخراج المقطع من الرابط");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <Link2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">قص من رابط إنترنت</p>
          <p className="text-[11px] text-muted-foreground">
            يوتيوب، تيك توك، إنستغرام، إكس، فيسبوك، أو رابط ملف مباشر
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          dir="ltr"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-xs text-left placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          {loading ? "جارٍ الاستخراج" : "استخراج"}
        </button>
      </form>
    </div>
  );
}

const STORAGE_BUCKET = "videos";

/** Uploads a finished clip to Supabase Storage with a real progress bar.
 *  Note: the supabase-js `.storage.upload()` helper is fetch-based and has
 *  no upload-progress callback in browsers, so we call the same Storage
 *  REST endpoint directly via XHR (same auth headers the SDK itself uses)
 *  to get real `onprogress` events, then use the SDK just to resolve the
 *  public URL afterwards. */
async function uploadToSupabaseStorage(
  blob: Blob,
  path: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";
  const anonKey = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ?? "";
  if (!supabaseUrl || !anonKey) {
    throw new Error("إعدادات Supabase غير مكتملة");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? anonKey;
  const endpoint = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("content-type", blob.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        let msg = `فشل الرفع (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          msg = parsed.message || parsed.error || msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("تعذر الاتصال بالسحابة"));
    xhr.send(blob);
  });

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function UploadToCloudButton({
  blob,
  filename,
  title,
  durationSeconds,
}: {
  blob: Blob;
  filename: string;
  /** Shown in "مكتبتي" once saved. */
  title: string;
  durationSeconds: number;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upload = async () => {
    if (status === "uploading") return;
    setStatus("uploading");
    setProgress(0);
    setErrorMsg(null);
    try {
      const safeName = filename.replace(/[^\w.\-\u0600-\u06FF]+/g, "-");
      const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
      const url = await uploadToSupabaseStorage(blob, path, setProgress);
      setPublicUrl(url);
      setStatus("done");

      // Save it inside the app too (not just the raw file) so it shows up
      // in "مكتبتي". If this table/policy isn't set up yet, the upload
      // itself still succeeded — we just tell the user clearly.
      const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient;
      const { error: dbError } = await db.from("clips").insert({
        title,
        media_url: url,
        media_type: "video",
        duration_seconds: durationSeconds,
      });

      if (dbError) {
        toast.error("تم الرفع للسحابة، لكن تعذر حفظه بمكتبتك داخل التطبيق");
      } else {
        toast.success("تم حفظ القفشة بمكتبتك 🎉");
      }
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "تعذر رفع المقطع للسحابة";
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={upload}
        disabled={status === "uploading"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 py-2.5 text-xs font-bold text-accent transition hover:bg-accent/15 disabled:opacity-60"
      >
        {status === "uploading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "done" ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <UploadCloud className="size-4" />
        )}
        {status === "uploading"
          ? `جارٍ الحفظ... ${progress}%`
          : status === "done"
            ? "تم الحفظ بمكتبتك ✓"
            : "حفظ في مكتبتي (السحابة)"}
      </button>

      {status === "uploading" && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status === "error" && errorMsg && (
        <p className="mt-1.5 text-center text-[11px] text-red-400">{errorMsg}</p>
      )}

      {status === "done" && publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 block truncate text-center text-[11px] text-accent underline"
        >
          فتح رابط الملف بالسحابة
        </a>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-bold text-primary">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max || 1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

/* ---------------- Audio tab ---------------- */

function AudioStudio({ initialFile }: { initialFile?: File | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState<null | "audio" | "video">(null);
  const [cover, setCover] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string; kind: "audio" | "video" } | null>(
    null,
  );
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      try {
        srcRef.current?.stop();
      } catch {
        /* noop */
      }
      ctxRef.current?.close();
    };
  }, []);

  const onPick = async (f: File) => {
    try {
      ctxRef.current?.close();
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const decoded = await ctx.decodeAudioData(await f.arrayBuffer());
      setFile(f);
      setBuffer(decoded);
      setDuration(decoded.duration);
      setStart(0);
      setEnd(Math.min(decoded.duration, 30));
      setResult(null);
    } catch {
      toast.error("تعذر قراءة الملف — جرّب ملفاً صوتياً آخر");
    }
  };

  useEffect(() => {
    if (initialFile) void onPick(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);


  const togglePlay = () => {
    if (!buffer || !ctxRef.current) return;
    if (playing) {
      try {
        srcRef.current?.stop();
      } catch {
        /* noop */
      }
      setPlaying(false);
      return;
    }
    const src = ctxRef.current.createBufferSource();
    src.buffer = buffer;
    src.connect(ctxRef.current.destination);
    src.onended = () => setPlaying(false);
    src.start(0, start, Math.max(0.05, end - start));
    srcRef.current = src;
    setPlaying(true);
  };

  const setResultBlob = (blob: Blob, kind: "audio" | "video") => {
    if (result) URL.revokeObjectURL(result.url);
    setResult({ blob, url: URL.createObjectURL(blob), kind });
  };

  const exportAudio = async () => {
    if (!buffer) return;
    setExporting("audio");
    try {
      const rendered = await renderTrim(buffer, start, end);
      const compressed = await encodeCompressedAudio(rendered);
      setResultBlob(compressed, "audio");
      toast.success("تم قص وضغط الصوت بنجاح ✂️");
    } catch {
      toast.error("فشل تصدير المقطع");
    } finally {
      setExporting(null);
    }
  };

  // Audio + cover image -> shareable video (webm/mp4)
  const exportVideo = async () => {
    if (!buffer) return;
    if (!cover) {
      toast.error("أضف صورة الغلاف أولاً");
      return;
    }
    setExporting("video");
    try {
      const rendered = await renderTrim(buffer, start, end);
      const img = new Image();
      img.src = cover;
      await img.decode();

      const canvas = document.createElement("canvas");
       canvas.width = 540;
       canvas.height = 540;
       const g = canvas.getContext("2d");
       if (!g) throw new Error("canvas unavailable");

      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const node = ctx.createBufferSource();
      node.buffer = rendered;
      node.connect(dest);
      node.connect(ctx.destination);

       const stream = canvas.captureStream(24);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      const mime = pickMime([
        "video/mp4;codecs=avc1,mp4a",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ]);
       const rec = new MediaRecorder(stream, {
         ...(mime ? { mimeType: mime } : {}),
         videoBitsPerSecond: 700_000,
         audioBitsPerSecond: 64_000,
       });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
      });

      let raf = 0;
      const draw = () => {
        const t = ctx.currentTime;
        g.fillStyle = "#0b0b12";
         g.fillRect(0, 0, 540, 540);
         const ratio = Math.max(540 / img.width, 540 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
         g.drawImage(img, (540 - w) / 2, (540 - h) / 2, w, h);
        // simple animated bars at the bottom
        g.fillStyle = "rgba(255,255,255,0.85)";
        for (let i = 0; i < 32; i++) {
          const bh = 12 + Math.abs(Math.sin(t * 4 + i * 0.6)) * 70;
           g.fillRect(18 + i * 16, 518 - bh, 9, bh);
        }
        raf = requestAnimationFrame(draw);
      };
      draw();

      rec.start();
      node.start();
      node.onended = () => {
        cancelAnimationFrame(raf);
        rec.stop();
        ctx.close();
      };

      const blob = await done;
      setResultBlob(blob, "video");
      toast.success("تم إنشاء فيديو الأفهة مع الصورة 🎬");
    } catch {
      toast.error("تعذر إنشاء الفيديو على هذا المتصفح");
    } finally {
      setExporting(null);
    }
  };

  const baseName = file?.name?.replace(/\.[^.]+$/, "") || "afha";
  const ext = result?.kind === "audio"
    ? result.blob.type.includes("wav") ? "wav" : result.blob.type.includes("ogg") ? "ogg" : "webm"
    : result?.blob.type.includes("mp4") ? "mp4" : "webm";

  if (!buffer) {
    return (
      <div className="space-y-4">
        <label className="glass-panel flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-foreground/15 px-6 py-14 text-center transition hover:border-primary/40">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Upload className="size-6" />
          </span>
          <span className="text-sm font-bold">ارفع ملفاً صوتياً</span>
          <span className="text-xs text-muted-foreground">MP3 · WAV · M4A · OGG</span>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
        </label>
        <ImportFromUrl kind="audio" onImported={onPick} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-3xl p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Music className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{file?.name}</p>
            <p className="text-[11px] text-muted-foreground">المدة الكاملة {fmt(duration)}</p>
          </div>
          <label className="cursor-pointer rounded-full bg-foreground/10 px-3 py-1.5 text-[11px] font-medium">
            تغيير
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
            />
          </label>
        </div>

        <div
          className="mb-4 flex h-16 items-center gap-[3px] overflow-hidden rounded-xl bg-foreground/5 px-2"
          aria-hidden
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 20 + Math.abs(Math.sin(i * 1.7)) * 70;
            const pos = i / 48;
            const inRange = pos >= start / duration && pos <= end / duration;
            return (
              <span
                key={i}
                className={`w-1 flex-1 rounded-full transition-colors ${inRange ? "bg-primary" : "bg-foreground/20"}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>

        <div className="space-y-4">
          <Slider
            label="البداية"
            value={start}
            max={duration}
            onChange={(v) => setStart(Math.min(v, end - 0.5))}
          />
          <Slider
            label="النهاية"
            value={end}
            max={duration}
            onChange={(v) => setEnd(Math.max(v, start + 0.5))}
          />
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          طول الأفهة: <span className="font-bold text-foreground">{fmt(end - start)}</span>
        </p>
      </div>

      {/* Cover image */}
      <div className="glass-panel rounded-3xl p-4">
        <p className="mb-3 text-sm font-bold">صورة تعبّر عن الصوت</p>
        <div className="flex items-center gap-3">
          <label className="grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-foreground/15 bg-foreground/5">
            {cover ? (
              <img src={cover} alt="غلاف الأفهة" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (cover) URL.revokeObjectURL(cover);
                setCover(URL.createObjectURL(f));
              }}
            />
          </label>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
             اختر صورة للغلاف ثم صدّر المقطع كفيديو مربّع مضغوط — مناسب للنشر في ستوري
            واتساب/إنستغرام وسناب.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/10 py-3 text-sm font-bold transition hover:bg-foreground/15"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "إيقاف" : "معاينة القص"}
        </button>
        <button
          type="button"
          onClick={exportAudio}
          disabled={exporting !== null}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Scissors className="size-4" />
          {exporting === "audio" ? "جارٍ الضغط..." : "قص وضغط الصوت"}
        </button>
      </div>

      <button
        type="button"
        onClick={exportVideo}
        disabled={exporting !== null}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        <Video className="size-4" />
        {exporting === "video" ? "جارٍ التصدير (بالوقت الحقيقي)..." : "تصدير فيديو بالصوت + الصورة"}
      </button>

      {result && (
        <div className="glass-panel rounded-3xl p-4">
           <div className="mb-3 flex items-center justify-between gap-2">
             <p className="text-sm font-bold">🎉 قفشتك جاهزة</p>
             <span className="rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary">
               {formatSize(result.blob.size)}
             </span>
           </div>
           {result.kind === "audio" ? (
            <audio controls src={result.url} className="mb-3 w-full" />
          ) : (
            <video controls src={result.url} className="mb-3 w-full rounded-2xl" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={result.url}
              download={`${baseName}.${ext}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/10 py-2.5 text-xs font-bold"
            >
              <Download className="size-4" />
              تنزيل
            </a>
            <button
              type="button"
              onClick={() => shareOrDownload(result.blob, `${baseName}.${ext}`)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
            >
              <Share2 className="size-4" />
              إرسال للسوشل ميديا
            </button>
          </div>
          {result.kind === "video" && (
            <UploadToCloudButton
              blob={result.blob}
              filename={`${baseName}.${ext}`}
              title={baseName}
              durationSeconds={Math.max(0, end - start)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Video tab ---------------- */

function VideoStudio({ initialFile }: { initialFile?: File | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; url: string; kind: "video" } | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const onPick = (f: File) => {
    if (src) URL.revokeObjectURL(src);
    setFile(f);
    setSrc(URL.createObjectURL(f));
    setResult(null);
  };

  useEffect(() => {
    if (initialFile) onPick(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);


  const preview = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
    v.play();
    const stop = () => {
      if (v.currentTime >= end) {
        v.pause();
        v.removeEventListener("timeupdate", stop);
      }
    };
    v.addEventListener("timeupdate", stop);
  };

  const exportClip = async () => {
    const v = videoRef.current;
    if (!v) return;
    setExporting(true);
    setProgress(0);
    try {
      const stream = (v as HTMLVideoElement & { captureStream?: () => MediaStream })
        .captureStream?.();
      if (!stream) throw new Error("no captureStream");
      const mime = pickMime([
        "video/mp4;codecs=avc1,mp4a",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ]);
       const rec = new MediaRecorder(stream, {
         ...(mime ? { mimeType: mime } : {}),
         videoBitsPerSecond: 800_000,
         audioBitsPerSecond: 64_000,
       });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: mime || "video/webm" }));
      });

      v.muted = false;
      v.currentTime = start;
      await new Promise<void>((r) => {
        const h = () => {
          v.removeEventListener("seeked", h);
          r();
        };
        v.addEventListener("seeked", h);
      });
      rec.start();
      await v.play();
      await new Promise<void>((resolve) => {
        const tick = () => {
          setProgress(Math.min(100, ((v.currentTime - start) / (end - start)) * 100));
          if (v.currentTime >= end || v.ended) {
            v.removeEventListener("timeupdate", tick);
            v.pause();
            resolve();
          }
        };
        v.addEventListener("timeupdate", tick);
      });
      rec.stop();
      const blob = await done;
      if (result) URL.revokeObjectURL(result.url);
      setResult({ blob, url: URL.createObjectURL(blob), kind: "video" });
      toast.success("تم قص الفيديو 🎬");
    } catch {
      toast.error("قص الفيديو غير مدعوم في هذا المتصفح — جرّب كروم على الجوال");
    } finally {
      setExporting(false);
    }
  };

  const baseName = file?.name?.replace(/\.[^.]+$/, "") || "afha";
  const ext = result?.blob.type.includes("mp4") ? "mp4" : "webm";

  if (!src) {
    return (
      <div className="space-y-4">
        <label className="glass-panel flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-foreground/15 px-6 py-14 text-center transition hover:border-primary/40">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent/20 text-accent">
            <Video className="size-6" />
          </span>
          <span className="text-sm font-bold">ارفع مقطع فيديو</span>
          <span className="text-xs text-muted-foreground">MP4 · MOV · WEBM</span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
        </label>
        <ImportFromUrl kind="video" onImported={onPick} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-3xl p-4">
        <video
          ref={videoRef}
          src={src}
          playsInline
          controls
          className="mb-3 w-full rounded-2xl bg-black"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            setDuration(d);
            setStart(0);
            setEnd(Math.min(d, 30));
          }}
        />
        <div className="mb-3 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold">{file?.name}</p>
          <label className="cursor-pointer rounded-full bg-foreground/10 px-3 py-1.5 text-[11px] font-medium">
            تغيير
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
            />
          </label>
        </div>

        <div className="space-y-4">
          <Slider
            label="البداية"
            value={start}
            max={duration}
            onChange={(v) => setStart(Math.min(v, end - 0.5))}
          />
          <Slider
            label="النهاية"
            value={end}
            max={duration}
            onChange={(v) => setEnd(Math.max(v, start + 0.5))}
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          طول المقطع: <span className="font-bold text-foreground">{fmt(end - start)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={preview}
          className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/10 py-3 text-sm font-bold"
        >
          <Play className="size-4" />
          معاينة القص
        </button>
        <button
          type="button"
          onClick={exportClip}
          disabled={exporting}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Scissors className="size-4" />
          {exporting ? `${Math.round(progress)}%` : "قص الفيديو"}
        </button>
      </div>
      {exporting && (
        <p className="text-center text-[11px] text-muted-foreground">
          القص يتم بالوقت الحقيقي — اترك الصفحة مفتوحة حتى ينتهي
        </p>
      )}

      {result && (
        <div className="glass-panel rounded-3xl p-4">
           <div className="mb-3 flex items-center justify-between gap-2">
             <p className="text-sm font-bold">🎉 مقطعك جاهز</p>
             <span className="rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary">
               {formatSize(result.blob.size)}
             </span>
           </div>
          <video controls src={result.url} className="mb-3 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <a
              href={result.url}
              download={`${baseName}-clip.${ext}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/10 py-2.5 text-xs font-bold"
            >
              <Download className="size-4" />
              تنزيل
            </a>
            <button
              type="button"
              onClick={() => shareOrDownload(result.blob, `${baseName}-clip.${ext}`)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
            >
              <Share2 className="size-4" />
              إرسال للسوشل ميديا
            </button>
          </div>
          {result.kind === "video" && (
            <UploadToCloudButton
              blob={result.blob}
              filename={`${baseName}-clip.${ext}`}
              title={baseName}
              durationSeconds={Math.max(0, end - start)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

function StudioPage() {
  const [tab, setTab] = useState<"audio" | "video">("audio");

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Scissors className="size-4" />
        </span>
        <div className="flex-1">
          <h1 className="text-lg font-black">استوديو القص</h1>
          <p className="text-xs text-muted-foreground">اقص صوتاً أو فيديو من جهازك</p>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-foreground/5 p-1">
        {(
          [
            { id: "audio", label: "صوت + صورة", icon: Music },
            { id: "video", label: "فيديو", icon: Video },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition ${
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "audio" && <AudioStudio initialFile={null} />}
      {tab === "video" && <VideoStudio initialFile={null} />}
    </AppShell>
  );
}


