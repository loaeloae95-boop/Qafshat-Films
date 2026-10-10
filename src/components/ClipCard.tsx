import { Heart, Play, Pause, Share2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    isAudio?: boolean;
  };
}

export function ClipCard({ clip }: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  // استخدام useRef للإمساك بعنصر التشغيل بشكل مباشر وثابت
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // مراقبة تغيير حالة التشغيل للتحكم الفعلي في الميديا
  useEffect(() => {
    if (clip.mediaType === "audio" && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.log("Audio play blocked:", err));
      } else {
        audioRef.current.pause();
      }
    } else if (clip.mediaType === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((err) => console.log("Video play blocked:", err));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, clip.mediaType]);

  const togglePlay = () => {
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
      <div className="flex items-center justify-between gap-1">
        <Badge className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-[10px]">
          {clip.mediaType === "audio" ? "صوت" : "فيديو"}
        </Badge>
        <span className="text-[10px] font-medium text-white/80">{clip.duration}</span>
      </div>

      {/* الشارات الإضافية مثل جديد */}
      <div className="mt-2 flex flex-wrap gap-1">
        {clip.isNew && (
          <Badge className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
            جديد
          </Badge>
        )}
      </div>

      {/* زر التشغيل والإيقاف في المنتصف */}
      <div className="flex flex-1 items-center justify-center">
        <Button
          type="button"
          size="icon"
          onClick={togglePlay}
          className="h-14 w-14 rounded-full bg-white text-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-current text-black" />
          ) : (
            <Play className="h-6 w-6 fill-current translate-x-[2px] text-black" />
          )}
        </Button>
      </div>

      {/* عناصر الميديا المخفية والموجودة بشكل دائم في الـ DOM لتفادي حظر المتصفح */}
      {clip.mediaUrl && clip.mediaType === "audio" && (
        <audio
          ref={audioRef}
          src={clip.mediaUrl}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
          className="hidden"
        />
      )}

      {clip.mediaUrl && clip.mediaType === "video" && (
        <video
          ref={videoRef}
          src={clip.mediaUrl}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* تفاصيل المقطع السفلي: العنوان واسم القائل */}
      <div className="mt-4 text-center text-white">
        <h3 className="truncate text-sm font-bold">{clip.title}</h3>
        <p className="truncate text-[11px] text-white/70">{clip.speaker}</p>
      </div>

      {/* أزرار التفاعل: الإعجاب والمشاركة */}
      <div className="mt-3 flex items-center justify-center gap-6 text-white/90">
        <button type="button" className="flex items-center gap-1.5 transition hover:scale-110">
          <Heart className="h-4 w-4" />
          <span className="text-xs">{clip.likes >= 1000 ? `${(clip.likes / 1000).toFixed(1)}k` : clip.likes}</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 transition hover:scale-110">
          <Share2 className="h-4 w-4" />
          <span className="text-xs">{clip.shares >= 1000 ? `${(clip.shares / 1000).toFixed(1)}k` : clip.shares}</span>
        </button>
      </div>
    </div>
  );
}
