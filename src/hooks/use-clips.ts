import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Clip } from "@/data/clips";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "videos";
const COVER_BUCKET = "images";

const GRADIENTS = [
  "gradient-violet",
  "gradient-teal",
  "gradient-amber",
  "gradient-rose",
  "gradient-indigo",
  "gradient-lime",
] as const;

type ClipRow = {
  id?: string | number | null;
  title?: string | null;
  author?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  cover_url?: string | null;
  duration_seconds?: number | string | null;
  category?: string | null;
  user_id?: string | null;
  plays_count?: number | string | null;
  likes_count?: number | string | null;
  created_at?: string | null;
};

const db = () => supabase as unknown as SupabaseClient;

function toPublicUrl(
  rawValue: unknown,
  bucket: string,
): string {
  const raw = String(rawValue ?? "").trim();

  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const path = raw
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${bucket}/+`, "i"), "");

  if (!path) {
    return "";
  }

  return supabase.storage
    .from(bucket)
    .getPublicUrl(path)
    .data
    .publicUrl;
}

function formatDuration(
  seconds: unknown,
): string {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatCount(
  value: unknown,
): string {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "0";
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}m`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(1)}k`;
  }

  return String(Math.round(number));
}

function normalizeMediaType(
  value: unknown,
): "audio" | "video" {
  const type = String(value ?? "").trim().toLowerCase();

  if (
    type === "audio" ||
    type === "sound" ||
    type === "music" ||
    type === "mp3" ||
    type === "wav" ||
    type === "m4a"
  ) {
    return "audio";
  }

  return "video";
}

function mapClipRow(
  row: ClipRow,
  index: number,
): Clip {
  const mediaType = normalizeMediaType(row.media_type);

  const mediaUrl = toPublicUrl(
    row.media_url,
    STORAGE_BUCKET,
  );

  const coverUrl = toPublicUrl(
    row.cover_url,
    COVER_BUCKET,
  );

  const gradient =
    GRADIENTS[index % GRADIENTS.length] ??
    "gradient-violet";

  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? "مقطع بدون عنوان"),
    author: String(row.author ?? "مستخدم"),
    duration: formatDuration(row.duration_seconds),
    plays: formatCount(row.plays_count),
    likes: formatCount(row.likes_count),
    category: String(row.category ?? "مرفوعاتي"),
    gradient,
    mediaType,
    ...(mediaUrl ? { mediaUrl } : {}),
    ...(coverUrl ? { coverUrl } : {}),
    ...(row.user_id
      ? { userId: String(row.user_id) }
      : {}),
  };
}

export function useClips() {
  return useQuery<Clip[]>({
    queryKey: ["clips"],

    queryFn: async () => {
      const { data, error } = await db()
        .from("clips")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("خطأ في تحميل المقاطع:", error);
        throw error;
      }

      const rows = (data ?? []) as unknown as ClipRow[];

      return rows
        .map((row, index) => mapClipRow(row, index))
        .filter((clip) => clip.id.length > 0);
    },

    staleTime: 30_000,
    retry: 1,
  });
}

export function useDeleteClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clipId: string) => {
      const id = String(clipId).trim();

      if (!id) {
        throw new Error("معرّف المقطع غير صالح");
      }

      const { error } = await db()
        .from("clips")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("خطأ في حذف المقطع:", error);
        throw error;
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clips"],
      });
    },
  });
}
