import { useState, useRef, useEffect, RefObject, SyntheticEvent, MouseEvent } from "react";
import { Heart, Music, Pause, Play, Share2 } from "lucide-react";
import { toast } from "sonner";
import { type Clip } from "@/data/clips";
import { shareClip } from "./ShareMenu";

// تم إضافة دالة onOpenReels استقبالاً من الصفحة الرئيسية لتفعيل شاشة الريلز
interface ClipCardProps {
  clip: Clip;
  index: number;
  onOpenReels?: (index: number) => void;
}

let currentlyPlaying: HTMLMediaElement | null = null;

export function ClipCard({ clip, index, onOpenReels }: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAudio = clip.mediaType === "audio";
  const hasMedia = Boolean(clip.mediaUrl) && !mediaFailed;
  const hasImage = Boolean(clip.coverUrl) && !mediaFailed;

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
    setMediaFailed(true);
    setIsPlaying(false);
    if (currentlyPlaying === mediaRef.current) {
      currentlyPlaying = null;
    }
    console.error("خطأ تشغيل الميديا:", {
      title: clip.title,
      mediaUrl: clip.mediaUrl,
      mediaType: clip.mediaType,
    });
    toast.error("تعذر تشغيل هذا الملف");
  };

  const handleVideoMetadata = (e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("الفيديو لا يحتوي على مسار صورة صالح:", {
        src: clip.mediaUrl,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    }
  };

  // دالة تشغيل داخلي يتم استدعاؤها عند الضغط المفرد
  const executePlayPause = async () => {
    const media = mediaRef.current;
    if (!media || !clip.mediaUrl || mediaFailed) {
      toast.error("هذا المقطع غير متاح للتشغيل");
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
      toast.error("تعذر التشغيل");
    }
  };

  // دالة زر التشغيل الأصلي لضمان التوافق مع منع الانتشار
  const togglePlay = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    await executePlayPause();
  };

  // إدارة النقرات للتفريق الذكي بين كليك واحد ودبل كليك ومنع التداخل
  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    if (clickTimeoutRef.current) {
      // دبل كليك -> إلغاء نقرة التشغيل المصغر وفتح الريلز الكبيرة
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      if (onOpenReels) {
        onOpenReels(index);
      }
    } else {
      // نقرة واحدة -> انتظر مهلة قصيرة للتأكد من عدم وجود نقرة ثانية
      clickTimeoutRef.current = setTimeout(() => {
        executePlayPause();
        clickTimeoutRef.current = null;
      }, 250); // مهلة الـ Double Click القياسية
    }
  };

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      if (currentlyPlaying && currentlyPlaying !== media) {
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl p-4 shadow-card ring-1 ring-foreground/10 cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
        clip.gradient || "bg-slate-800"
      }`}
    >
      {/* عرض صورة الغلاف */}
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
      {hasMedia && isAudio && (
        <audio
          ref={mediaRef as RefObject<HTMLAudioElement>}
          src={clip.mediaUrl}
          preload="metadata"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleMediaError}
        />
      )}

      {/* مشغل الفيديو */}
      {hasMedia && !isAudio && (
        <video
          ref={mediaRef as RefObject<HTMLVideoElement>}
          src={clip.mediaUrl}
          preload="metadata"
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          onLoadedMetadata={handleVideoMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleMediaError}
        />
      )}

      {hasImage && <div className="absolute inset-0 bg-black/25" />}

      {hasMedia && isAudio && (
        <Music
          className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-white/40"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex items-center justify-between gap-1">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-[20px]">
          {clip.badge ?? (isAudio ? "صوت" : "فيديو")}
        </span>
        <span className="text-[11px] font-medium text-white/80">
          {clip.duration}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل المقطع"}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105 ${
            isPlaying ? "opacity-0" : ""
          }`}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-white" />
          ) : (
            <Play className="h-6 w-6 translate-x-0.5 fill-white" />
          )}
        </button>
      </div>

      <div className="relative z-10 mt-2 flex flex-col text-white">
        <h3 className="truncate text-sm font-bold">{clip.title}</h3>
        <p className="truncate text-[11px] text-white/70">@{clip.author}</p>
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-between gap-1 text-white/80">
        <button
          type="button"
          aria-label="الإعجاب بالمقطع"
          onClick={(e) => e.stopPropagation()} // منع نقر الزر من فتح الريلز
          className="flex items-center gap-1.5 text-[11px]"
        >
          <Heart className="h-4 w-4" />
          <span>{clip.likes}</span>
        </button>

        <button
          type="button"
          aria-label="مشاركة المقطع"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation(); // منع فتح الريلز عند الضغط على مشاركة
            void shareClip(clip);
          }}
          className="flex items-center gap-1.5 text-[11px] hover:text-white"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
