import { createFileRoute } from "@tanstack/react-router";
import { Library as LibraryIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";
import { clips } from "@/data/clips";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "مكتبتي — قفشات أفلام" },
      {
        name: "description",
        content: "المقاطع الصوتية التي حفظتها وأعجبت بها في مكان واحد.",
      },
      { property: "og:title", content: "مكتبتي — قفشات أفلام" },
      { property: "og:description", content: "كل قفشات الأفلام المحفوظة في مكان واحد." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const saved = useClips().data ?? [];

  return (
    <AppShell>
      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
        <LibraryIcon className="size-6 text-primary" />
        مكتبتي
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">{saved.length} مقاطع محفوظة</p>

      <section className="mt-5 grid grid-cols-3 gap-2.5">
        {saved.map((clip) => (
          <ClipCard key={clip.id} clip={clip} />
        ))}
      </section>
    </AppShell>
  );
}
