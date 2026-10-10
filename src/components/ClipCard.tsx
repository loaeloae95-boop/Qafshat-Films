import { Heart, Play, Pause, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Clip } from "@/data/clips";
import { shareClip } from "@/components/ShareMenu";

// لإيقاف أي مقطع آخر يعمل عند تشغيل مقطع جديد
let currentlyPlaying: HTMLVideoElement | null = null;

export function ClipCard({ clip }: { clip: Clip }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => mediaRef.current?.pause();
  }, []);

  const togglePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = mediaRef.current;

    if (!clip.mediaUrl || !el) {
      toast.error("هذه قفشة تجريبية وليس لها ملف");
      return;
    }
    if (!el.paused) {
      el.pause();
      return;
    }
    if (currentlyPlaying && currentlyPlaying !== el) currentlyPlaying.pause();
    try {
      await el.play();
      currentlyPlaying = el;
    } catch (err) {
      console.error("play() failed:", err, el.error);
      toast.error("تعذر تشغيل المقطع");
    }
  };

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl p-4 shadow-card ring-1 ring-foreground/10 transition-transform active:scale-[0.98]",
        clip.gradient,
      )}
    >
      <div className="z-10 flex items-center justify-between gap-1">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-[10px]">
          {clip.badge ?? (clip.mediaType === "audio" ? "صوت" : "فيديو")}
        </span>
        <span className="text-[10px] font-medium text-white/80">{clip.duration}</span>
      </div>

      <div className="z-10 flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-white" />
          ) : (
            <Play className="h-6 w-6 translate-x-[2px] fill-white" />
          )}
        </button>
      </div>

      {clip.mediaUrl && (
        <video
          ref={mediaRef}
          src={clip.mediaUrl}
          preload="metadata"
          playsInline
          className="hidden"
          // الأيقونة تتبع الحالة الفعلية للمشغّل وليس النقرة
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("media error:", e.currentTarget.error, clip.mediaUrl);
            setIsPlaying(false);
            toast.error("الملف غير قابل للتشغيل — تحقق من الرابط");
          }}
        />
      )}

      <div className="z-10 mt-4 text-center text-white">
        <h3 className="truncate text-sm font-bold">{clip.title}</h3>
        <p className="truncate text-[11px] text-white/70">{clip.author}</p>
      </div>

      <div className="z-10 mt-3 flex items-center justify-center gap-6 text-white/90">
        <button type="button" className="flex items-center gap-1.5 transition hover:scale-110">
          <Heart className="h-4 w-4" />
          <span className="text-xs">{clip.likes}</span>
        </button>
        <button
          type="button"
          onClick={() => shareClip(clip)}
          className="flex items-center gap-1.5 transition hover:scale-110"
        >
          <Share2 className="h-4 w-4" />
          <span className="text-xs">{clip.plays}</span>
        </button>
      </div>
    </div>
  );
}
