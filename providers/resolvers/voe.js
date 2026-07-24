/**
 * Shared VOE resolver (voe.sx, voe-sx, marissashare, cloudwindow).
 *
 * Used by: lamovie, doramasflix, cinemitas, vimeus, embed69
 *
 * Strategy:
 *   1. Handle permanentToken redirects
 *   2. Extract encoded array + loader script
 *   3. Decode via ROT13 → noise filter → base64 → shift(-3) → reverse → base64 → JSON
 *   4. Fallback: regex mp4/hls patterns + base64 decode
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const { fetchWithTimeout, EMBED_TIMEOUT } = require("../utils/fetch_helpers");

// ─── Base64 (cross-runtime) ─────────────────────────────────────────────────

function b64decode(str) {
    try {
        if (typeof atob === "function") return atob(str);
        if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
        return null;
    } catch (_) {
        return null;
    }
}

// ─── VOE Decoder ─────────────────────────────────────────────────────────────

function voeDecode(ct, luts) {
    try {
        const rawLuts = luts.replace(/^\[|\]$/g, "").split("','").map(s => s.replace(/^'+|'+$/g, ""));
        const escapedLuts = rawLuts.map(i => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        let txt = "";
        for (let ci = 0; ci < ct.length; ci++) {
            let x = ct.charCodeAt(ci);
            if (x > 64 && x < 91) x = (x - 52) % 26 + 65;
            else if (x > 96 && x < 123) x = (x - 84) % 26 + 97;
            txt += String.fromCharCode(x);
        }
        for (const pat of escapedLuts) txt = txt.replace(new RegExp(pat, "g"), "_");
        txt = txt.split("_").join("");

        const decoded1 = b64decode(txt);
        if (!decoded1) return null;

        let step4 = "";
        for (let i = 0; i < decoded1.length; i++)
            step4 += String.fromCharCode((decoded1.charCodeAt(i) - 3 + 256) % 256);

        const revBase64 = step4.split("").reverse().join("");
        const finalStr = b64decode(revBase64);
        if (!finalStr) return null;

        return JSON.parse(finalStr);
    } catch (e) {
        console.log("[VOE] voeDecode error:", e.message);
        return null;
    }
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

async function resolveVoe(embedUrl) {
    try {
        console.log(`[VOE] Resolving: ${embedUrl}`);
        const origin = new URL(embedUrl).origin;

        let resp = await fetchWithTimeout(embedUrl, {
            headers: { "User-Agent": UA, "Referer": embedUrl, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
        }, EMBED_TIMEOUT);
        if (!resp.ok) { console.log(`[VOE] HTTP ${resp.status}`); return null; }
        let data = await resp.text();

        // Handle permanentToken redirect
        if (/permanentToken/i.test(data)) {
            const m = data.match(/window\.location\.href\s*=\s*'([^']+)'/i);
            if (m) {
                console.log(`[VOE] Token redirect -> ${m[1]}`);
                const r2 = await fetchWithTimeout(m[1], { headers: { "User-Agent": UA, "Referer": embedUrl } }, EMBED_TIMEOUT);
                if (r2 && r2.ok) data = await r2.text();
            }
        }

        // Method 1: Encoded array + loader JS
        const rMain = data.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
        if (rMain) {
            const encodedArray = rMain[1];
            const loaderUrl = rMain[2].startsWith("http") ? rMain[2] : new URL(rMain[2], embedUrl).href;
            const jsResp = await fetchWithTimeout(loaderUrl, { headers: { "User-Agent": UA, "Referer": embedUrl } }, EMBED_TIMEOUT);
            if (jsResp && jsResp.ok) {
                const jsData = await jsResp.text();
                const replMatch = jsData.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i)
                    || jsData.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
                if (replMatch) {
                    const decoded = voeDecode(encodedArray, replMatch[1]);
                    if (decoded && (decoded.source || decoded.direct_access_url)) {
                        const url = decoded.source || decoded.direct_access_url;
                        console.log(`[VOE] Decoded: ${url.substring(0, 80)}...`);
                        return { url, server: "VOE", quality: "1080p", headers: { "User-Agent": UA, Referer: embedUrl, Origin: origin } };
                    }
                }
            }
        }

        // Method 2: Simple JSON with ROT13 + noise + base64 (lamovie-style)
        const jsonMatch = data.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                const encText = Array.isArray(parsed) ? parsed[0] : parsed;
                if (typeof encText === "string") {
                    let decoded = encText.replace(/[a-zA-Z]/g, c => {
                        const code = c.charCodeAt(0);
                        const limit = c <= "Z" ? 90 : 122;
                        const shifted = code + 13;
                        return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
                    });
                    const noise = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
                    for (const n of noise) decoded = decoded.split(n).join("");
                    const b64_1 = b64decode(decoded);
                    if (b64_1) {
                        let shiftedStr = "";
                        for (let j = 0; j < b64_1.length; j++)
                            shiftedStr += String.fromCharCode(b64_1.charCodeAt(j) - 3);
                        const reversed = shiftedStr.split("").reverse().join("");
                        const decrypted = b64decode(reversed);
                        if (decrypted) {
                            const finalData = JSON.parse(decrypted);
                            if (finalData && (finalData.source || finalData.direct_access_url)) {
                                const url = finalData.source || finalData.direct_access_url;
                                return { url, server: "VOE", quality: "1080p", headers: { Referer: embedUrl, "User-Agent": UA } };
                            }
                        }
                    }
                }
            } catch (_) { /* fall through */ }
        }

        // Method 3: Regex mp4/hls patterns (last resort)
        const re1 = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi;
        const re2 = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi;
        const matches = [];
        let m;
        while ((m = re1.exec(data)) !== null) matches.push(m);
        while ((m = re2.exec(data)) !== null) matches.push(m);
        for (const match of matches) {
            let url = match[1];
            if (!url) continue;
            if (url.startsWith("aHR0")) {
                try { url = b64decode(url) || url; } catch (_) {}
            }
            return { url, server: "VOE", quality: "720p", headers: { Referer: embedUrl } };
        }

        return null;
    } catch (err) {
        console.log(`[VOE] Error: ${err.message}`);
        return null;
    }
}

module.exports = { resolveVoe, voeDecode };
