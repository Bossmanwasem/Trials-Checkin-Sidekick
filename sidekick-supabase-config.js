// Public Supabase settings used by the background worker to send audit logs.
// Never put a service role or secret key in this file.
self.SidekickSupabaseConfig = {
  projectUrl: "https://YOUR-PROJECT-REF.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
  auditFunctionName: "sidekick-audit-log",
  adminFunctionName: "sidekick-admin-tools"
};
