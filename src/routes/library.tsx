import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { createRouteFileRoute } from "@tanstack/react-router";
import { Library as LibraryIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";

export const route = createRouteFileRoute("/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const [savedMedia, setSavedMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLibrary() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("saved_media")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;
        if (data) setSavedMedia(data);
      } catch (error) {
        console.error("Error fetching library:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLibrary();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <LibraryIcon className="size-6 text-primary" />
          مكتبتي
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "جاري التحميل..." : `${savedMedia.length} مقاطع محفوظة`}
        </p>

        <section className="mt-5 grid grid-cols-3 gap-2.5">
          {!loading && savedMedia.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
