import { createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronLeft, Moon, Shield, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي — قفشات أفلام" },
      {
        name: "description",
        content: "إدارة ملفك الشخصي، مقاطعك المرفوعة وإعدادات التطبيق.",
      },
      { property: "og:title", content: "حسابي — قفشات أفلام" },
      { property: "og:description", content: "ملفك الشخصي وإعدادات تطبيق قفشات أفلام." },
    ],
  }),
  component: Account,
});

const rows = [
  { icon: Upload, label: "مقاطعي المرفوعة", value: "7" },
  { icon: Bell, label: "الإشعارات", value: "مفعّلة" },
  { icon: Moon, label: "المظهر", value: "داكن" },
  { icon: Shield, label: "الخصوصية", value: "" },
];

function Account() {
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-extrabold">حسابي</h1>

      <div className="mt-5 flex items-center gap-4 rounded-3xl gradient-violet p-5 shadow-glow">
        <div className="grid size-14 place-items-center rounded-full bg-background/35 text-xl font-bold">
          ل
        </div>
        <div>
          <p className="font-bold">لؤي أبو سنينة</p>
          <p className="text-xs text-foreground/75">١٫٢ ألف متابع · ٧ قفشات</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-border transition hover:bg-surface-2"
            >
              <Icon className="size-4 text-primary" />
              <span className="flex-1 text-start">{label}</span>
              <span className="text-xs text-muted-foreground">{value}</span>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
