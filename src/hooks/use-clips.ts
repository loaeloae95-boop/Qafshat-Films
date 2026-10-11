import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Clip } from "@/data/clips";

const GRADIENTS = [
  "gradient-violet", "gradient-teal", "gradient-amber",
  "gradient-rose", "gradient-indigo", "gradient-lime",
];

const db = () => supabase as unknown as SupabaseClient;

function toPublicUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^\/+/, "").replace(/^videos\/+/, "");
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
      const { data, error } = await db()
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("clips fetch error:", error);
        return [];
      }
     return (data ?? []).map((r, i) => {
  // 1. تحويل نوع الوسائط لنص صغير لتجنب اختلاف الحروف الكبيرة والصغيرة
  const rawMediaType = String(r.media_type ?? "").toLowerCase();
  
  // 2. تحديد نوع الوسائط بدقة (صوت أم فيديو)
  const mediaType: Clip["mediaType"] = 
    rawMediaType === "audio" ? "audio" : "video";

  return {
    id: String(r.id),
    title: String(r.title ?? "مقطع بدون عنوان"),
    author: String(r.author ?? "مستخدم"),
    duration: fmtDuration(r.duration_seconds),
    plays: String(r.plays_count ?? "0"),
    likes: String(r.likes_count ?? "0"),
    category: String(r.category ?? "مرفوعاتي"),
    gradient: GRADIENTS[i % GRADIENTS.length] ?? "gradient-violet",
    mediaUrl: toPublicUrl(String(r.media_url ?? "")),
    mediaType, // استخدام المتغير الجديد المحمي هنا
    ...(r.cover_url ? { coverUrl: String(r.cover_url) } : {}),
    ...(r.user_id ? { userId: String(r.user_id) } : {}),
  };
});
    },
  });
}

export function useDeleteClip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from("clips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clips"] }),
  });
}
