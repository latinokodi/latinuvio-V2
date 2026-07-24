/**
 * Shared VidHide resolver (vidhide, minochinos, dintezuvio, vidhidepro, etc.)
 *
 * Used by: doramasflix, cinemitas, vimeus
 *
 * Strategy:
 *   1. Unpack eval → hls4/hls2/hls extraction
 *   2. Direct m3u8 fallback
 *   3. sources: [{file: "..."}] fallback
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const { fetchWithTimeout, EMBED_TIMEOUT } = require("../utils/fetch_helpers");

// ─── Unpack eval ─────────────────────────────────────────────────────────────

function unpackEval(payload, radix, symtab) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return payload.replace(/\b([0-9a-zA-Z]+)\b/g, match => {
        let result = 0;
        for (let i = 0; i < match.length; i++) {
            const pos = chars.indexOf(match[i]);
            if (pos === -1) return match;
            result = result * radix + pos;
        }
        if (isNaN(result) || result >= symtab.length) return match;
        return symtab[result] && symtab[result] !== "" ? symtab[result] : match;
    }, EMBED_TIMEOUT);
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

async function resolveVidhide(embedUrl) {
    try {
        console.log(`[VidHide] Resolving: ${embedUrl}`);
        const origin = new URL(embedUrl).origin;

        const r = await fetchWithTimeout(embedUrl, {
            headers: { "User-Agent": UA, "Referer": origin + "/" }
        }, EMBED_TIMEOUT);
        if (!r.ok) { console.log(`[VidHide] HTTP ${r.status}`); return null; }
        const html = await r.text();

        // Method 1: Packed eval → hls4/hls2/hls
        const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (evalMatch) {
            // Extract args from the eval
            const argsMatch = evalMatch[0].match(/'([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
            if (argsMatch) {
                const unpacked = unpackEval(argsMatch[1], parseInt(argsMatch[2]), argsMatch[4].split("|"));
                const hls4 = unpacked.match(/"hls4"\s*:\s*"([^"]+)"/);
                const hls2 = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
                const hls  = unpacked.match(/"hls"\s*:\s*"([^"]+)"/);
                const m3u8Relative = (hls4 || hls2 || hls)?.[1];
                if (m3u8Relative) {
                    let url = m3u8Relative;
                    if (!url.startsWith("http")) url = origin + url;
                    console.log(`[VidHide] Unpacked → ${url.substring(0, 80)}...`);
                    return { url, server: "VidHide", quality: "720p", headers: { "User-Agent": UA, Referer: origin + "/", Origin: origin } };
                }
            }
        }

        // Method 2: Direct m3u8 fallback
        const directM3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (directM3u8) {
            return { url: directM3u8[0], server: "VidHide", quality: "720p", headers: { Referer: embedUrl } };
        }

        // Method 3: sources: [{file: "..."}]
        const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
        if (sourcesMatch) {
            return { url: sourcesMatch[1], server: "VidHide", quality: "720p", headers: { Referer: embedUrl } };
        }

        return null;
    } catch (err) {
        console.log(`[VidHide] Error: ${err.message}`);
        return null;
    }
}

module.exports = { resolveVidhide };
