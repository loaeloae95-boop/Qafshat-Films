import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Clip } from "@/data/clips";

const GRADIENTS = [
  "gradient-violet", "gradient-teal", "gradient-amber",
  "gradient-rose", "gradient-indigo", "gradient-lime",
];

// دالة تحويل الروابط المصلحة والمطورة لمعالجة الحالتين معاً
function toPublicUrl(raw: string): string {
  if (!raw) return "";

  // 1. إذا كان الرابط المخزن رابطاً كاملاً (مثل الصفوف الحالية)، يعاد فوراً دون تعديل
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  // 2. إذا كان اسم ملف صافي (مثل الصف الأول المعدل)، يتم بناء الرابط العام له
  const cleanPath = raw.replace(/^\//, "").replace(/^videos\//, "");
  return supabase.storage.from("videos").getPublicUrl(cleanPath).data.publicUrl;
}

function fmtDuration(s: number | null) {
  const round = Math.round(Number(s) || 0);
  return `${Math.floor(round / 60)}:${String(round % 60).padStart(2, "0")}`;
}

export function useClips() {
  return useQuery({
    queryKey: ["clips"],
    queryFn: async (): Promise<Clip[]> => {
      const db = supabase as unknown as SupabaseClient;
      const { data, error } = await db
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("clips fetch error:", error);
        return [];
      }

      return (data ?? []).map((r, i) => ({
        id: String(r.id),
        title: r.title,
        speaker: r.author || "أنا",
        duration: fmtDuration(r.duration_seconds),
        plays: "0",
        likes: 0,
        shares: 0,
        gradient: GRADIENTS[i % GRADIENTS.length],
        // استخدام الدالة المصلحة لتجهيز الرابط النهائي للبطاقة
        mediaUrl: toPublicUrl(r.media_url || ""),
        mediaType: r.media_type === "audio" ? "audio" : "video",
        isNew: i === 0,
      }));
    },
  });
}
