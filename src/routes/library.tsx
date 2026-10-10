import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // تأكد من صحة مسار ملف سوبابيز لديك
import { Play, Trash2, Video, Volume2, AlertCircle, RefreshCw } from 'lucide-react';

export default function MyLibrary() {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  // دالة جلب البيانات النظيفة من سوبابيز
  const fetchLibrary = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. التحقق من وجود مستخدم مسجل أولاً لحمايتها من الانهيار
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        setError("يرجى تسجيل الدخول لعرض مكتبتك الشخصية.");
        setLoading(false);
        return;
      }

      // 2. جلب الملفات المرفوعة الخاصة بهذا المستخدم فقط مرتبة من الأحدث للأقدم
      const { data, error: fetchError } = await supabase
        .from('saved_media') // تأكد أن اسم الجدول مطابق لقاعدة بياناتك
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMediaItems(data || []);
    } catch (err) {
      console.error("Library Error:", err);
      setError(err.message || "حدث خطأ غير متوقع أثناء تحميل المكتبة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // دالة حذف مقطع من المكتبة والسيرفر
  const handleDelete = async (id, fileUrl) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا المقطع نهائياً؟")) return;

    try {
      // 1. حذف السجل من قاعدة البيانات
      const { error: dbError } = await supabase
        .from('saved_media')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. تحديث الواجهة فوراً أمام المستخدم
      setMediaItems(prev => prev.filter(item => item.id !== id));
      if (playingId === id) setPlayingId(null);

      alert("تم حذف المقطع بنجاح! 🎉");
    } catch (err) {
      console.error("Delete Error:", err);
      alert("تعذر الحذف: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
      {/* الرأس العلوي */}
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          مكتبتي الرقمية 🎬
        </h1>
        <button 
          onClick={fetchLibrary}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-all text-purple-400"
          title="تحديث البيانات"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* منطقة العرض الرئيسية المحمية */}
      <div className="max-w-4xl mx-auto">
        
        {/* 1. حالة التحميل */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 animate-pulse">جاري فتح خزانة ملفاتك الآمنة...</p>
          </div>
        )}

        {/* 2. حالة حدوث خطأ (تمنع الصفحة البيضاء تماماً وتظهر المشكلة بذكاء) */}
        {!loading && error && (
          <div className="bg-red-950/40 border border-red-800 p-6 rounded-2xl text-center space-y-4">
            <AlertCircle size={40} className="mx-auto text-red-500" />
            <p className="text-red-200 font-medium">{error}</p>
            <button 
              onClick={fetchLibrary}
              className="px-5 py-2 bg-red-900 hover:bg-red-800 rounded-xl font-semibold transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* 3. حالة المكتبة فارغة تماماً */}
        {!loading && !error && mediaItems.length === 0 && (
          <div className="bg-slate-800/40 border border-slate-750 p-12 rounded-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-purple-400">
              <Video size={32} />
            </div>
            <h3 className="text-xl font-bold">مكتبتك نظيفة وجاهزة!</h3>
            <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
              لا توجد مقاطع محفوظة حالياً. توجه إلى تبويب "قص" وارفع أول فيديو لتراه يلمع هنا فوراً!
            </p>
          </div>
        )}

        {/* 4. عرض الكروت عند وجود بيانات */}
        {!loading && !error && mediaItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-800/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl hover:border-purple-500/40 transition-all flex flex-col"
              >
                {/* منطقة المشغل الذكي */}
                <div className="relative aspect-video bg-black flex items-center justify-center group">
                  {playingId === item.id ? (
                    <video 
                      src={item.file_url} 
                      controls 
                      autoPlay 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <>
                      {/* غلاف مؤقت أو أيقونة تدل على النوع */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 space-y-2">
                        {item.type?.includes('audio') ? (
                          <Volume2 size={48} className="text-pink-400 animate-pulse" />
                        ) : (
                          <Video size={48} className="text-purple-400" />
                        )}
                        <span className="text-xs text-slate-500 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                          {item.type?.includes('audio') ? "ملف صوتي" : "مقطع فيديو"}
                        </span>
                      </div>
                      
                      {/* زر التشغيل الكبير */}
                      <button 
                        onClick={() => setPlayingId(item.id)}
                        className="absolute w-14 h-14 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg transform group-hover:scale-115 transition-all z-10"
                      >
                        <Play size={24} className="fill-current ml-1" />
                      </button>
                    </>
                  )}
                </div>

                {/* التفاصيل والتحكم بالأسفل */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-100 line-clamp-1 text-right" dir="auto">
                      {item.title || "مقطع بدون عنوان"}
                    </h4>
                    <p className="text-xs text-slate-400 text-right mt-1">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-SA') : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-750">
                    <button
                      onClick={() => handleDelete(item.id, item.file_url)}
                      className="text-red-400 hover:text-red-500 p-2 hover:bg-red-950/30 rounded-xl transition-all flex items-center space-x-1 space-x-reverse"
                    >
                      <Trash2 size={16} />
                      <span className="text-xs">حذف</span>
                    </button>
                    
                    <a 
                      href={item.file_url} 
                      download 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-purple-400 hover:underline"
                    >
                      رابط الملف الاصلي 🔗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
