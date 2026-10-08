import { useState } from "react";
import { Share2, Copy, Check, X, Send } from "lucide-react";
import { toast } from "sonner";
import type { Clip } from "@/data/clips";

function clipUrl(clip: Clip) {
  return `${window.location.origin}/?clip=${clip.id}`;
}

async function copyLink(clip: Clip) {
  const url = clipUrl(clip);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("تم نسخ الرابط — الصقه في أي تطبيق");
  } catch {
    toast.error("تعذر النسخ");
  }
}

export async function shareClip(clip: Clip) {
  const url = clipUrl(clip);
  const text = `🎧 ${clip.title} — ${clip.author} عبر قفشات أفلام`;
  if (navigator.share) {
    try {
      await navigator.share({ title: clip.title, text, url });
      return;
    } catch {
      return; // user cancelled
    }
  }
  await copyLink(clip);
}

export function ShareMenu({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const url = encodeURIComponent(clipUrl(clip));
  const text = encodeURIComponent(`🎧 ${clip.title} — ${clip.author} عبر قفشات أفلام`);
  const [copied, setCopied] = useState(false);

  const targets = [
    {
      label: "واتساب",
      href: `https://wa.me/?text=${text}%20${url}`,
      icon: Send,
      className: "bg-[#25D366]/15 text-[#25D366]",
    },
    {
      label: "تيليجرام",
      href: `https://t.me/share/url?url=${url}&text=${text}`,
      icon: Send,
      className: "bg-[#229ED9]/15 text-[#229ED9]",
    },
    {
      label: "إكس",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      icon: Share2,
      className: "bg-foreground/10 text-foreground",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel w-full max-w-md rounded-t-3xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="مشاركة المقطع"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">مشاركة «{clip.title}»</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid size-8 place-items-center rounded-full bg-foreground/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {targets.map(({ label, href, icon: Icon, className }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2"
            >
              <span className={`grid size-12 place-items-center rounded-2xl ${className}`}>
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </a>
          ))}
          <button
            type="button"
            onClick={async () => {
              await copyLink(clip);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex flex-col items-center gap-2"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
            </span>
            <span className="text-[11px] text-muted-foreground">نسخ الرابط</span>
          </button>
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={() => shareClip(clip)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Share2 className="size-4" />
            مشاركة عبر تطبيقات الجهاز
          </button>
        )}
      </div>
    </div>
  );
}
