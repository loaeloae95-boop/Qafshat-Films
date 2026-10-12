import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Clip } from "@/data/clips";

const GRADIENTS = [
  "gradient-violet", "gradient-teal", "gradient-amber",
  "gradient-rose", "gradient-indigo", "gradient-lime",
];

const db = () => supabase as unknown as SupabaseClient;

function toPublicUrl(raw: unknown, bucket: string): string {
  const value = String(raw ?? "").trim();
  
  if (!value) {
    return "";
  }
  
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  
  const path = value
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${bucket}\/+`, "i"), "");
    
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
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
        const rawMediaType = String(r.media_type ?? "").toLowerCase();
        
        const mediaType: Clip["mediaType"] = 
          rawMediaType === "audio" ? "audio" : "video";
          
        const mediaUrl = toPublicUrl(r.media_url, "videos");
        const coverUrl = toPublicUrl(r.cover_url, "images");
        
        return {
          id: String(r.id),
          title: String(r.title ?? "مقطع بدون عنوان"),
          author: String(r.author ?? "مستخدم"),
          duration: fmtDuration(r.duration_seconds),
          plays: String(r.plays_count ?? "0"),
          likes: String(r.likes_count ?? "0"),
          category: String(r.category ?? "مرفوعاتي"),
          gradient: GRADIENTS[i % GRADIENTS.length] ?? "gradient-violet",
          mediaUrl,
          mediaType,
          ...(coverUrl ? { coverUrl } : {}),
          ...(r.user_id ? { userId: String(r.user_id) } : {}),
        };
      });
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
