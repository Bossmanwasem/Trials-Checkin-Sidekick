# Sidekick Permissions And Supabase Audit Logging

CRM Sidekick has a role, Supabase Auth, admin tools, and audit layer loaded by `panel-shell.html`.

## Roles

- `Device Coordinator`: default for every user. This role has `["*"]`, which means every current Sidekick tool is allowed.
- `Trials Preprep`: reserved for the future Trials Preprep workflow. Its tool list is intentionally empty until that separate tool set is designed.
- `Sidekick Admin`: admin tools plus every current Sidekick tool.

The current Sidekick role is stored in Chrome local storage at `ttmtSidekickUserRole`. Supabase session tokens are stored locally so the extension can stay signed in. Audit logs are not stored locally.

## Tool Permissions

Tool permissions live in `sidekick-access.js` in the `SIDEKICK_TOOLS` registry and `SIDEKICK_ROLES` catalog. To add future Trials Preprep permissions, add the new tool id to `SIDEKICK_TOOLS`, then list that id in the `trialsPreprep.tools` array.

## Supabase Auth Onboarding

The onboarding form now includes Supabase email, password, and an optional admin onboarding key. The admin key is never stored in the extension. It is sent to the `sidekick-admin-tools` Edge Function, which compares it to the server-side `SIDEKICK_ADMIN_ONBOARDING_KEY` secret and updates the user's Supabase Auth `app_metadata`.

Required Edge Function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SIDEKICK_ADMIN_ONBOARDING_KEY`
- `SIDEKICK_EXTENSION_ID`

`sidekick-supabase-config.js` needs the public Supabase project URL, anon key, `sidekick-audit-log`, and `sidekick-admin-tools` function names.

### Registering The First Admin

1. Create a strong value for the `SIDEKICK_ADMIN_ONBOARDING_KEY` Edge Function secret.
2. Deploy the `sidekick-admin-tools` function after the secret is set.
3. Open Sidekick onboarding, enter your Supabase email and password, and paste the admin onboarding key into the optional admin key field.
4. Click `Connect Supabase`. The Edge Function signs the account profile as `Sidekick Admin` in Supabase Auth `app_metadata`.
5. After the first admin exists, that admin can open the Admin suite in Sidekick and promote or demote other users.

The admin onboarding key should only be used for bootstrap or break-glass recovery. Routine role changes should happen from the Admin suite.

## Supabase Audit Logs

Sidekick records user clicks, form submits, field changes, Chrome API actions, permission denials, warnings, errors, and unhandled promise rejections. The background worker sends each record to the Supabase Edge Function `sidekick-audit-log`.

No audit records are written to Chrome local storage, IndexedDB, or a connected Logs folder. If Supabase delivery fails, the event is not persisted locally.

Configure `sidekick-supabase-config.js` with the project URL and anon key. Do not put service role or secret keys in the extension.

Deploy the migration in `supabase/migrations/20260513224000_create_sidekick_audit_logs.sql`, then deploy `supabase/functions/sidekick-audit-log`. The function uses `SUPABASE_SERVICE_ROLE_KEY` server-side to insert into `public.sidekick_audit_logs`.

`supabase/config.toml` sets `verify_jwt = false` for the audit ingestion function so the extension can reach the handler and the handler can manage CORS, payload validation, and origin checks. Store the live extension id as the `SIDEKICK_EXTENSION_ID` Edge Function secret before production deployment.

The admin function keeps `verify_jwt = true`; Supabase verifies the signed-in user token before the function checks the user's admin app metadata.

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

The Admin suite can list users, update user roles, and view recent audit logs through the `sidekick-admin-tools` Edge Function. Admins keep full access to all regular Sidekick tools.
