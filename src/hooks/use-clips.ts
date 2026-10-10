import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Clip } from "@/data/clips";

const GRADIENTS = [
  "gradient-violet", "gradient-teal", "gradient-amber",
  "gradient-rose", "gradient-indigo", "gradient-lime",
];

// يقبل رابطاً كاملاً أو اسم ملف/مساراً فقط، ويحوّله دائماً إلى رابط عام صالح
function toPublicUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^\/+/, "").replace(/^videos\//, "");
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

function fmtDuration(s?: number | null) {
  const t = Math.round(Number(s) || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
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
        author: r.author ?? "أنا",
        duration: fmtDuration(r.duration_seconds),
        plays: "0",
        likes: "0",
        category: r.category ?? "مرفوعاتي",
        gradient: GRADIENTS[i % GRADIENTS.length] ?? "gradient-violet",
        mediaUrl: toPublicUrl(r.media_url),
        mediaType: r.media_type === "audio" ? "audio" : "video",
      }));
    },
  });
}
