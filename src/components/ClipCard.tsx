import { Heart, Play, Pause, Share2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ClipCardProps {
  clip: {
    id: string;
    title: string;
    speaker: string;
    duration: string;
    mediaUrl: string;
    mediaType: "audio" | "video";
    gradient: string;
    likes: number;
    shares: number;
    isNew?: boolean;
  };
}

export function ClipCard({ clip }: ClipCardProps) {
  // جعل الحالة الافتراضية دائماً false عند بناء الكارت لمنع التشغيل التلقائي في مكتبتي
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // إعادة ضبط الحالة إلى false إذا تغير الـ clip لمنع انتقال حالة التشغيل بين البطاقات
  useEffect(() => {
    setIsPlaying(false);
  }, [clip.id]);

  useEffect(() => {
    // إيقاف تشغيل الميديا الأخرى عند تدمير المكون أو إغلاقه
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
    };
  }, []);

  useEffect(() => {
    const playMedia = async () => {
      try {
        if (clip.mediaType === "audio" && audioRef.current) {
          if (isPlaying) {
            await audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
        } else if (clip.mediaType === "video" && videoRef.current) {
          if (isPlaying) {
            await videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      } catch (err) {
        console.log("تعذر تشغيل الميديا بسبب قيود المتصفح الإلكتروني:", err);
        setIsPlaying(false); // إرجاع الزر لوضع التشغيل إذا فشل المتصفح
      }
    };

    playMedia();
  }, [isPlaying, clip.mediaType]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // منع انتشار النقرة لعدم تداخل الأحداث
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl p-4 shadow-card ring-1 ring-foreground/10 transition-transform active:scale-[0.98]",
        clip.gradient
      )}
    >
      {/* الجزء العلوي: النوع والوقت */}
      <div className="flex items-center justify-between gap-1 z-10">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-[10px]">
          {clip.mediaType === "audio" ? "صوت" : "فيديو"}
        </span>
        <span className="text-[10px] font-medium text-white/80">{clip.duration}</span>
      </div>

      {/* الشارات الإضافية مثل جديد */}
      <div className="mt-2 flex flex-wrap gap-1 z-10">
        {clip.isNew && (
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white temporary-badge">
            جديد
          </span>
        )}
      </div>

      {/* زر التشغيل والإيقاف الشفاف والأنيق (حسب التصميم الأصلي) */}
      <div className="flex flex-1 items-center justify-center z-10">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-white text-white" />
          ) : (
            <Play className="h-6 w-6 fill-white text-white translate-x-[2px]" />
          )}
        </button>
      </div>

      {/* عناصر الميديا المخفية المستقرة في الـ DOM */}
      {clip.mediaUrl && (
        <>
          {clip.mediaType === "audio" ? (
            <audio
              ref={audioRef}
              src={clip.mediaUrl}
              onEnded={() => setIsPlaying(false)}
              preload="auto"
              className="hidden"
            />
          ) : (
            <video
              ref={videoRef}
              src={clip.mediaUrl}
              onEnded={() => setIsPlaying(false)}
              preload="auto"
              className="hidden"
            />
          )}
        </>
      )}

      {/* تفاصيل المقطع السفلي */}
      <div className="mt-4 text-center text-white z-10">
        <h3 className="truncate text-sm font-bold">{clip.title}</h3>
        <p className="truncate text-[11px] text-white/70">{clip.speaker}</p>
      </div>

      {/* أزرار التفاعل السفلى */}
      <div className="mt-3 flex items-center justify-center gap-6 text-white/90 z-10">
        <button type="button" className="flex items-center gap-1.5 transition hover:scale-110">
          <Heart className="h-4 w-4" />
          <span className="text-xs">
            {clip.likes >= 1000 ? `${(clip.likes / 1000).toFixed(1)}k` : clip.likes}
          </span>
        </button>
        <button type="button" className="flex items-center gap-1.5 transition hover:scale-110">
          <Share2 className="h-4 w-4" />
          <span className="text-xs">
            {clip.shares >= 1000 ? `${(clip.shares / 1000).toFixed(1)}k` : clip.shares}
          </span>
        </button>
      </div>
    </div>
  );
}
