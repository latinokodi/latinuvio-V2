/**
 * Log Sanitizer — wraps console.log/warn/error to redact secrets.
 *
 * Usage: require("./utils/log_sanitizer") ONCE at the top of any provider.
 * All console output across ALL providers is then sanitized globally.
 * Toggle: set LOG_REDACTION=0 to disable for debugging.
 */

const DISABLED = /^(0|false|no|off)$/i.test(
    String(typeof process !== "undefined" ? process.env.LOG_REDACTION : "").trim()
);

if (DISABLED) {
    module.exports = { installed: false };
} else {
    install();
}

function install() {
    const _log = console.log.bind(console);
    const _warn = console.warn.bind(console);
    const _error = console.error.bind(console);

    console.log = (...args) => _log(...sanitizeArgs(args));
    console.warn = (...args) => _warn(...sanitizeArgs(args));
    console.error = (...args) => _error(...sanitizeArgs(args));
}

// ─── Patterns ────────────────────────────────────────────────────────────────

const API_KEY_PARAM = /([?&](?:api_key|apikey|key|token|access_token|auth|secret|sig|hash))=[^&\s"']+/gi;
const M3U8_URL = /https?:\/\/[^\s"'<>]+\/[\w./-]+\.m3u8[^\s"'<>]*/gi;
const MP4_URL = /https?:\/\/[^\s"'<>]+\/[\w./-]+\.mp4[^\s"'<>?]*(\?[^\s"'<>]*)?/gi;
const SENSITIVE_HEADER = /\b(Cookie|Set-Cookie|Authorization)\s*:\s*[^\n]+/gi;
const COOKIE_VALUE = /\b(cf_clearance|PHPSESSID|session|token|auth|key|secret)\s*=\s*([^;\s]+)/gi;
const HTML_BLOCK = /<html\b[\s\S]*?<\/html>/gi;

function sanitizeUrl(raw) {
    if (typeof raw !== "string") return raw;
    return raw
        .replace(API_KEY_PARAM, "$1=[redacted]")
        .replace(M3U8_URL, "[redacted-m3u8]")
        .replace(MP4_URL, "[redacted-mp4]");
}

function sanitizeText(value) {
    if (typeof value !== "string") return value;
    return value
        .replace(HTML_BLOCK, "[redacted-html]")
        .replace(SENSITIVE_HEADER, "$1: [redacted]")
        .replace(COOKIE_VALUE, "$1=[redacted]")
        .replace(API_KEY_PARAM, "$1=[redacted]")
        .replace(M3U8_URL, "[redacted-m3u8]")
        .replace(MP4_URL, "[redacted-mp4]");
}

function sanitizeValue(value) {
    if (typeof value === "string") return sanitizeText(value);
    if (value instanceof Error) {
        const e = new Error(sanitizeText(value.message));
        e.name = value.name;
        if (value.stack) e.stack = sanitizeText(value.stack);
        return e;
    }
    if (value && typeof value === "object") {
        try { return JSON.parse(sanitizeText(JSON.stringify(value))); }
        catch (_) { return sanitizeText(String(value)); }
    }
    return value;
}

function sanitizeArgs(args) {
    return Array.from(args, sanitizeValue);
}

// Re-export for explicit use
const sanitizeLogArgs = sanitizeArgs;
const sanitizeLogValue = sanitizeValue;

module.exports = {
    installed: true,
    sanitizeUrl,
    sanitizeText,
    sanitizeValue,
    sanitizeArgs: sanitizeLogArgs,
    sanitizeLogValue,
};
