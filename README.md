# Trials Check-in Sidekick

Trials Check-in Sidekick is a lightweight browser extension that streamlines participant check-ins and session tracking. It focuses on fast, reliable workflows for coordinators without exposing internal URLs or system links.

## Key Features

- **Fast check-in workflow**: Capture attendance quickly with a clear, focused interface.
- **Session awareness**: Keep track of active sessions and participant status at a glance.
- **Validation safeguards**: Prevent incomplete submissions with basic input checks and prompts.
- **In-context panel**: Operate from a dedicated side panel while staying on the current page.
- **Lightweight and responsive**: Minimal footprint for smooth performance.

## Core Functions

- **Open side panel** to manage check-ins without navigating away.
- **Record participant status** with a consistent, repeatable flow.
- **Review session details** to confirm timing and status before submitting.
- **Update entries** when participant information changes.

## Who It’s For

- Trial coordinators and staff who need a streamlined, reliable check-in tool.
- Teams that want a simple workflow with minimal distractions.

## Notes

This README intentionally avoids internal system links and implementation-specific URLs.

## Supabase backend setup

This extension uses Supabase for email/password authentication, role-aware profiles, and troubleshooting logs.

### Project configuration

- Supabase URL: `https://drkzeyxechabszuqqdkf.supabase.co`
- Browser key: configured in `panel.js` as the Supabase publishable/anon key.
- Extension host permission: `https://drkzeyxechabszuqqdkf.supabase.co/*` is listed in `manifest.json` so the side panel can call Supabase Auth and REST endpoints.

### Required Supabase dashboard settings

1. In Supabase, enable **Authentication → Providers → Email**.
2. Leave signup open if anyone with the extension should be able to create an account.
3. If email confirmations are enabled, new users will need to confirm their email before signing in.
4. Run the migration in `supabase/migrations/20260514000000_supabase_auth_profiles_logs.sql` from the Supabase SQL editor or your Supabase CLI workflow.

### Roles

Profiles support these roles:

- `admin`
- `coordinator`
- `preprep`

New signups default to `coordinator`. Coordinators currently see the existing Sidekick tools. Admin and Preprep-specific workspaces can be layered in later without changing the auth foundation.

### Data stored in Supabase

- `profiles`: one row per authenticated user with email, display name, and role.
- `extension_logs`: click, view, auth, and workflow troubleshooting events for the extension.

Row Level Security is enabled so users can select their own profile/logs, admins can see all profiles/logs, users can insert their own logs, and only admins can delete records.

### Troubleshooting profile schema cache errors

If login shows an error like `Could not find the 'full_name' column of 'profiles' in the schema cache`, run `supabase/migrations/20260514001000_repair_profiles_full_name.sql` in the Supabase SQL editor. The extension no longer requires `full_name` to complete login, but the repair migration adds the optional display-name column for existing projects and asks PostgREST to reload its schema cache.
