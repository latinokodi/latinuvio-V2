const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://jkanime.net/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        console.log(`[JKAnime] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode) {
    if (type !== "tv") return [];
    console.log(`[JKAnime] Resolving: ${id} S${season}E${episode}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    try {
        const searchUrl = `${BASE_URL}buscar/${encodeURIComponent(info.title).replace(/%20/g, "_")}`;
        const searchHtml = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());
        
        const regex = /<div class="anime__item">.*?href="([^"]+)".*?<h5>.*?">(.*?)<\/a>/gs;
        let match;
        let matchedUrl = null;
        while ((match = regex.exec(searchHtml)) !== null) {
            matchedUrl = match[1];
            break;
        }

        if (!matchedUrl) return [];

        const seriesUrl = matchedUrl.startsWith("http") ? matchedUrl : `${BASE_URL}${matchedUrl}`;
        const episodeUrl = `${seriesUrl.replace(/\/$/, "")}/${episode}/`;
        const episodeHtml = await fetch(episodeUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];

        const serversMatch = episodeHtml.match(/var servers\s*=\s*(\[.*?\]);/);
        if (serversMatch) {
            try {
                const servers = JSON.parse(serversMatch[1]);
                for (const srv of servers) {
                    const name = srv.server.toUpperCase();
                    const remote = srv.remote;
                    const streamUrl = `${BASE_URL}c1.php?u=${remote}&s=${srv.server.toLowerCase()}`;
                    streams.push({
                        name: "JKAnime",
                        title: `${name} (VOSE)`,
                        url: streamUrl,
                        quality: "720p",
                        headers: { Referer: episodeUrl }
                    });
                }
            } catch (e) {
                console.log(`[JKAnime] Server parse error: ${e.message}`);
            }
        }

        const iframeRegex = /video\[\d+\]\s*=\s*'<iframe.*?src="([^"]+)".*?><\/iframe>/g;
        let iframeMatch;
        while ((iframeMatch = iframeRegex.exec(episodeHtml)) !== null) {
            let embedUrl = iframeMatch[1];
            if (embedUrl === "/','src=") continue;

            if (embedUrl.startsWith("/")) {
                embedUrl = BASE_URL.replace(/\/$/, "") + embedUrl;
            }

            streams.push({
                name: "JKAnime",
                title: `Embed (VOSE)`,
                url: embedUrl,
                quality: "720p",
                headers: { Referer: episodeUrl }
            });
        }

        return streams;
    } catch (err) {
        console.log(`[JKAnime] Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
