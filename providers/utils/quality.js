/**
 * M3U8 Quality Detection — replaces blind "1080p" labels with real resolution.
 *
 * Usage:
 *   const quality = await detectQuality(streamUrl, headers);
 *   // Returns "4K", "1440p", "1080p", "720p", "480p", "360p", or null
 *
 * Strategy:
 *   1. Quick metadata check from the resolved page (fast path)
 *   2. Fetch first bytes of the m3u8 playlist (3s timeout)
 *   3. Parse RESOLUTION= tags from the HLS manifest
 */

const { fetchWithTimeout } = require("./fetch_helpers");

const M3U8_TIMEOUT = 3000; // 3s — quick head fetch

// ─── Resolution → label mapping ──────────────────────────────────────────────

function resolutionToQuality(width) {
    if (width >= 3840) return "4K";
    if (width >= 2560) return "1440p";
    if (width >= 1920) return "1080p";
    if (width >= 1280) return "720p";
    if (width >= 854)  return "480p";
    if (width >= 640)  return "360p";
    return null;
}

// ─── Parse from text ─────────────────────────────────────────────────────────

function checkQualityFromText(text) {
    if (!text || !text.startsWith("#EXTM3U")) return null;

    // Capture the highest RESOLUTION= found
    let bestWidth = 0;
    const re = /RESOLUTION=(\d+)x(\d+)/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
        const w = parseInt(m[1], 10);
        if (w > bestWidth) bestWidth = w;
    }

    // Also check bandwidth tiers as fallback
    if (bestWidth === 0) {
        let bestBandwidth = 0;
        const bwRe = /BANDWIDTH=(\d+)/gi;
        while ((m = bwRe.exec(text)) !== null) {
            const bw = parseInt(m[1], 10);
            if (bw > bestBandwidth) bestBandwidth = bw;
        }
        // Rough bandwidth → resolution mapping
        if (bestBandwidth > 12_000_000) bestWidth = 3840;  // ~4K
        else if (bestBandwidth > 6_000_000) bestWidth = 1920;  // ~1080p
        else if (bestBandwidth > 2_500_000) bestWidth = 1280;  // ~720p
        else if (bestBandwidth > 1_000_000) bestWidth = 854;   // ~480p
        else if (bestBandwidth > 0) bestWidth = 640;          // ~360p
    }

    return bestWidth > 0 ? resolutionToQuality(bestWidth) : null;
}

// ─── Fetch + parse (main entry point) ────────────────────────────────────────

async function detectQuality(m3u8Url, headers = {}) {
    if (!m3u8Url) return null;

    // Only probe .m3u8 URLs — skip .mp4
    if (!/\.m3u8/i.test(m3u8Url)) return null;

    try {
        const resp = await fetchWithTimeout(m3u8Url, {
            headers: {
                ...headers,
                "Accept": "*/*",
            }
        }, M3U8_TIMEOUT);

        if (!resp.ok) return null;

        const text = await resp.text();
        return checkQualityFromText(text);
    } catch (_) {
        // Timeout or network error — can't determine quality
        return null;
    }
}

// ─── Quick check from embed page metadata ─────────────────────────────────────

function checkQualityFromMetadata(embedHtml, serverName) {
    // Some embed pages leave quality hints in the page
    if (!embedHtml) return null;

    // Try to find quality in <title> or labels near the video
    const qualityMatch = embedHtml.match(/(?:quality|calidad|resoluci[oó]n)[:\s]*(\d{3,4}p|4k|hd|full\s*hd)/i);
    if (qualityMatch) {
        const label = qualityMatch[1].toLowerCase();
        if (label === "4k" || label === "2160p") return "4K";
        if (label === "1080p" || label === "full hd" || label === "fhd") return "1080p";
        if (label === "720p" || label === "hd") return "720p";
        if (label === "480p" || label === "sd") return "480p";
        if (label === "360p") return "360p";
    }

    return null;
}

module.exports = {
    detectQuality,
    checkQualityFromText,
    checkQualityFromMetadata,
    resolutionToQuality,
};
