import { createFileRoute, Link } from "@tanstack/react-router";
import { Library as LibraryIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ClipCard } from "@/components/ClipCard";
import { useSession } from "@/hooks/use-auth";
import { useClips, useDeleteClip } from "@/hooks/use-clips";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "مكتبتي — قفشات أفلام" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user, loading } = useSession();
  const { data: all = [] } = useClips();
  const del = useDeleteClip();
  const mine = user ? all.filter((c) => c.userId === user.id) : [];

  return (
    <AppShell>
      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
        <LibraryIcon className="size-6 text-primary" />
        مكتبتي
      </h1>

      {!loading && !user && (
        <div className="glass-panel mt-6 rounded-3xl p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">سجّل الدخول لترى قفشاتك وتحفظ الجديد</p>
          <Link to="/auth" className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
            تسجيل الدخول
          </Link>
        </div>
      )}

      {user && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{mine.length} قفشة</p>
          <section className="mt-5 grid grid-cols-3 gap-2.5">
            {mine.map((clip) => (
              <div key={clip.id}>
                <ClipCard clip={clip} />
                <button
                  type="button"
                  onClick={() =>
                    del.mutate(clip.id, {
                      onSuccess: () => toast.success("تم الحذف"),
                      onError: () => toast.error("تعذر الحذف"),
                    })
                  }
                  className="mt-1 flex w-full items-center justify-center gap-1 text-[11px] text-red-400"
                >
                  <Trash2 className="size-3" /> حذف
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}
