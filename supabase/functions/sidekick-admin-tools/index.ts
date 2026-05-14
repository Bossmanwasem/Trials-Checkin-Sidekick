import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SIDEKICK_ADMIN_ONBOARDING_KEY = Deno.env.get("SIDEKICK_ADMIN_ONBOARDING_KEY") || "";
const SIDEKICK_EXTENSION_ID = Deno.env.get("SIDEKICK_EXTENSION_ID") || "";

const ROLE_DEFINITIONS = {
  admin: {
    sidekick_role: "admin",
    sidekick_role_name: "Sidekick Admin",
    sidekick_tools: ["*"],
    sidekick_admin: true
  },
  deviceCoordinator: {
    sidekick_role: "deviceCoordinator",
    sidekick_role_name: "Device Coordinator",
    sidekick_tools: ["*"],
    sidekick_admin: false
  },
  trialsPreprep: {
    sidekick_role: "trialsPreprep",
    sidekick_role_name: "Trials Preprep",
    sidekick_tools: [],
    sidekick_admin: false
  }
} as const;

type RoleId = keyof typeof ROLE_DEFINITIONS;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = SIDEKICK_EXTENSION_ID
    ? `chrome-extension://${SIDEKICK_EXTENSION_ID}`
    : origin;

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json"
    }
  });
}

function trimString(value: unknown, maxLength = 500) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function normalizeRoleId(value: unknown): RoleId {
  const compact = trimString(value, 80).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "admin" || compact === "sidekickadmin") return "admin";
  if (compact === "trialspreprep") return "trialsPreprep";
  return "deviceCoordinator";
}

function getSidekickRole(user: { app_metadata?: Record<string, unknown> } | null): RoleId {
  return normalizeRoleId(user?.app_metadata?.sidekick_role);
}

function isAdmin(user: { app_metadata?: Record<string, unknown> } | null) {
  return getSidekickRole(user) === "admin" || user?.app_metadata?.sidekick_admin === true;
}

function sanitizeUser(user: {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, unknown>;
}) {
  return {
    id: user.id,
    email: user.email || "",
    created_at: user.created_at || "",
    last_sign_in_at: user.last_sign_in_at || "",
    app_metadata: user.app_metadata || {}
  };
}

async function getCallerUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) throw httpError(401, "Missing Supabase access token.");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw httpError(500, "Sidekick admin tools are not configured.");
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw httpError(401, "Invalid Supabase session.");
  return data.user;
}

async function updateUserRole(userId: string, roleId: RoleId) {
  const { data: existing, error: fetchError } = await adminClient.auth.admin.getUserById(userId);
  if (fetchError || !existing.user) {
    throw httpError(404, fetchError?.message || "User not found.");
  }

  const appMetadata = {
    ...(existing.user.app_metadata || {}),
    ...ROLE_DEFINITIONS[roleId]
  };

  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata
  });
  if (error || !data.user) {
    throw httpError(500, error?.message || "Unable to update user role.");
  }
  return sanitizeUser(data.user);
}

function requireAdmin(user: { app_metadata?: Record<string, unknown> } | null) {
  if (!isAdmin(user)) {
    throw httpError(403, "Admin access is required.");
  }
}

async function ensureProfile(user: { id: string; app_metadata?: Record<string, unknown> }, body: Record<string, unknown>) {
  const requestedAdminKey = trimString(body.adminKey, 200);
  if (requestedAdminKey) {
    if (!SIDEKICK_ADMIN_ONBOARDING_KEY) {
      throw httpError(500, "Admin onboarding key is not configured.");
    }
    if (!safeEqual(requestedAdminKey, SIDEKICK_ADMIN_ONBOARDING_KEY)) {
      throw httpError(403, "Admin onboarding key is not valid.");
    }
    const updatedUser = await updateUserRole(user.id, "admin");
    return {
      ok: true,
      role: "admin",
      user: updatedUser
    };
  }

  const existingRole = user.app_metadata?.sidekick_role ? getSidekickRole(user) : null;
  if (existingRole) {
    return {
      ok: true,
      role: existingRole,
      user: sanitizeUser(user)
    };
  }

  const updatedUser = await updateUserRole(user.id, "deviceCoordinator");
  return {
    ok: true,
    role: "deviceCoordinator",
    user: updatedUser
  };
}

async function listUsers(body: Record<string, unknown>) {
  const page = Math.max(1, Number(body.page || 1));
  const perPage = Math.min(100, Math.max(1, Number(body.perPage || 50)));
  const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
  if (error) throw httpError(500, error.message);
  return {
    ok: true,
    users: (data.users || []).map(sanitizeUser)
  };
}

async function getAuditLogs(body: Record<string, unknown>) {
  const limit = Math.min(100, Math.max(1, Number(body.limit || 50)));
  const severity = trimString(body.severity, 16).toLowerCase();

  let query = adminClient
    .from("sidekick_audit_logs")
    .select("id, created_at, severity, event_type, action, profile_label, tool_label, role_name, metadata, error")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (["debug", "info", "warn", "error"].includes(severity)) {
    query = query.eq("severity", severity);
  }

  const { data, error } = await query;
  if (error) throw httpError(500, error.message);
  return {
    ok: true,
    logs: data || []
  };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { ok: false, message: "Method not allowed." });
  }

  const origin = req.headers.get("origin") || "";
  if (SIDEKICK_EXTENSION_ID && origin && origin !== `chrome-extension://${SIDEKICK_EXTENSION_ID}`) {
    return jsonResponse(req, 403, { ok: false, message: "Origin is not allowed." });
  }

  try {
    const caller = await getCallerUser(req);
    const body = await req.json().catch(() => ({}));
    const action = trimString(body.action, 80);

    if (action === "ensure-profile") {
      return jsonResponse(req, 200, await ensureProfile(caller, body));
    }

    if (action === "claim-admin") {
      return jsonResponse(req, 200, await ensureProfile(caller, body));
    }

    requireAdmin(caller);

    if (action === "list-users") {
      return jsonResponse(req, 200, await listUsers(body));
    }

    if (action === "update-user-role") {
      const userId = trimString(body.userId, 120);
      if (!userId) throw httpError(400, "userId is required.");
      const roleId = normalizeRoleId(body.roleId);
      const user = await updateUserRole(userId, roleId);
      return jsonResponse(req, 200, { ok: true, role: roleId, user });
    }

    if (action === "get-audit-logs") {
      return jsonResponse(req, 200, await getAuditLogs(body));
    }

    throw httpError(400, "Unknown admin action.");
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500);
    return jsonResponse(req, status, {
      ok: false,
      message: error instanceof Error ? error.message : "Sidekick admin request failed."
    });
  }
});
