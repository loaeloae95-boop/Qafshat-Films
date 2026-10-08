import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Library as LibraryIcon, Search, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";
import type { Clip } from "@/data/clips";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "مكتبتي — قفشات أفلام" },
      {
        name: "description",
        content: "القفشات التي صنعتها وحفظتها بالتطبيق في مكان واحد.",
      },
      { property: "og:title", content: "مكتبتي — قفشات أفلام" },
      { property: "og:description", content: "كل قفشاتك المحفوظة في مكان واحد." },
    ],
  }),
  component: LibraryPage,
});

type ClipRow = {
  id: string;
  title: string;
  author: string;
  media_url: string;
  media_type: "audio" | "video";
  duration_seconds: number | null;
  category: string;
  created_at: string;
};

const GRADIENTS = ["gradient-violet", "gradient-teal", "gradient-amber"];

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function rowToClip(row: ClipRow, index: number): Clip {
  return {
    id: row.id,
    title: row.title,
    author: row.author || "أنا",
    duration: formatDuration(row.duration_seconds),
    plays: "0",
    likes: "0",
    category: row.category || "مرفوعاتي",
    gradient: GRADIENTS[index % GRADIENTS.length],
    mediaUrl: row.media_url,
    mediaType: row.media_type,
  };
}

function LibraryPage() {
  const [rows, setRows] = useState<ClipRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"الكل" | "فيديو" | "صوت">("الكل");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient;
      const { data, error } = await db
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setLoadError("تعذر تحميل مكتبتك — تأكد إن جدول clips تم إنشاؤه بـ Supabase");
        setRows([]);
      } else {
        setRows((data ?? []) as ClipRow[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clips = useMemo(() => (rows ?? []).map(rowToClip), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clips.filter((clip) => {
      const matchesQuery = !q || clip.title.toLowerCase().includes(q);
      const matchesType =
        typeFilter === "الكل" ||
        (typeFilter === "فيديو" && clip.mediaType === "video") ||
        (typeFilter === "صوت" && clip.mediaType === "audio");
      return matchesQuery && matchesType;
    });
  }, [clips, query, typeFilter]);

  return (
    <AppShell>
      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
        <LibraryIcon className="size-6 text-primary" />
        مكتبتي
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {rows === null ? "جارٍ التحميل..." : `${filtered.length} قفشة محفوظة`}
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 ring-1 ring-border">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن قفشة بالاسم..."
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex gap-2">
        {(["الكل", "فيديو", "صوت"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              typeFilter === t
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground ring-1 ring-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {rows === null && (
        <div className="mt-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-xs">جارٍ تحميل قفشاتك...</p>
        </div>
      )}

      {loadError && (
        <p className="mt-6 rounded-2xl bg-red-500/10 p-3 text-center text-xs text-red-400">
          {loadError}
        </p>
      )}

      {rows !== null && !loadError && filtered.length === 0 && (
        <div className="mt-10 text-center text-xs text-muted-foreground">
          {query || typeFilter !== "الكل"
            ? "ما فيه نتائج مطابقة للبحث"
            : "ما حفظت أي قفشة بعد — جرّب تصدّر مقطعاً من استوديو القص واضغط «حفظ في مكتبتي»"}
        </div>
      )}

      <section className="mt-5 grid grid-cols-3 gap-2.5">
        {filtered.map((clip) => (
          <ClipCard key={clip.id} clip={clip} />
        ))}
      </section>
    </AppShell>
  );
}
