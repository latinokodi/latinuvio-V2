const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://tioanime.com";
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
        console.log(`[TioAnime] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode) {
    if (type !== "tv") return [];
    console.log(`[TioAnime] Resolving: ${id} S${season}E${episode}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    try {
        const searchUrl = `${BASE_URL}/directorio?q=${encodeURIComponent(info.title).replace(/%20/g, "+")}`;
        const searchHtml = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());
        
        const regex = /<article class="anime">.*?<a href="([^"]+)".*?<h3 class="title">([^<]+)<\/h3>/gs;
        let match;
        let matchedUrl = null;
        while ((match = regex.exec(searchHtml)) !== null) {
            matchedUrl = match[1];
            break;
        }

        if (!matchedUrl) return [];

        const seriesUrl = matchedUrl.startsWith("http") ? matchedUrl : `${BASE_URL}${matchedUrl}`;
        const seriesHtml = await fetch(seriesUrl, { headers: HEADERS }).then(r => r.text());

        const infoMatch = seriesHtml.match(/var anime_info\s*=\s*\[(.*?)\];/);
        if (!infoMatch) return [];

        const parts = infoMatch[1].split(",");
        const slug = parts[1].trim().replace(/"/g, "").replace(/'/g, "");

        const episodeUrl = `${BASE_URL}/ver/${slug}-${episode}`;
        const episodeHtml = await fetch(episodeUrl, { headers: HEADERS }).then(r => r.text());

        const videosMatch = episodeHtml.match(/var videos\s*=\s*(\[.*?\]);/);
        if (!videosMatch) return [];

        const videos = JSON.parse(videosMatch[1]);
        const streams = [];

        for (const video of videos) {
            const server = video[0].toLowerCase();
            let embedUrl = video[1].replace(/\\\//g, "/");

            if (server === "streamium" || server === "amus" || server === "mepu" || server === "streamsb") {
                continue;
            }

            streams.push({
                name: "TioAnime",
                title: `${video[0]} (VOSE)`,
                url: embedUrl,
                quality: "720p",
                headers: { Referer: episodeUrl }
            });
        }

        return streams;
    } catch (err) {
        console.log(`[TioAnime] Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
