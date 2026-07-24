/**
 * Shared Filemoon resolver (filemoon, moonembed, fmoon, etc.)
 *
 * Used by: doramasflix, cinemitas, vimeus
 *
 * Strategy:
 *   1. Unpack eval → m3u8 extraction
 *   2. Direct m3u8 from HTML
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

async function resolveFilemoon(embedUrl) {
    try {
        console.log(`[Filemoon] Resolving: ${embedUrl}`);
        const origin = new URL(embedUrl).origin;

        const r = await fetchWithTimeout(embedUrl, {
            headers: { "User-Agent": UA, "Referer": origin + "/" }
        }, EMBED_TIMEOUT);
        if (!r.ok) { console.log(`[Filemoon] HTTP ${r.status}`); return null; }
        const html = await r.text();

        // Method 1: Packed eval → m3u8
        const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (evalMatch) {
            const argsMatch = evalMatch[0].match(/'([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
            if (argsMatch) {
                const unpacked = unpackEval(argsMatch[1], parseInt(argsMatch[2]), argsMatch[4].split("|"));
                const m3u8 = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m3u8) {
                    console.log(`[Filemoon] Packed → ${m3u8[0].substring(0, 80)}...`);
                    return { url: m3u8[0], server: "Filemoon", quality: "1080p", headers: { "User-Agent": UA, Referer: embedUrl, Origin: origin } };
                }
            }
        }

        // Method 2: Direct m3u8
        const m3u8 = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3u8) {
            return { url: m3u8[0], server: "Filemoon", quality: "720p", headers: { "User-Agent": UA, Referer: embedUrl } };
        }

        return null;
    } catch (err) {
        console.log(`[Filemoon] Error: ${err.message}`);
        return null;
    }
}

module.exports = { resolveFilemoon };
