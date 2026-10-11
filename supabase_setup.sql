-- ملفات المستخدمين
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'مستخدم',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

-- إنشاء الملف تلقائياً عند التسجيل
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ربط القفشات بصاحبها
alter table public.clips add column if not exists user_id uuid references auth.users(id) on delete cascade;

drop policy if exists "public insert clips" on public.clips;
drop policy if exists "insert own clips" on public.clips;
create policy "insert own clips" on public.clips for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own clips" on public.clips;
create policy "delete own clips" on public.clips for delete to authenticated using (auth.uid() = user_id);

-- التخزين: القراءة للجميع، الرفع والحذف فقط داخل مجلدك
drop policy if exists "public upload media" on storage.objects;
drop policy if exists "public update media" on storage.objects;
drop policy if exists "upload own folder" on storage.objects;
create policy "upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('images','audios','videos') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own files" on storage.objects;
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('images','audios','videos') and (storage.foldername(name))[1] = auth.uid()::text);
