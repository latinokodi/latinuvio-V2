/**
 * Shared StreamWish / HLSWish resolver (streamwish, hlswish, hglink, vibuxer, etc.)
 *
 * Used by: lamovie, doramasflix, cinemitas, vimeus, embed69
 *
 * Strategy:
 *   1. Detect SPA embeds (Vite/React) — skip, requires browser
 *   2. Direct file: match
 *   3. Packed eval → hls4/hls3/hls2 extraction
 *   4. Raw .m3u8 regex fallback
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
    });
}

function unpackPackedEval(text) {
    const m = text.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (!m) return null;
    return unpackEval(m[1], parseInt(m[2]), m[4].split("|"));
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

async function resolveStreamwish(embedUrl) {
    try {
        console.log(`[StreamWish] Resolving: ${embedUrl}`);
        const embedHost = (embedUrl.match(/^(https?:\/\/[^/]+)/) || [])[1] || "https://streamwish.com";

        const r = await fetchWithTimeout(embedUrl, { headers: { "User-Agent": UA, "Referer": embedHost + "/" } }, EMBED_TIMEOUT);
        if (!r.ok) { console.log(`[StreamWish] HTTP ${r.status}`); return null; }
        const html = await r.text();

        // Skip Vite SPA embeds
        if (html.includes('id="root"') && html.includes('__vite_is_modern_browser')) {
            console.log(`[StreamWish] Skipping SPA embed: ${embedUrl}`);
            return null;
        }

        // Method 1: Direct file: "..." match
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (fileMatch) {
            let url = fileMatch[1];
            if (url.startsWith("/")) url = embedHost + url;
            console.log(`[StreamWish] file: match → ${url.substring(0, 80)}...`);
            return { url, server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
        }

        // Method 2: Packed eval → hls4/hls3/hls2 extraction
        const unpacked = unpackPackedEval(html);
        if (unpacked) {
            const objMatch = unpacked.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
            if (objMatch) {
                try {
                    const normalized = objMatch[0].replace(/(\w+)\s*:/g, '"$1":');
                    const obj = JSON.parse(normalized);
                    const url = obj.hls4 || obj.hls3 || obj.hls2;
                    if (url) {
                        const fullUrl = url.startsWith("/") ? embedHost + url : url;
                        console.log(`[StreamWish] Packed hls → ${fullUrl.substring(0, 80)}...`);
                        return { url: fullUrl, server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
                    }
                } catch (_) { /* fall through */ }
            }
            const m3u8InPacked = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
            if (m3u8InPacked) {
                console.log(`[StreamWish] Packed m3u8 → ${m3u8InPacked[0].substring(0, 80)}...`);
                return { url: m3u8InPacked[0], server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
            }
        }

        // Method 3: Raw m3u8 regex
        const rawM3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (rawM3u8) {
            console.log(`[StreamWish] Raw m3u8 → ${rawM3u8[0].substring(0, 80)}...`);
            return { url: rawM3u8[0], server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
        }

        console.log("[StreamWish] No URL found");
        return null;
    } catch (err) {
        console.log(`[StreamWish] Error: ${err.message}`);
        return null;
    }
}

module.exports = { resolveStreamwish, unpackEval, unpackPackedEval };
