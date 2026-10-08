import { createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";
import { clips } from "@/data/clips";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "الرائج الآن — قفشات أفلام" },
      {
        name: "description",
        content: "أكثر المقاطع الصوتية استماعاً ومشاركة خلال الأربع والعشرين ساعة الماضية.",
      },
      { property: "og:title", content: "الرائج الآن — قفشات أفلام" },
      {
        property: "og:description",
        content: "تعرّف على قفشات الأفلام الأكثر انتشاراً اليوم.",
      },
    ],
  }),
  component: Trending,
});

function Trending() {
  const top = [...clips].sort(
    (a, b) => parseFloat(b.plays) - parseFloat(a.plays),
  );

  return (
    <AppShell>
      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
        <Flame className="size-6 text-accent" />
        الرائج الآن
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">تحديث كل ساعة</p>

      <ol className="mt-5 space-y-3">
        {top.map((clip, i) => (
          <li key={clip.id} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-center font-display text-lg font-bold text-primary">
              {i + 1}
            </span>
            <div className="flex-1">
              <ClipCard clip={clip} />
            </div>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
