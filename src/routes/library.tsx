import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Music, Video, Trash2, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "مكتبتي - قفشات أفلام" }] }),
});

interface MediaFile {
  name: string;
  id: string;
  created_at: string;
  url: string;
  type: "audio" | "video";
}

export default function Library() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibraryFiles = async () => {
    try {
      setLoading(true);
      // جلب البيانات من جدول clips النصي المرتبط بالرئيسية
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحميل مكتبتك");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLibraryFiles(); }, []);

  const handleDelete = async (id: string, name: string, type: "audio" | "video") => {
    if (!confirm("هل تريد حذف هذا المقطع نهائياً؟")) return;
    try {
      const bucket = type === "video" ? "videos" : "audios";
      await supabase.storage.from(bucket).remove([name]);
      await supabase.from("clips").delete().eq("id", id);
      toast.success("تم الحذف بنجاح");
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      toast.error("فشل الحذف");
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-24 text-right" dir="rtl">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="text-purple-400 w-6 h-6" /> مكتبة قفشاتي الخاصة
        </h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p>جاري تحميل قفشاتك السحابية...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400">مكتبتك فارغة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-500">{new Date(file.created_at).toLocaleDateString("ar-EG")}</span>
                  <button onClick={() => handleDelete(file.id, file.name, file.type)} className="text-rose-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {file.type === "video" ? (
                  <video src={file.url} controls className="w-full rounded-lg bg-black max-h-48" playsInline />
                ) : (
                  <div className="flex flex-col gap-2 bg-slate-800/40 p-2 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-xs"><Music className="w-4 h-4" /> مقطع صوتي</div>
                    <audio src={file.url} controls className="w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
