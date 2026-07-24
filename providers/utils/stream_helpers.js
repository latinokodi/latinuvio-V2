/**
 * Shared stream helpers for anime providers.
 * Extracted from animeav1 / tioanime / henaojara / lacartoons.
 *
 * Uses the pattern-array approach from Pigamer37/animeflv-stremio-addon.
 */

// ─── URL normalization ───────────────────────────────────────────────────────

function normalizeExtractedUrl(value) {
    if (!value || typeof value !== "string") return null;
    return value
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&")
        .replace(/%3A/gi, ":")
        .replace(/%2F/gi, "/")
        .replace(/%3F/gi, "?")
        .replace(/%3D/gi, "=")
        .trim();
}

// ─── Pattern-array extraction ────────────────────────────────────────────────

/**
 * Try each regex pattern in order, return the first match.
 * Much cleaner than nested if/else chains.
 */
function findFirstUrl(payload, patterns) {
    if (!payload || typeof payload !== "string") return null;
    for (const pattern of patterns) {
        try {
            const match = payload.match(pattern);
            if (match && match[1]) {
                const c = normalizeExtractedUrl(match[1]);
                if (c) return c;
            }
        } catch (_e) { /* skip invalid patterns */ }
    }
    return null;
}

// ─── Video URL validation ────────────────────────────────────────────────────

const EXCLUDE_PATTERNS = [
    "cloudflareinsights", "google-analytics", "googletagmanager",
    "facebook.net", "beacon.min.js", ".js?", "analytics", "pixel",
    "bigbuckbunny", "test-videos", "sample-video", "placeholder"
];

/**
 * Reject analytics/tracking URLs, accept only actual video URLs.
 */
function isLikelyVideoUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    for (const p of EXCLUDE_PATTERNS) {
        if (lower.includes(p)) return false;
    }
    return /\.(mp4|m3u8)$/i.test(url)
        || lower.includes("video")
        || lower.includes("stream")
        || lower.includes(".mp4")
        || lower.includes(".m3u8");
}

// ─── Server name normalization ───────────────────────────────────────────────

const SERVER_DISPLAY_NAMES = {
    "bysesukior": "Filemoon",
    "movearnpre": "Vidhide",
    "dhcplay": "StreamWish",
    "luluvdo": "Lulustream",
    "listeamed": "Vidguard",
    "rpmvip": "RPMshare",
    "pdrain": "PDrain",
    "hls": "HLS",
};

function getServerTitle(serverDomain) {
    if (!serverDomain) return "Unknown";
    const clean = String(serverDomain)
        .replace(/https?:\/\//i, "")
        .replace(/\/.*$/, "");
    // Check explicit mappings first
    for (const [key, name] of Object.entries(SERVER_DISPLAY_NAMES)) {
        if (clean.toLowerCase().includes(key.toLowerCase())) return name;
    }
    // Fallback: strip TLD, capitalize
    return clean
        .replace(/\.(com|net|org|top|to|ac|sx|ps|io|me|cc|tv|live|online|xyz)/gi, "")
        .replace(/^./, c => c.toUpperCase());
}

module.exports = {
    normalizeExtractedUrl,
    findFirstUrl,
    isLikelyVideoUrl,
    getServerTitle,
    SERVER_DISPLAY_NAMES,
};
