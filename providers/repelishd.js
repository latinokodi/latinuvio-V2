const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

// Embed hosts NuvioTV can handle natively — emit as isEmbed:true
const EMBED_SAFE = ["dood", "mixdrop", "streamtape", "uqload", "ok.ru", "mp4upload",
    "streamwish", "strwish", "vidhide", "voe", "filemoon", "yourupload",
    "dropload", "supervideo", "dr0pstream"];

function looksPlayable(url) {
    const u = (url || "").toLowerCase();
    if (/\.m3u8/.test(u) || /\.mp4/.test(u) || /\/hls/.test(u)) return true;
    return EMBED_SAFE.some(h => u.includes(h));
}

async function getImdbId(tmdbId, type) {
    try {
        // Movies have imdb_id on main endpoint; TV shows need external_ids
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

    // Season/episode suffix for TV shows
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

    // Parse all _player-mirrors ULs
    const streams = [];
    const ulRegex = /<ul class="_player-mirrors\s+([^"]+)"[^>]*>([\s\S]*?)<\/ul>/gi;
    let ulMatch;

    while ((ulMatch = ulRegex.exec(html)) !== null) {
        const classes = ulMatch[1];
        const content = ulMatch[2];

        // Determine language from class
        let lang = "Lat";
        if (classes.includes("castellano") || classes.includes("espanol")) lang = "Esp";
        if (classes.includes("subtitulado") || classes.includes("vose")) lang = "Vose";

        // Extract data-link URLs
        const linkRegex = /data-link="([^"]+)"/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(content)) !== null) {
            let url = linkMatch[1];
            // Protocol-relative → https
            if (url.startsWith("//")) url = "https:" + url;
            if (!url.startsWith("http")) continue;

            const isEmbed = EMBED_SAFE.some(h => url.toLowerCase().includes(h));
            const label = isEmbed ? `${lang} · Embed` : `${lang} · Direct`;
            const quality = url.includes("dropload") || url.includes("supervideo") ? "1080p" : "720p";

            streams.push({
                provider: "RePelisHD",
                title: label,
                url: url,
                quality: quality,
                isEmbed: isEmbed || undefined,
                headers: { Referer: proxyUrl, "User-Agent": UA }
            });
        }
    }

    console.log(`[RePelisHD] Found ${streams.length} streams`);
    return streams;
}

module.exports = { getStreams };
