import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";
import { categories } from "@/data/clips";
import { useClips } from "@/hooks/use-clips";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "قفشات أفلام — شارك أشهر المقاطع المضحكة" }] }),
  component: Index,
});

function Index() {
  const { data: all = [], isLoading } = useClips();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("الكل");

  const filtered = useMemo(
    () =>
      all.filter(
        (c) =>
          (active === "الكل" || c.category === active) &&
          (c.title.includes(query) || c.author.includes(query)),
      ),
    [all, query, active],
  );

  return (
    <AppShell>
      <header className="text-center">
        <h1 className="font-display text-2xl font-extrabold">قفشات أفلام</h1>
        <p className="text-xs text-muted-foreground">شارك الضحكة</p>
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

      {!isLoading && filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          لا توجد قفشات بعد — اقصّ مقطعاً من تبويب «قص» واحفظه في مكتبتك
        </p>
      )}
    </AppShell>
  );
}
