# Sidekick Permissions And Supabase Audit Logging

CRM Sidekick has a role and audit layer loaded by `panel-shell.html`.

## Roles

- `Device Coordinator`: default for every user. This role has `["*"]`, which means every current Sidekick tool is allowed.
- `Trials Preprep`: reserved for the future Trials Preprep workflow. Its tool list is intentionally empty until that separate tool set is designed.

The current Sidekick role is stored in Chrome local storage at `ttmtSidekickUserRole`. Audit logs are not stored locally.

## Tool Permissions

Tool permissions live in `sidekick-access.js` in the `SIDEKICK_TOOLS` registry and `SIDEKICK_ROLES` catalog. To add future Trials Preprep permissions, add the new tool id to `SIDEKICK_TOOLS`, then list that id in the `trialsPreprep.tools` array.

## Supabase Audit Logs

Sidekick records user clicks, form submits, field changes, Chrome API actions, permission denials, warnings, errors, and unhandled promise rejections. The background worker sends each record to the Supabase Edge Function `sidekick-audit-log`.

No audit records are written to Chrome local storage, IndexedDB, or a connected Logs folder. If Supabase delivery fails, the event is not persisted locally.

Configure `sidekick-supabase-config.js` with the project URL and anon key. Do not put service role or secret keys in the extension.

Deploy the migration in `supabase/migrations/20260513224000_create_sidekick_audit_logs.sql`, then deploy `supabase/functions/sidekick-audit-log`. The function uses `SUPABASE_SERVICE_ROLE_KEY` server-side to insert into `public.sidekick_audit_logs`.

`supabase/config.toml` sets `verify_jwt = false` for the audit ingestion function so the extension can reach the handler and the handler can manage CORS, payload validation, and origin checks. Store the live extension id as the `SIDEKICK_EXTENSION_ID` Edge Function secret before production deployment.

Admins can query logs when their Supabase Auth `app_metadata` includes either:

- `"sidekick_role": "admin"`
- `"role": "admin"` or `"role": "sidekick_admin"`

Example audit query:

```sql
select created_at, severity, event_type, action, profile_label, tool_label, metadata, error
from public.sidekick_audit_logs
where created_at >= now() - interval '7 days'
order by created_at desc;
```
