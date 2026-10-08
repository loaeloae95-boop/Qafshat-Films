import { Heart, Play, Pause, Share2 } from "lucide-react";
import { useState } from "react";
import type { Clip } from "@/data/clips";
import { cn } from "@/lib/utils";
import { ShareMenu } from "@/components/ShareMenu";

export function ClipCard({ clip }: { clip: Clip }) {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [sharing, setSharing] = useState(false);

  return (
    <article
      className={cn(
        "relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl p-3 shadow-card ring-1 ring-foreground/10 transition-transform active:scale-[0.98]",
        clip.gradient,
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="rounded-full bg-background/40 px-1.5 py-0.5 text-[10px] font-medium">
          {clip.duration}
        </span>
        {clip.badge && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
            {clip.badge}
          </span>
        )}
      </div>

      <div className="my-auto flex justify-center py-1">
        <button
          type="button"
          aria-label={playing ? "إيقاف" : "تشغيل"}
          onClick={() => setPlaying((p) => !p)}
          className="grid size-10 place-items-center rounded-full bg-background/35 backdrop-blur-sm ring-1 ring-foreground/25 transition hover:bg-background/50"
        >
          {playing ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 translate-x-[-1px] fill-current rtl:translate-x-[1px]" />
          )}
        </button>
      </div>

      {/* Real playback for clips saved from the Studio (Supabase-backed). */}
      {clip.mediaUrl && playing && clip.mediaType === "audio" && (
        <audio
          src={clip.mediaUrl}
          autoPlay
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}
      {clip.mediaUrl && clip.mediaType === "video" && (
        <video
          src={clip.mediaUrl}
          playsInline
          muted
          loop
          autoPlay={playing}
          className={cn(
            "absolute inset-0 -z-10 h-full w-full object-cover opacity-0 transition-opacity",
            playing && "opacity-60",
          )}
        />
      )}

      <h3 className="truncate px-2 text-center text-xs font-bold">{clip.title}</h3>
      <p className="truncate px-2 text-center text-[10px] text-foreground/70">{clip.author}</p>

      <div className="mt-1.5 flex items-center justify-center gap-4 text-[10px] text-foreground/80">
        <button
          type="button"
          aria-label="إعجاب"
          onClick={() => setLiked((l) => !l)}
          className="transition hover:scale-110"
        >
          <Heart className={cn("size-3.5", liked && "fill-accent text-accent")} />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="مشاركة"
            onClick={() => setSharing(true)}
            className="transition hover:scale-110"
          >
            <Share2 className="size-3.5" />
          </button>
          <span>{clip.plays} ▸</span>
        </div>
      </div>

      {sharing && <ShareMenu clip={clip} onClose={() => setSharing(false)} />}
    </article>
  );
}
