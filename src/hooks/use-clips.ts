import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Clip = {
  id: string;
  title: string;
  author: string;
  duration: string;
  plays: string;
  likes: string;
  category: string;
  gradient: string;
  mediaUrl?: string;
  mediaType?: "audio" | "video";
  coverUrl?: string;
  userId?: string;
};

const GRADIENTS = [
  "gradient-violet",
  "gradient-blue",
  "gradient-emerald",
  "gradient-amber",
  "gradient-rose",
];

function fmtDuration(sec: unknown): string {
  const s = Number(sec ?? 0);
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

function toPublicUrl(path: string | null | undefined, bucket: string): string {
  if (!path) return "";
  // إذا كان الرابط كاملاً ويبدأ بـ https، يتم استخدامه مباشرة دون تكرار
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function useClips() {
  return useQuery<Clip[]>({
    queryKey: ["clips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clips:", error);
        throw error;
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
    },
  });
}

export function useDeleteClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips"] });
      toast.success("تم حذف المقطع بنجاح");
    },
    onError: (error) => {
      console.error("Error deleting clip:", error);
      toast.error("حدث خطأ أثناء حذف المقطع");
    },
  });
}
