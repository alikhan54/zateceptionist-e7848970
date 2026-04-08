/**
 * 420 System - Frontend response sanitizer
 * Defense-in-depth: scrubs internal URLs, JWTs, IPs, and REST paths from
 * any text we are about to render in the OMEGA chat or speak via TTS.
 *
 * The primary fix lives in the LangGraph backend (security/error_sanitizer.py).
 * This file exists so that if anything ever slips past Layer 1 in the future,
 * we still don't expose Supabase URLs, internal hostnames, or credentials
 * to a tenant. It must NEVER raise.
 */

const REDACT: [RegExp, string][] = [
  [/https?:\/\/[a-z0-9]+\.supabase\.co[^\s'"]*/g, "[internal-db]"],
  [/https?:\/\/[^\s'"]*\.zatesystems\.com[^\s'"]*/g, "[internal-service]"],
  [/host\.docker\.internal[^\s'"]*/g, "[internal-host]"],
  [/localhost:\d+[^\s'"]*/g, "[internal-host]"],
  [/sk-[A-Za-z0-9_-]{20,}/g, "[redacted-key]"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]"],
  [/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[ip]"],
  [/\/rest\/v1\/[a-zA-Z0-9_]+/g, "/rest/v1/[table]"],
];

export function sanitizeResponse(text: string): string {
  if (typeof text !== "string") {
    try {
      text = String(text);
    } catch {
      return "[unprintable]";
    }
  }
  let out = text;
  for (const [pattern, replacement] of REDACT) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
