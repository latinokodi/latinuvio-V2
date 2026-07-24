/**
 * Shared OkRu resolver (ok.ru video embeds).
 *
 * Used by: doramasflix, vimeus
 *
 * Strategy:
 *   1. Fetch embed page with ok.ru referer
 *   2. Check for restrictions (copyright, notFound, etc.)
 *   3. Parse escaped JSON → extract video URLs with quality
 *   4. Sort by quality: full > hd > sd > low > lowest
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const { fetchWithTimeout, EMBED_TIMEOUT } = require("../utils/fetch_helpers");

const QUALITY_ORDER = ["full", "hd", "sd", "low", "lowest"];
const QUALITY_MAP = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };

async function resolveOkru(embedUrl) {
    try {
        console.log(`[OkRu] Resolving: ${embedUrl}`);

        const r = await fetchWithTimeout(embedUrl, {
            headers: { "User-Agent": UA, "Referer": "https://ok.ru/" }
        }, EMBED_TIMEOUT);
        if (!r.ok) { console.log(`[OkRu] HTTP ${r.status}`); return null; }
        const raw = await r.text();

        // Check for restrictions
        if (raw.includes("copyrightsRestricted") || raw.includes("COPYRIGHTS_RESTRICTED")
            || raw.includes("LIMITED_ACCESS") || raw.includes("notFound")
            || !raw.includes("urls")) {
            console.log("[OkRu] Video unavailable or restricted");
            return null;
        }

        // Parse escaped JSON
        const data = raw.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "");
        const matches = [...data.matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)];

        const videos = matches
            .map(m => ({ type: m[1], url: m[2] }))
            .filter(v => !v.type.toLowerCase().includes("mobile") && v.url.startsWith("http"));

        if (!videos.length) {
            console.log("[OkRu] No playable URLs found");
            return null;
        }

        // Sort by quality
        const sorted = videos.sort((a, b) => {
            const ai = QUALITY_ORDER.findIndex(q => a.type.toLowerCase().includes(q));
            const bi = QUALITY_ORDER.findIndex(q => b.type.toLowerCase().includes(q));
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }, EMBED_TIMEOUT);

        const best = sorted[0];
        const quality = QUALITY_MAP[best.type.toLowerCase()] || best.type;

        console.log(`[OkRu] Best: ${best.type} (${quality}) → ${best.url.substring(0, 80)}...`);
        return {
            url: best.url,
            server: "OkRu",
            quality,
            headers: { "User-Agent": UA, Referer: "https://ok.ru/", Origin: "https://ok.ru" }
        };
    } catch (err) {
        console.log(`[OkRu] Error: ${err.message}`);
        return null;
    }
}

module.exports = { resolveOkru };
