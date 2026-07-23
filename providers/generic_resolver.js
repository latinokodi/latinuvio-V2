/**
 * Generic Embed Resolver — ported from BlackGhost Kodi addon.
 * Visits an embed page and extracts any direct m3u8/mp4 URLs.
 * Handles: base64 layers, common player patterns, JSON configs.
 */

const https = require('https');
const http = require('http');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function genericGet(url, referer = '') {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.request({
            hostname: parsed.hostname, path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: { 'User-Agent': UA, 'Accept': '*/*', 'Referer': referer || url },
            rejectUnauthorized: false, timeout: 10000
        }, res => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                const loc = res.headers.location;
                if (loc) {
                    const next = loc.startsWith('http') ? loc : parsed.protocol + '//' + parsed.host + loc;
                    return resolve(genericGet(next, url));
                }
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data, url: url }));
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.end();
    });
}

function detectStream(text) {
    if (!text) return null;
    // m3u8 patterns
    let m = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (m) return m[0];
    // mp4 patterns  
    m = text.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
    if (m) return m[0];
    // /hls/ or /stream/ patterns
    m = text.match(/https?:\/\/[^\s"'<>]+\/(?:hls|stream|video)\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/i);
    if (m) return m[0];
    return null;
}

function decodeBase64Layers(text) {
    for (let i = 0; i < 6; i++) {
        const matches = text.match(/[A-Za-z0-9+/=]{40,}/g);
        if (!matches) return null;
        for (const m of matches) {
            try {
                const decoded = Buffer.from(m, 'base64').toString('utf8');
                if (decoded.includes('http') && (decoded.includes('.m3u8') || decoded.includes('.mp4'))) {
                    return decoded.match(/https?:\/\/[^\s"'<>]+/)[0];
                }
                text = decoded;
            } catch {}
        }
    }
    return null;
}

function detectJsonStream(html) {
    const m = html.match(/(?:file|src|url|source)\s*[:=]\s*"(https?:\/\/[^"]+\.(?:m3u8|mp4)[^"]*)"/i);
    if (m) return m[1];
    return null;
}

/**
 * Generic resolve — visit embed page, extract any direct m3u8/mp4.
 * Returns { url, headers } or null.
 */
async function resolveGeneric(embedUrl, referer = '') {
    const resp = await genericGet(embedUrl, referer);
    if (!resp || resp.status >= 400) return null;

    const html = resp.body;

    // 1. Direct stream patterns
    let url = detectStream(html);
    if (url) return { url, headers: { 'Referer': embedUrl, 'User-Agent': UA } };

    // 2. JSON config
    url = detectJsonStream(html);
    if (url) return { url, headers: { 'Referer': embedUrl, 'User-Agent': UA } };

    // 3. Base64 layers
    url = decodeBase64Layers(html);
    if (url) return { url, headers: { 'Referer': embedUrl, 'User-Agent': UA } };

    // 4. Follow iframe
    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch) {
        let iframeUrl = iframeMatch[1];
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
        if (iframeUrl.startsWith('/')) {
            const u = new URL(embedUrl);
            iframeUrl = u.protocol + '//' + u.host + iframeUrl;
        }
        if (iframeUrl !== embedUrl && iframeUrl.startsWith('http')) {
            return await resolveGeneric(iframeUrl, embedUrl);
        }
    }

    return null;
}

module.exports = { resolveGeneric };
