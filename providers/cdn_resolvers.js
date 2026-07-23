/**
 * Embed resolvers for uqload, goodstream, vimeos.
 * Each resolver takes an embed URL, fetches the page, and extracts direct m3u8/mp4.
 */

const https = require('https');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchPage(url, referer = '') {
    return new Promise(resolve => {
        const p = new URL(url);
        https.get({
            hostname: p.hostname, path: p.pathname + p.search,
            rejectUnauthorized: false, timeout: 12000,
            headers: { 'User-Agent': UA, 'Accept': '*/*', 'Referer': referer || url }
        }, res => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
        }).on('error', () => resolve(null));
    });
}

function unpackEval(script) {
    const m = script.match(/\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (!m) return null;
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const radix = parseInt(m[2]);
    const symtab = m[4].split('|');
    function unbase(s) { let r = 0; for (const c of s) r = r * radix + chars.indexOf(c); return r; }
    return m[1].replace(/\b([0-9a-zA-Z]+)\b/g, match => {
        const idx = unbase(match);
        return (!isNaN(idx) && symtab[idx] && symtab[idx] !== '') ? symtab[idx] : match;
    });
}

function extractM3u8(text) {
    const m = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    return m ? m[0] : null;
}

/**
 * Uqload resolver: unpack eval → extract sources file
 */
async function resolveUqload(embedUrl) {
    const html = await fetchPage(embedUrl);
    if (!html) return null;
    
    // Try direct sources block
    let sm = html.match(/sources\s*:\s*\[([^\]]+)\]/);
    if (!sm) {
        // Try packed eval
        const pm = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
        if (pm) {
            const up = unpackEval(pm[0]);
            if (up) sm = up.match(/sources\s*:\s*\[([^\]]+)\]/);
        }
    }
    if (!sm) return null;
    
    const url = extractM3u8(sm[1]) || sm[1].match(/https?:\/\/[^\s"'<>]+/)?.[0];
    if (!url || !url.startsWith('http')) return null;
    
    return { url, server: 'Uqload', quality: '1080p',
        headers: { 'Referer': 'https://uqload.com/', 'User-Agent': UA } };
}

/**
 * Goodstream resolver: extract file:"..." from HTML
 */
async function resolveGoodstream(embedUrl) {
    const html = await fetchPage(embedUrl);
    if (!html) return null;
    
    const fm = html.match(/file\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i);
    if (fm) {
        return { url: fm[1], server: 'GoodStream', quality: '1080p',
            headers: { 'Referer': 'https://goodstream.one/', 'Origin': 'https://goodstream.one', 'User-Agent': UA } };
    }
    return null;
}

/**
 * Vimeos resolver: unpack eval → extract sources
 */
async function resolveVimeos(embedUrl) {
    const html = await fetchPage(embedUrl);
    if (!html) return null;
    
    const pm = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
    if (!pm) return null;
    
    const up = unpackEval(pm[0]);
    if (!up) return null;
    
    // sources: [{file: "m3u8_url"}, ...]
    const url = extractM3u8(up);
    if (!url) return null;
    
    return { url, server: 'Vimeos', quality: '1080p',
        headers: { 'Referer': 'https://vimeos.net/', 'Origin': 'https://vimeos.net', 'User-Agent': UA } };
}

/**
 * Generic dispatcher: detects host and calls appropriate resolver.
 */
async function resolveEmbed(embedUrl) {
    const u = embedUrl.toLowerCase();
    if (u.includes('uqload')) return resolveUqload(embedUrl);
    if (u.includes('goodstream')) return resolveGoodstream(embedUrl);
    if (u.includes('vimeos')) return resolveVimeos(embedUrl);
    return null;
}

module.exports = { resolveUqload, resolveGoodstream, resolveVimeos, resolveEmbed };
