const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://areshd.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

/**
 * TMDB lookup
 */
async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        console.log(`[AresHD] TMDB Error: ${e.message}`);
        return null;
    }
}

/**
 * Search on AresHD
 */
async function searchAres(query) {
    try {
        const url = `${BASE_URL}/search/${encodeURIComponent(query).replace(/%20/g, "+")}`;
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const matches = [];
        const regex = /<a class="Posters-link".*?href="([^"]+)".*?<img alt="([^"]+)"/gs;
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push({
                url: match[1].startsWith("http") ? match[1] : `${BASE_URL}${match[1]}`,
                title: match[2].trim()
            });
        }
        return matches;
    } catch (e) {
        console.log(`[AresHD] Search Error: ${e.message}`);
        return [];
    }
}

/**
 * Extract streams from a page
 */
async function extractStreams(url) {
    try {
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const streams = [];
        
        // AresHD uses a tabbed player system
        // Languages are in <li class="pres"><a class="playr">Latino</a></li>
        const langMatches = [...html.matchAll(/<li class="pres"><a class="playr">([^<]+)<\/a><\/li>/g)];
        const languages = langMatches.map(m => {
            const l = m[1].toLowerCase();
            if (l.includes("latino")) return "Lat";
            if (l.includes("castellano") || l.includes("español")) return "Esp";
            if (l.includes("subtitulado") || l.includes("vose")) return "Vose";
            return "?";
        });

        // Video blocks are in <ul class="TbVideoNv nav nav-tabs hide" role="tablist">
        const blockMatches = [...html.matchAll(/<ul class="TbVideoNv nav nav-tabs hide" role="tablist">(.*?)<\/ul>/gs)];
        
        blockMatches.forEach((block, index) => {
            const lang = languages[index] || "?";
            const serverMatches = [...block[1].matchAll(/<li class="pres" data-tr="([^"]+)".*?a class="playr">([^<]+)<\/a>/g)];
            
            serverMatches.forEach(m => {
                const streamUrl = m[1];
                const serverName = m[2].trim();
                
                if (serverName.toLowerCase().includes("youtube")) return;

                streams.push({
                    name: "AresHD",
                    title: `${serverName} (${lang})`,
                    url: streamUrl,
                    quality: "HD",
                    headers: { Referer: url }
                });
            });
        });

        return streams;
    } catch (e) {
        console.log(`[AresHD] Extract Error: ${e.message}`);
        return [];
    }
}

/**
 * Main export for Luvio
 */
async function getStreams(id, type, season, episode) {
    console.log(`[AresHD] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    const results = await searchAres(info.title);
    if (results.length === 0) return [];

    // Filter results
    const target = results[0];
    let url = target.url;

    if (type === "tv") {
        // Construct episode URL directly if possible, or find it in season structure
        // AresHD follows: /episodio/[name]-temporada-[n]-episodio-[m]
        const name = url.match(/\/serie\/([^\/]+)/)?.[1];
        if (name) {
            url = `${BASE_URL}/episodio/${name}-temporada-${season}-episodio-${episode}`;
        } else {
            // Fallback: search in the series page
            const seriesHtml = await fetch(url, { headers: HEADERS }).then(r => r.text());
            const epRegex = new RegExp(`"slug":"([^"]*${season}-episodio-${episode}[^"]*)"`, 'i');
            const epMatch = seriesHtml.match(epRegex);
            if (!epMatch) return [];
            url = `${BASE_URL}/episodio/${epMatch[1]}`;
        }
    }

    return await extractStreams(url);
}

module.exports = { getStreams };
