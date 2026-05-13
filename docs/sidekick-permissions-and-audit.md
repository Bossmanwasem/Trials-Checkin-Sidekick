# Sidekick Permissions And Audit Logging

CRM Sidekick now has a small role and audit layer loaded by `panel-shell.html`.

## Roles

- `Device Coordinator`: default for every user. This role has `["*"]`, which means every current Sidekick tool is allowed.
- `Trials Preprep`: reserved for the future Trials Preprep workflow. Its tool list is intentionally empty until that separate tool set is designed.

The current role is stored in Chrome local storage at `ttmtSidekickUserRole`. If no role is saved, Sidekick automatically writes `deviceCoordinator`.

## Tool Permissions

Tool permissions live in `sidekick-access.js` in the `SIDEKICK_TOOLS` registry and `SIDEKICK_ROLES` catalog. To add future Trials Preprep permissions, add the new tool id to `SIDEKICK_TOOLS`, then list that id in the `trialsPreprep.tools` array.

## Audit Logs

Sidekick records user clicks, form submits, field changes, Chrome API actions, permission denials, console warnings, console errors, unhandled errors, and unhandled promise rejections.

Logs are saved to Chrome local storage at `ttmtSidekickAuditLog`. If the user already connected the Sidekick Logs folder, the audit layer also appends JSON lines to `sidekick-audit-YYYY-MM-DD.jsonl` in that folder when write permission is already granted.

Each entry includes timestamp, source, severity, event type, active view, current role, optional tool id, and safe metadata. Text field values are not stored; logs only record whether a field had a value.
