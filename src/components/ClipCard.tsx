import { Heart, Music, Pause, Play, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { Clip } from "@/data/clips";
import { shareClip } from "@/components/ShareMenu";

let currentlyPlaying: HTMLMediaElement | null = null;

export function ClipCard({ clip }: { clip: Clip }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const isAudio = clip.mediaType === "audio";
  const hasMedia = Boolean(clip.mediaUrl) && !mediaFailed;
  const hasImage = Boolean(clip.coverUrl) || hasMedia;

  useEffect(() => {
    return () => {
      mediaRef.current?.pause();

      if (currentlyPlaying === mediaRef.current) {
        currentlyPlaying = null;
      }
    };
  }, []);

  const handleMediaError = () => {
    setMediaFailed(true);
    setIsPlaying(false);

    if (currentlyPlaying === mediaRef.current) {
      currentlyPlaying = null;
    }

    console.error("فشل تحميل الوسائط:", {
      title: clip.title,
      mediaUrl: clip.mediaUrl,
      mediaType: clip.mediaType,
    });

    toast.error("تعذر تشغيل هذا الملف");
  };

  const togglePlay = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const media = mediaRef.current;

    if (!clip.mediaUrl || !media || mediaFailed) {
      toast.error("هذا المقطع غير متاح للتشغيل");
      return;
    }

    if (!media.paused) {
      media.pause();
      return;
    }

    if (currentlyPlaying && currentlyPlaying !== media) {
      currentlyPlaying.pause();
    }

    try {
      await media.play();
      currentlyPlaying = media;
    } catch (error) {
      console.error("play() failed:", error);
      toast.error("تعذر تشغيل المقطع");
    }
  };

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl p-4 shadow-card ring-1 ring-foreground/10",
        clip.gradient,
      )}
    >
      {clip.coverUrl && (
        <img
          src={clip.coverUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      {hasMedia &&
        (isAudio ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={clip.mediaUrl}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              currentlyPlaying = null;
            }}
            onError={handleMediaError}
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={clip.mediaUrl}
            preload="metadata"
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;

              if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.error("الفيديو لا يحتوي على صورة:", {
                  src: clip.mediaUrl,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                });
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              currentlyPlaying = null;
            }}
            onError={handleMediaError}
          />
        ))}

      {hasImage && (
        <div className="absolute inset-0 bg-black/25" />
      )}

      {!hasImage && (
        <Music className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-white/15" />
      )}

      <div className="relative z-10 flex items-center justify-between gap-1">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-[10px]">
          {clip.badge ?? (isAudio ? "صوت" : "فيديو")}
        </span>

        <span className="text-[10px] font-medium text-white/80">
          {clip.duration}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "إيقاف المقطع" : "تشغيل المقطع"}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition active:scale-95",
            isPlaying && "opacity-50",
          )}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-white" />
          ) : (
            <Play className="h-6 w-6 translate-x-[2px] fill-white" />
          )}
        </button>
      </div>

      <div className="relative z-10 mt-2 text-center text-white">
        <h3 className="truncate text-sm font-bold">{clip.title}</h3>
        <p className="truncate text-[11px] text-white/70">{clip.author}</p>
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-center gap-6 text-white/90">
        <button
          type="button"
          className="flex items-center gap-1.5"
          aria-label="الإعجاب بالمقطع"
        >
          <Heart className="h-4 w-4" />
          <span className="text-xs">{clip.likes}</span>
        </button>

        <button
          type="button"
          onClick={() => shareClip(clip)}
          aria-label="مشاركة المقطع"
          className="flex items-center gap-1.5"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
