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
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // إعادة ضبط حالة الزر إلى Play إذا تغير الكارت أو تنقل المستخدم بين الصفحات
  useEffect(() => {
    setIsPlaying(false);
  }, [clip.id]);

  // إيقاف تشغيل الفيديو عند الخروج من الصفحة لحظر استمرار الصوت في الخلفية
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  // التحكم الفعلي في تشغيل وإيقاف ملف الـ mp4
  useEffect(() => {
    const handlePlayback = async () => {
      if (!videoRef.current || !clip.mediaUrl) return;

      try {
        if (isPlaying) {
          await videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      } catch (err) {
        console.log("حظر المتصفح التشغيل التلقائي للميديا:", err);
        setIsPlaying(false); // إرجاع الزر لوضع الاستعداد إذا رفض المتصفح التشغيل
      }
    };

    handlePlayback();
  }, [isPlaying, clip.mediaUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // منع تداخل الضغطات مع العناصر الأب
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl p-4 shadow-card ring-1 ring-foreground/10 transition-transform active:scale-[0.98]",
        clip.gradient
      )}
    >
      {/* الجزء العلوي: شارة نوع المقطع والوقت */}
      <div className="flex items-center justify-between gap-1 z-10">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-[10px]">
          {clip.mediaType === "audio" ? "صوت" : "فيديو"}
        </span>
        <span className="text-[10px] font-medium text-white/80">{clip.duration}</span>
      </div>

      {/* الشارات الإضافية */}
      <div className="mt-2 flex flex-wrap gap-1 z-10">
        {clip.isNew && (
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
            جديد
          </span>
        )}
      </div>

      {/* زر التشغيل الشفاف والأنيق */}
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

      {/* مشغل الفيديو المخفي الثابت في الـ DOM لتشغيل ملفات الـ mp4 الحالية */}
      {clip.mediaUrl && (
      {/* مشغل الفيديو المخفي الثابت في الـ DOM لتشغيل ملفات الـ mp4 الحالية */}
      {clip.mediaUrl && (
        <video
          ref={videoRef}
          src={clip.mediaUrl}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
          playsInline
          style={{ display: "none" }}
        />
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
