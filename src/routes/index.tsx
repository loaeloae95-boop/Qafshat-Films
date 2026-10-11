import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";
import { categories, clips } from "@/data/clips";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "قفشات أفلام — شارك أشهر المقاطع المضحكة" },
      {
        name: "description",
        content:
          "تطبيق قفشات أفلام لمشاركة المقاطع الصوتية والمرئية القصيرة: ابحث، استمع، واحفظ أفضل القفشات الرائجة.",
      },
      { property: "og:title", content: "قفشات أفلام — شارك أشهر المقاطع المضحكة" },
      {
        property: "og:description",
        content: "استمع وشارك أقصر وأطرف المقاطع الصوتية العربية.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("الكل");

  const filtered = useMemo(
    () =>
      clips.filter(
        (c) =>
          (active === "الكل" || c.category === active) &&
          (c.title.includes(query) || c.author.includes(query)),
      ),
    [query, active],
  );

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <div className="grid size-11 place-items-center rounded-full gradient-violet shadow-glow text-lg font-bold">
          ق
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold">قفشات أفلام</h1>
          <p className="text-xs text-muted-foreground">شارك الضحكة</p>
        </div>
        <div className="size-11" aria-hidden="true" />
      </header>

      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 ring-1 ring-border">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن قفشة..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface/60 px-3 py-2 text-xs">
        <span className="flex items-center gap-1 rounded-full gradient-violet px-3 py-1 font-bold">
          <Sparkles className="size-3.5" />
          الأكثر مشاركة اليوم
        </span>
        <span className="text-muted-foreground">١٤٢ قفشة جديدة</span>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition",
              active === c
                ? "gradient-violet shadow-glow"
                : "bg-surface text-muted-foreground ring-1 ring-border",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <section className="mt-5 grid grid-cols-3 gap-2.5">
        {filtered.map((clip) => (
          <ClipCard key={clip.id} clip={clip} />
        ))}
      </section>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة
        </p>
      )}
    </AppShell>
  );
}
