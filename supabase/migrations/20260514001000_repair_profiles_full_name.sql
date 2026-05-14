-- Repair migration for projects where public.profiles already existed before the
-- initial Sidekick migration. `create table if not exists` does not add missing
-- columns, so add the optional display-name column explicitly.

alter table public.profiles
  add column if not exists full_name text;

notify pgrst, 'reload schema';
