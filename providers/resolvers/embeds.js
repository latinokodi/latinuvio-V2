/**
 * Embed resolvers — handles common JS-protected embed hosts to extract direct m3u8/mp4.
 *
 * Supports: vidhide, streamwish, voe, filemoon, ok.ru, generic unpack/eval
 * Usage: const { resolveEmbed } = require("./resolvers/embeds.js");
 *        const directUrl = await resolveEmbed(embedUrl, referer);
 */
const crypto = require("crypto-js");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Helpers ───────────────────────────────────────────────────────────

function normDomain(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
    catch (e) { return ""; }
}

function isHost(url, domains) {
    const h = normDomain(url);
    return domains.some(d => h.includes(d));
}

function extractM3u8(text) {
    // Try sources pattern
    let m = text.match(/sources?\s*:\s*\[([^\]]+)\]/);
    if (m) {
        const inner = m[1];
        const urlMatch = inner.match(/(?:src|file)\s*:\s*["']?(https?:\/\/[^"'\s,]+\.m3u8[^"'\s,]*)/i)
                      || inner.match(/https?:\/\/[^"'\s,]+\.m3u8[^"'\s,]*/i);
        if (urlMatch) return urlMatch[1] || urlMatch[0];
    }
    // Try "hls": "url"
    m = text.match(/["']hls["']\s*:\s*["'](https?:\/\/[^"']+)["']/i);
    if (m) return m[1].replace(/\\\//g, "/");
    // Direct URL
    m = text.match(/https?:\/\/[^"'\s<>\[\]]+\.m3u8[^"'\s<>\[\]]*/i);
    if (m) return m[0];
    m = text.match(/https?:\/\/[^"'\s<>\[\]]+\.mp4[^"'\s<>\[\]]*/i);
    if (m) return m[0];
    return null;
}

function unpackEval(script) {
    const m = script.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (!m) return null;
    const payload = m[1];
    const radix = parseInt(m[2]);
    const symtab = m[4].split("|");
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unbase = (s) => { let r = 0; for (const c of s) r = r * radix + chars.indexOf(c); return r; };
    return payload.replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
        const idx = unbase(match);
        return (!isNaN(idx) && symtab[idx] && symtab[idx] !== "") ? symtab[idx] : match;
    });
}

// ─── VOE Resolver ─────────────────────────────────────────────────────

async function resolveVoe(url, referer) {
    try {
        let resp = await fetch(url, {
            headers: { "User-Agent": UA, "Referer": referer || url }
        });
        if (!resp.ok) return null;
        let html = await resp.text();

        // Handle permanentToken redirect
        if (html.includes("permanentToken")) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm) {
                resp = await fetch(rm[1], {
                    headers: { "User-Agent": UA, "Referer": url }
                });
                if (!resp.ok) return null;
                html = await resp.text();
            }
        }

        // Try "hls": "url" pattern
        let m = html.match(/["']hls["']\s*:\s*["'](https?:\/\/[^"']+)["']/i);
        if (m) return m[1].replace(/\\\//g, "/");

        // Try sources pattern
        m = html.match(/sources?\s*:\s*\[([^\]]+)\]/);
        if (m) return extractM3u8(html);

        // Try eval unpack
        const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k/);
        if (evalMatch) {
            const unpacked = unpackEval(evalMatch[0]);
            if (unpacked) return extractM3u8(unpacked);
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─── VidHide Resolver ─────────────────────────────────────────────────

async function resolveVidhide(url, referer) {
    try {
        const domain = normDomain(url);
        const resp = await fetch(url, {
            headers: {
                "User-Agent": UA,
                "Referer": referer || `https://${domain}/`
            }
        });
        if (!resp.ok) return null;
        const html = await resp.text();

        // sources pattern
        let m = extractM3u8(html);
        if (m) return m;

        // eval unpack
        const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k/);
        if (evalMatch) {
            const unpacked = unpackEval(evalMatch[0]);
            if (unpacked) {
                m = extractM3u8(unpacked);
                if (m) return m;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─── StreamWish Resolver (Race pattern) ───────────────────────────────

async function resolveStreamWish(url, referer) {
    try {
        // Extract the raw ID from the URL
        const idMatch = url.match(/\/(?:e|v|embed)\/([a-z0-9_-]+)/i);
        if (!idMatch) return null;
        const rawId = idMatch[1];

        // Mirror list (standard domains)
        const mirrors = [
            `https://hglink.to/e/${rawId}`,
            `https://strwish.com/e/${rawId}`,
            `https://wishfast.top/e/${rawId}`,
            `https://sfastwish.com/e/${rawId}`,
            url // include original
        ];

        // Race: try mirrors in parallel, return first success
        const results = await Promise.allSettled(
            mirrors.map(mirror => resolveStreamWishSingle(mirror, referer))
        );

        for (const r of results) {
            if (r.status === "fulfilled" && r.value) return r.value;
        }

        return null;
    } catch (e) {
        return null;
    }
}

async function resolveStreamWishSingle(url, referer) {
    try {
        const resp = await fetch(url, {
            headers: { "User-Agent": UA, "Referer": referer || url }
        });
        if (!resp.ok) return null;
        const html = await resp.text();

        let m = extractM3u8(html);
        if (m) return m;

        // eval unpack
        const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k/);
        if (evalMatch) {
            const unpacked = unpackEval(evalMatch[0]);
            if (unpacked) {
                m = extractM3u8(unpacked);
                if (m) return m;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─── FileMoon Resolver ────────────────────────────────────────────────

async function resolveFilemoon(url, referer) {
    try {
        const resp = await fetch(url, {
            headers: { "User-Agent": UA, "Referer": referer || url }
        });
        if (!resp.ok) return null;
        const html = await resp.text();

        let m = extractM3u8(html);
        if (m) return m;

        const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k/);
        if (evalMatch) {
            const unpacked = unpackEval(evalMatch[0]);
            if (unpacked) {
                m = extractM3u8(unpacked);
                if (m) return m;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─── Generic unpack/eval resolver ─────────────────────────────────────

async function resolveGeneric(url, referer) {
    try {
        const resp = await fetch(url, {
            headers: { "User-Agent": UA, "Referer": referer || url }
        });
        if (!resp.ok) return null;
        const html = await resp.text();

        let m = extractM3u8(html);
        if (m) return m;

        const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k/);
        if (evalMatch) {
            const unpacked = unpackEval(evalMatch[0]);
            if (unpacked) {
                m = extractM3u8(unpacked);
                if (m) return m;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ─── Dispatcher ────────────────────────────────────────────────────────

/**
 * Try to resolve any embed URL to a direct playable m3u8/mp4.
 * Returns the resolved URL or null.
 */
async function resolveEmbed(url, referer) {
    if (!url || !url.startsWith("http")) return null;

    const h = normDomain(url);

    // Dispatch to specialized resolver based on host
    if (h.includes("voe") || h.includes("voex") || h.includes("marissa")) {
        return await resolveVoe(url, referer);
    }
    if (h.includes("vidhide") || h.includes("minochinos") || h.includes("vidhidepro")) {
        return await resolveVidhide(url, referer);
    }
    if (h.includes("streamwish") || h.includes("strwish") || h.includes("wishfast")
        || h.includes("sfastwish") || h.includes("hglink") || h.includes("embedwish")
        || h.includes("vidhide") === false && url.includes("/e/")) {
        return await resolveStreamWish(url, referer);
    }
    if (h.includes("filemoon") || h.includes("moon")) {
        return await resolveFilemoon(url, referer);
    }

    // Generic fallback
    return await resolveGeneric(url, referer);
}

module.exports = { resolveEmbed, resolveVoe, resolveVidhide, resolveStreamWish, resolveFilemoon };
