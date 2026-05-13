import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SIDEKICK_EXTENSION_ID = Deno.env.get("SIDEKICK_EXTENSION_ID") || "";
const MAX_BODY_BYTES = 64 * 1024;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

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

function safeJson(value: unknown, maxBytes = 24 * 1024) {
  if (value === null || typeof value === "undefined") return null;
  try {
    const text = JSON.stringify(value);
    if (text.length <= maxBytes) return JSON.parse(text);
    return {
      truncated: true,
      originalBytes: text.length
    };
  } catch {
    return {
      value: trimString(value)
    };
  }
}

function normalizeSeverity(value: unknown) {
  const severity = trimString(value, 16).toLowerCase();
  if (["debug", "info", "warn", "error"].includes(severity)) return severity;
  return "info";
}

function getIpAddress(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0]?.trim() || null;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { ok: false, message: "Method not allowed." });
  }

  const origin = req.headers.get("origin") || "";
  if (SIDEKICK_EXTENSION_ID && origin !== `chrome-extension://${SIDEKICK_EXTENSION_ID}`) {
    return jsonResponse(req, 403, { ok: false, message: "Origin is not allowed." });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(req, 500, { ok: false, message: "Audit logging is not configured." });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return jsonResponse(req, 413, { ok: false, message: "Audit log payload is too large." });
  }

  let entry: Record<string, unknown>;
  try {
    entry = JSON.parse(rawBody);
  } catch {
    return jsonResponse(req, 400, { ok: false, message: "Invalid JSON body." });
  }

  const occurredAt = new Date(String(entry.timestamp || Date.now()));
  const eventType = trimString(entry.eventType, 120);
  if (!eventType) {
    return jsonResponse(req, 400, { ok: false, message: "eventType is required." });
  }

  const row = {
    occurred_at: Number.isNaN(occurredAt.getTime()) ? new Date().toISOString() : occurredAt.toISOString(),
    source: trimString(entry.source, 80) || "sidekick",
    severity: normalizeSeverity(entry.severity),
    event_type: eventType,
    action: trimString(entry.action, 500),
    view_id: trimString(entry.viewId, 120),
    role_id: trimString(entry.roleId, 120),
    role_name: trimString(entry.roleName, 180),
    profile_label: trimString(entry.profileLabel, 180),
    tool_id: trimString(entry.toolId, 120),
    tool_label: trimString(entry.toolLabel, 180),
    extension_version: trimString(entry.extensionVersion, 40),
    session_id: trimString(entry.sessionId, 120),
    user_agent: trimString(req.headers.get("user-agent"), 500),
    ip_address: getIpAddress(req),
    metadata: safeJson(entry.metadata) || {},
    error: safeJson(entry.error)
  };

  const { data, error } = await supabase
    .from("sidekick_audit_logs")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return jsonResponse(req, 500, { ok: false, message: error.message });
  }

  return jsonResponse(req, 200, { ok: true, id: data.id });
});
