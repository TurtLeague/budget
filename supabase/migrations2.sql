-- Add avatar_url to profiles
alter table profiles add column if not exists avatar_url text;

-- Storage bucket for avatars must be created manually in Supabase Dashboard:
-- Storage → New bucket → name: "avatars" → toggle ON "Public bucket" → Save
