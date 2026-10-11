import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — قفشات أفلام" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("أرسلنا رابط تأكيد لبريدك — أكّده ثم سجّل الدخول");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-3 text-sm focus:border-primary/40 focus:outline-none";

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-extrabold">
        {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
      </h1>
      <form onSubmit={submit} className="glass-panel mt-5 space-y-3 rounded-3xl p-5">
        {mode === "signup" && (
          <input className={field} placeholder="الاسم الظاهر" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className={field} type="email" dir="ltr" placeholder="البريد الإلكتروني" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} type="password" dir="ltr" placeholder="كلمة المرور (6 أحرف على الأقل)" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "..." : mode === "signin" ? "دخول" : "إنشاء الحساب"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-xs text-muted-foreground"
        >
          {mode === "signin" ? "ليس لديك حساب؟ أنشئ واحداً" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </AppShell>
  );
}
