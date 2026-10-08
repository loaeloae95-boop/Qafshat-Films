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
      
      // جلب البيانات النصية من جدول clips المرتبط بالرئيسية
      const { data, error } = await supabase
        .from("clips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("جدول clips غير موجود، سيتم الجلب من المخزن مباشرة");
        await fetchFromStorageDirectly();
        return;
      }
      
      setFiles(data || []);
    } catch (err) {
      console.error(err);
      await fetchFromStorageDirectly();
    } finally {
      setLoading(false);
    }
  };

  // دالة احتياطية ذكية لجلب الفيديوهات والأصوات مباشرة من المخزن في حال تعذر قراءة الجدول
  const fetchFromStorageDirectly = async () => {
    try {
      const fetchedFiles: MediaFile[] = [];

      // 1. جلب الأصوات
      const { data: audiosData, error: audiosError } = await supabase.storage
        .from("audios")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (!audiosError && audiosData) {
        audiosData.forEach((item) => {
          if (item.name !== ".emptyFolderPlaceholder") {
            const { data: urlData } = supabase.storage.from("audios").getPublicUrl(item.name);
            fetchedFiles.push({
              name: item.name,
              id: item.id || item.name,
              created_at: item.created_at || new Date().toISOString(),
              url: urlData.publicUrl,
              type: "audio",
            });
          }
        });
      }

      // 2. جلب الفيديوهات
      const { data: videosData, error: videosError } = await supabase.storage
        .from("videos")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (!videosError && videosData) {
        videosData.forEach((item) => {
          if (item.name !== ".emptyFolderPlaceholder") {
            const { data: urlData } = supabase.storage.from("videos").getPublicUrl(item.name);
            fetchedFiles.push({
              name: item.name,
              id: item.id || item.name,
              created_at: item.created_at || new Date().toISOString(),
              url: urlData.publicUrl,
              type: "video",
            });
          }
        });
      }

      fetchedFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFiles(fetchedFiles);
    } catch (err) {
      console.error("Storage fetch error:", err);
    }
  };

  useEffect(() => { fetchLibraryFiles(); }, []);

  const handleDelete = async (id: string, name: string, type: "audio" | "video") => {
    if (!confirm("هل تريد حذف هذا المقطع نهائياً من السحابة؟")) return;
    try {
      const bucket = type === "video" ? "videos" : "audios";
      await supabase.storage.from(bucket).remove([name]);
      
      // محاولة الحذف من الجدول إن وجد
      try {
        await supabase.from("clips").delete().eq("id", id);
      } catch (e) {}
      
      toast.success("تم الحذف بنجاح");
      setFiles(files.filter(f => f.name !== name && f.id !== id));
    } catch (err) {
      toast.error("فشل الحذف");
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-24 text-right" dir="rtl">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 justify-start">
          <FolderOpen className="text-purple-400 w-6 h-6" /> مكتبة قفشاتي الخاصة
        </h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p>جاري تحميل قفشاتك السحابية...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400">مكتبتك فارغة حالياً. اذهب للاستوديو وقم بتصدير أولى قفشاتك!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-500">{new Date(file.created_at).toLocaleDateString("ar-EG")}</span>
                  <button onClick={() => handleDelete(file.id, file.name, file.type)} className="text-rose-400 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {file.type === "video" ? (
                  <div className="w-full rounded-lg overflow-hidden bg-black border border-slate-800 shadow-inner">
                    <video src={file.url} controls className="w-full max-h-60 object-contain" playsInline />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-blue-400 text-xs justify-start">
                      <Music className="w-4 h-4" /> <span>مقطع صوتي محفوظ</span>
                    </div>
                    <audio src={file.url} controls className="w-full mt-1" />
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
