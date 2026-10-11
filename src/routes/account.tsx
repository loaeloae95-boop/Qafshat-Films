import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/use-auth";
import { useClips } from "@/hooks/use-clips";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "حسابي — قفشات أفلام" }] }),
  component: Account,
});

function Account() {
  const { user, loading } = useSession();
  const { data: all = [] } = useClips();
  const count = user ? all.filter((c) => c.userId === user.id).length : 0;
  const name =
    (user?.user_metadata?.["display_name"] as string | undefined) ?? user?.email?.split("@")[0] ?? "";

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-extrabold">حسابي</h1>

      {!loading && !user && (
        <div className="glass-panel mt-5 rounded-3xl p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">أنشئ حساباً لتشارك قفشاتك مع الجميع</p>
          <Link to="/auth" className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
            تسجيل الدخول / حساب جديد
          </Link>
        </div>
      )}

      {user && (
        <>
          <div className="mt-5 flex items-center gap-4 rounded-3xl gradient-violet p-5 shadow-glow">
            <div className="grid size-14 place-items-center rounded-full bg-background/35 text-xl font-bold">
              {name.charAt(0)}
            </div>
            <div>
              <p className="font-bold">{name}</p>
              <p className="text-xs text-foreground/75" dir="ltr">{user.email}</p>
              <p className="text-xs text-foreground/75">{count} قفشة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3 text-sm ring-1 ring-border"
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </>
      )}
    </AppShell>
  );
}
