create table if not exists public.sidekick_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  source text not null default 'sidekick',
  severity text not null default 'info'
    check (severity in ('debug', 'info', 'warn', 'error')),
  event_type text not null,
  action text,
  view_id text,
  role_id text,
  role_name text,
  profile_label text,
  tool_id text,
  tool_label text,
  extension_version text,
  session_id text,
  user_agent text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  error jsonb
);

alter table public.sidekick_audit_logs enable row level security;

revoke all on table public.sidekick_audit_logs from anon;
revoke all on table public.sidekick_audit_logs from authenticated;

grant select on table public.sidekick_audit_logs to authenticated;
grant select, insert on table public.sidekick_audit_logs to service_role;

drop policy if exists "Sidekick admins can read audit logs" on public.sidekick_audit_logs;
create policy "Sidekick admins can read audit logs"
on public.sidekick_audit_logs
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'sidekick_role', '') = 'admin'
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'sidekick_admin')
);

create index if not exists sidekick_audit_logs_created_at_idx
  on public.sidekick_audit_logs (created_at desc);

create index if not exists sidekick_audit_logs_event_type_idx
  on public.sidekick_audit_logs (event_type);

create index if not exists sidekick_audit_logs_severity_idx
  on public.sidekick_audit_logs (severity);

create index if not exists sidekick_audit_logs_tool_id_idx
  on public.sidekick_audit_logs (tool_id);

create index if not exists sidekick_audit_logs_metadata_gin_idx
  on public.sidekick_audit_logs using gin (metadata);
