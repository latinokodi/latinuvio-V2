/**
 * Shared MixDrop resolver (mixdrop.ag, mixdrop.ps, mxdrop.to, m1xdrop.net).
 *
 * Strategy:
 *   1. Fetch embed page → unpack eval-packed JS → extract wurl
 *   2. If no wurl, look for iframe → fetch that → unpack → extract wurl
 *   3. Return direct stream URL
 *
 * Based on: Easystreams extractors/mixdrop.js
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const { fetchWithTimeout, EMBED_TIMEOUT } = require("../utils/fetch_helpers");

function unPack(p, a, c, k) {
    function e(c2) {
        return (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
    }
    const d = {};
    while (c--) d[e(c)] = k[c] || e(c);
    const replacer = function(e2) { return d[e2] || e2; };
    return p.replace(/\b\w+\b/g, replacer);
}

function extractWurlFromPage(html) {
    const packedRegex = /eval\(function\(p,a,c,k,e,d\)\s*\{.*?\}\s*\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\),(\d+),(\{\})\)\)/;
    const match = packedRegex.exec(String(html || ""));
    if (!match) return null;

    const p = match[1];
    const a = parseInt(match[2]);
    const c = parseInt(match[3]);
    const k = match[4].split("|");
    const unpacked = unPack(p, a, c, k);

    const wurlMatch = unpacked.match(/wurl\s*=\s*["']([^"']+)["']/);
    if (!wurlMatch) return null;

    let streamUrl = wurlMatch[1];
    if (streamUrl.startsWith("//")) streamUrl = "https:" + streamUrl;
    return streamUrl;
}

function extractIframeUrl(html, pageUrl) {
    const match = String(html || "").match(/<iframe\b[^>]+src=["']([^"']*\/e\/[^"']+)["']/i);
    if (match) {
        try { return new URL(match[1], pageUrl).toString(); } catch (_) {}
    }
    const converted = String(pageUrl || "").replace(/\/f\//i, "/e/");
    return converted !== pageUrl ? converted : null;
}

async function fetchPage(url, referer) {
    const resp = await fetchWithTimeout(url, {
        headers: {
            "User-Agent": UA,
            "Referer": referer,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
        }
    }, EMBED_TIMEOUT);
    if (!resp.ok) return null;
    return { url: resp.url || url, html: await resp.text() };
}

async function resolveMixDrop(embedUrl) {
    try {
        console.log(`[MixDrop] Resolving: ${embedUrl}`);

        if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;

        const origin = (() => { try { return new URL(embedUrl).origin; } catch (_) { return "https://mixdrop.ag"; } })();
        const referer = origin + "/";

        // Step 1: Fetch the embed page
        let page = await fetchPage(embedUrl, referer);
        if (!page) return null;

        // Step 2: Try to extract wurl from packed JS
        let streamUrl = extractWurlFromPage(page.html);

        // Step 3: If no wurl, check for iframe redirect
        if (!streamUrl) {
            const iframeUrl = extractIframeUrl(page.html, page.url);
            if (iframeUrl && iframeUrl !== page.url) {
                const iframePage = await fetchPage(iframeUrl, page.url);
                if (iframePage) {
                    streamUrl = extractWurlFromPage(iframePage.html);
                    if (streamUrl) page = iframePage;
                }
            }
        }

        if (!streamUrl) {
            console.log("[MixDrop] Could not extract stream URL");
            return null;
        }

        const playbackOrigin = (() => { try { return new URL(streamUrl).origin; } catch (_) { return origin; } })();
        console.log(`[MixDrop] Resolved: ${streamUrl.substring(0, 80)}...`);
        return {
            url: streamUrl,
            server: "MixDrop",
            quality: "HD",
            headers: { "User-Agent": UA, "Referer": `${playbackOrigin}/`, "Origin": playbackOrigin }
        };
    } catch (err) {
        console.log(`[MixDrop] Error: ${err.message}`);
        return null;
    }
}

module.exports = { resolveMixDrop };
