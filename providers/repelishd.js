const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

// Embed hosts that can be resolved inline (tried before isEmbed fallback)
const RESOLVABLE = ["dood", "mixdrop", "streamtape", "uqload", "ok.ru", "mp4upload",
    "streamwish", "strwish", "vidhide", "voe", "filemoon", "yourupload",
    "dropload", "supervideo", "dr0pstream"];

function looksPlayable(url) {
    const u = (url || "").toLowerCase();
    if (/\.m3u8/.test(u) || /\.mp4/.test(u) || /\/hls/.test(u)) return true;
    return RESOLVABLE.some(h => u.includes(h));
}

// ─── Embed resolvers ─────────────────────────────────────────────────────

function unpackPayload(p, radix, symtab) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unbase = (s) => { let r = 0; for (const c of s) r = r * radix + chars.indexOf(c); return r; };
    return p.replace(/\b([0-9a-zA-Z]+)\b/g, (m) => {
        const idx = unbase(m);
        return (!isNaN(idx) && symtab[idx] && symtab[idx] !== "") ? symtab[idx] : m;
    });
}

function evalUnpack(script) {
    const m = script.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (!m) return null;
    return unpackPayload(m[1], parseInt(m[2]), m[4].split("|"));
}

function extractDirectUrl(text) {
    let m = text.match(/(?:sources|file)\s*:\s*\[?"?(https?:\/\/[^\s"'<>\[\]]+\.m3u8[^\s"'<>\[\]]*)/i);
    if (m) return m[1];
    m = text.match(/https?:\/\/[^\s"'<>\[\]]+\.m3u8[^\s"'<>\[\]]*/i);
    if (m) return m[0];
    m = text.match(/https?:\/\/[^\s"'<>\[\]]+\.mp4[^\s"'<>\[\]]*/i);
    if (m) return m[0];
    return null;
}

async function resolveUnpackEval(url, referer) {
    try {
        const html = await fetch(url, { headers: { ...HEADERS, "Referer": referer || url } }).then(r => r.text());
        const em = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
        if (em) {
            const up = evalUnpack(em[0]);
            if (up) { const d = extractDirectUrl(up); if (d) return d; }
        }
        const d = extractDirectUrl(html);
        if (d) return d;
    } catch (e) {}
    return null;
}

async function resolveStreamWish(url, referer) {
    try {
        const html = await fetch(url, { headers: { ...HEADERS, "Referer": referer || url } }).then(r => r.text());
        let m = html.match(/sources\s*:\s*\[([^\]]+)\]/);
        if (m) { const d = extractDirectUrl(m[1]); if (d) return d; }
        return await resolveUnpackEval(url, referer);
    } catch (e) {}
    return null;
}

function isMirror(url, domains) {
    return domains.some(d => (url || "").toLowerCase().includes(d));
}

async function resolveEmbed(url, referer) {
    const u = url.toLowerCase();
    if (isMirror(u, ["streamwish", "vidhide", "awish", "hlswish", "hglink", "strwish",
        "embedwish", "wishfast", "sfastwish", "hanerix", "dwish", "wishembed"])) {
        return await resolveStreamWish(url, referer);
    }
    if (/voe\.(sx|to|tv|me|cc)|voex\./i.test(u)) {
        try {
            const html = await fetch(url, { headers: { ...HEADERS, "Referer": referer || url } }).then(r => r.text());
            let m = html.match(/['"]hls['"]:\s*['"](https?:[^'"]+)['"]/);
            if (m) return m[1].replace(/\\\//g, '/');
            return await resolveUnpackEval(url, referer);
        } catch (e) {}
    }
    return await resolveUnpackEval(url, referer);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function getImdbId(tmdbId, type) {
    try {
        if (type === "tv") {
            const url = `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
            const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
            return res.imdb_id || null;
        }
        const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return res.imdb_id || null;
    } catch (e) {
        console.log(`[RePelisHD] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode) {
    console.log(`[RePelisHD] Resolving: ${id} (${type})`);

    const imdbId = await getImdbId(id, type);
    if (!imdbId) {
        console.log("[RePelisHD] Could not get IMDb ID");
        return [];
    }

    const epSuffix = (type === "tv" && season && episode) 
        ? `?s=${season}&e=${episode}`
        : "";
    
    const proxyUrl = `https://verhdlink.cam/movie/${imdbId}${epSuffix}`;
    console.log(`[RePelisHD] Fetching proxy: ${proxyUrl}`);

    let html;
    try {
        const resp = await fetch(proxyUrl, { headers: { ...HEADERS, "Referer": "https://repelishd.fit/" } });
        if (!resp.ok) {
            console.log(`[RePelisHD] Proxy returned ${resp.status}`);
            return [];
        }
        html = await resp.text();
    } catch (e) {
        console.log(`[RePelisHD] Fetch error: ${e.message}`);
        return [];
    }

    const streams = [];
    const ulRegex = /<ul class="_player-mirrors\s+([^"]+)"[^>]*>([\s\S]*?)<\/ul>/gi;
    let ulMatch;

    while ((ulMatch = ulRegex.exec(html)) !== null) {
        const classes = ulMatch[1];
        const content = ulMatch[2];

        let lang = "Lat";
        if (classes.includes("castellano") || classes.includes("espanol")) lang = "Esp";
        if (classes.includes("subtitulado") || classes.includes("vose")) lang = "Vose";

        const linkRegex = /data-link="([^"]+)"/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(content)) !== null) {
            let url = linkMatch[1];
            if (url.startsWith("//")) url = "https:" + url;
            if (!url.startsWith("http")) continue;

            const isEmbed = RESOLVABLE.some(h => url.toLowerCase().includes(h));
            const quality = url.includes("dropload") || url.includes("supervideo") ? "1080p" : "720p";

            if (isEmbed) {
                const resolved = await resolveEmbed(url, proxyUrl);
                if (resolved) {
                    console.log(`[RePelisHD] Resolved ${lang} → ${resolved.substring(0, 60)}...`);
                    streams.push({
                        provider: "RePelisHD",
                        title: `${lang} · Direct`,
                        url: resolved,
                        quality: quality,
                        headers: { Referer: url, "User-Agent": UA }
                    });
                    continue;
                }
                streams.push({
                    provider: "RePelisHD",
                    title: `${lang} · Embed`,
                    url: url,
                    quality: quality,
                    isEmbed: true,
                    headers: { Referer: proxyUrl, "User-Agent": UA }
                });
            } else {
                streams.push({
                    provider: "RePelisHD",
                    title: `${lang} · Direct`,
                    url: url,
                    quality: quality,
                    headers: { Referer: proxyUrl, "User-Agent": UA }
                });
            }
        }
    }

    console.log(`[RePelisHD] Found ${streams.length} streams`);
    return streams;
}

module.exports = { getStreams };
