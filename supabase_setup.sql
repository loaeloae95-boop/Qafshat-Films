-- شغّل هذا الملف كامل من لوحة Supabase: SQL Editor → New query → الصق والصق Run
-- يسوي: (1) جدول clips لحفظ القفشات المصدَّرة من الاستوديو، (2) صلاحيات
-- الرفع/القراءة لمخازن التخزين الثلاثة اللي أنشأتها (images / audios / videos).

-- =========================================================
-- 1) جدول القفشات (clips) — هذا اللي يخلي "مكتبتي" تعرض شي حقيقي
-- =========================================================
create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default 'أنا',
  media_url text not null,
  media_type text not null check (media_type in ('audio', 'video')),
  duration_seconds numeric,
  category text not null default 'مرفوعاتي',
  created_at timestamptz not null default now()
);

alter table public.clips enable row level security;

-- بما إن التطبيق حالياً بدون تسجيل دخول حقيقي، نسمح بالقراءة والإضافة للجميع.
-- إذا فعّلت لاحقاً تسجيل الدخول، بدّل "true" بشرط يربط الصف بـ auth.uid().
drop policy if exists "public read clips" on public.clips;
create policy "public read clips"
  on public.clips for select
  using (true);

drop policy if exists "public insert clips" on public.clips;
create policy "public insert clips"
  on public.clips for insert
  with check (true);

-- =========================================================
-- 2) صلاحيات مخازن التخزين (Storage) — بدونها أي رفع يفشل بخطأ RLS
--    حتى لو الكود بالواجهة صحيح 100%، لأن البكتات عندك "Policies: 0"
-- =========================================================
drop policy if exists "public read media" on storage.objects;
create policy "public read media"
  on storage.objects for select
  using (bucket_id in ('images', 'audios', 'videos'));

drop policy if exists "public upload media" on storage.objects;
create policy "public upload media"
  on storage.objects for insert
  with check (bucket_id in ('images', 'audios', 'videos'));

-- (اختياري) تسمح بالاستبدال (upsert) على نفس المسار بدل ما يفشل لو الاسم مكرر
drop policy if exists "public update media" on storage.objects;
create policy "public update media"
  on storage.objects for update
  using (bucket_id in ('images', 'audios', 'videos'));
