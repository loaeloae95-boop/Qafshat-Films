import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { type Clip } from "@/data/clips";

interface ClipCardProps {
  clip: Clip;
  index: number;
}

export function ClipCard({ clip, index }: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const isAudio = clip.mediaType === "audio";
  const hasMedia = Boolean(clip.mediaUrl) && !mediaFailed;
  const hasImage = Boolean(clip.coverUrl) && !mediaFailed;

  useEffect(() => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.play().catch((err) => {
          console.error("Playback failed:", err);
          setIsPlaying(false);
        });
      } else {
        mediaRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div className={`relative overflow-hidden rounded-xl aspect-[9/16] ${clip.gradient || "bg-slate-800"}`}>
      {/* 1. عرض صورة الغلاف إذا وجدت */}
      {hasImage && !isPlaying && (
        <img
          src={clip.coverUrl}
          alt={clip.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* 2. مشغل الفيديو */}
      {hasMedia && !isAudio && (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={clip.mediaUrl}
          preload="metadata"
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              console.error("الفيديو لا يحتوي على مسار صورة صالح", {
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
          }}
          onError={(e) => {
            console.error("Video error:", e);
            setMediaFailed(true);
            setIsPlaying(false);
            toast.error("تعذر تشغيل الفيديو");
          }}
        />
      )}

      {/* 3. مشغل الصوت */}
      {hasMedia && isAudio && (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={clip.mediaUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
          }}
          onError={(e) => {
            console.error("Audio error:", e);
            setMediaFailed(true);
            setIsPlaying(false);
            toast.error("تعذر تشغيل الصوت");
          }}
        />
      )}

      {/* 4. تفاصيل المقطع وأزرار التحكم */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
        <h3 className="text-white font-bold text-lg mb-1">{clip.title}</h3>
        <p className="text-gray-300 text-sm mb-4">@{clip.author}</p>
        
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="bg-white/20 hover:bg-white/30 text-white rounded-full py-2 px-4 backdrop-blur-sm transition-colors text-sm font-medium self-start"
        >
          {isPlaying ? "إيقاف مؤقت" : "تشغيل المقـطع"}
        </button>
      </div>
    </div>
  );
}
