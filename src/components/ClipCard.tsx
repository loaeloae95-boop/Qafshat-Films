import { useState, useRef, useEffect, RefObject, SyntheticEvent, MouseEvent } from "react";
import { Heart, Music, Pause, Play, Share2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { type Clip } from "@/data/clips";
import { ShareMenu } from "./ShareMenu";

interface ClipCardProps {
  clip: Clip;
  index: number;
}

let currentlyPlaying: HTMLMediaElement | null = null;

export function ClipCard({ clip, index }: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const isAudio = clip.mediaType === "audio";
  const hasImage = Boolean(clip.coverUrl);
  // تنظيف الرابط وترميز المسافات إن وجدت
  const safeMediaUrl = clip.mediaUrl ? encodeURI(clip.mediaUrl) : "";

  const stopCurrentMedia = () => {
    if (currentlyPlaying && currentlyPlaying !== mediaRef.current) {
      currentlyPlaying.pause();
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    if (currentlyPlaying === mediaRef.current) {
      currentlyPlaying = null;
    }
  };

  const handleMediaError = (e: SyntheticEvent<HTMLMediaElement>) => {
    // لا نحذف الفيديو عند الخطأ الأولي، فقط نوقف التشغيل وننبه
    setIsPlaying(false);
    if (currentlyPlaying === mediaRef.current) {
      currentlyPlaying = null;
    }
    console.error("خطأ تشغيل الميديا:", {
      title: clip.title,
      mediaUrl: safeMediaUrl,
      mediaType: clip.mediaType,
    });
  };

  const togglePlay = async (event?: MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const media = mediaRef.current;
    if (!media || !safeMediaUrl) {
      toast.error("هذا المقطع غير متاح للتشغيل حالياً");
      return;
    }

    try {
      if (isPlaying) {
        media.pause();
      } else {
        stopCurrentMedia();
        currentlyPlaying = media;
        await media.play();
      }
    } catch (err) {
      console.error("تعذر تشغيل الوسائط:", err);
      toast.error("تعذر تشغيل هذا المقطع");
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (!isPlaying && currentlyPlaying === media) {
      media.pause();
    }
  }, [isPlaying]);

  return (
    <div
      onClick={() => togglePlay()}
      className={`relative flex aspect-square w-full cursor-pointer flex-col overflow-hidden rounded-2xl p-4 shadow-card ring-1 ring-foreground/10 transition-transform active:scale-[0.98] ${
        clip.gradient || "bg-slate-800"
      }`}
    >
      {/* عرض صورة الغلاف إن وجدت */}
      {hasImage && (
        <img
          src={clip.coverUrl}
          alt={clip.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {/* مشغل الصوت */}
      {isAudio && safeMediaUrl && (
        <audio
          ref={mediaRef as RefObject<HTMLAudioElement>}
          src={safeMediaUrl}
          preload="none"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleMediaError}
        />
      )}

      {/* مشغل الفيديو */}
      {!isAudio && safeMediaUrl && (
        <video
          ref={mediaRef as RefObject<HTMLVideoElement>}
          src={safeMediaUrl}
          preload="none"
          playsInline
          loop
          className="absolute inset-0 h-full w-full object-cover"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleMediaError}
        />
      )}

      {/* طبقة تظليل للحفاظ على وضوح النصوص والأزرار */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* أيقونة الصوت إذا كان مقطعاً صوتياً */}
      {isAudio && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
          <Music className="size-20" />
        </div>
      )}

      {/* رأس البطاقة: المدة والنوع */}
      <div className="relative z-10 flex items-center justify-between gap-1 pointer-events-none">
        <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
          {isAudio ? "صوت" : "فيديو"}
        </span>
        <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-md">
          {clip.duration}
        </span>
      </div>

      {/* زر التشغيل في منتصف البطاقة */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={(e) => togglePlay(e)}
          aria-label={isPlaying ? "إيقاف المقطع" : "تشغيل المقطع"}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 ${
            isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
          }`}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-white" />
          ) : (
            <Play className="h-6 w-6 translate-x-0.5 fill-white" />
          )}
        </button>
      </div>

      {/* أسفل البطاقة: العنوان واسم الناشر والتفاعل */}
      <div className="relative z-10 mt-2 flex flex-col text-white">
        <h3 className="truncate text-sm font-bold drop-shadow-md">{clip.title}</h3>
        <p className="truncate text-[11px] text-white/80">@{clip.author}</p>
      </div>

      {/* أزرار الإعجاب والمشاركة */}
      <div
        className="relative z-10 mt-2 flex items-center justify-between gap-1 text-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="إعجاب بالمقطع"
          className="flex items-center gap-1.5 text-[11px] hover:text-white"
        >
          <Heart className="h-4 w-4" />
          <span>{clip.likes ?? "0"}</span>
        </button>

        <ShareMenu clip={clip}>
          <button
            type="button"
            aria-label="مشاركة المقطع"
            className="flex items-center gap-1.5 text-[11px] hover:text-white"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </ShareMenu>
      </div>
    </div>
  );
}
