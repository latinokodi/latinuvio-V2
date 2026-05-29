const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://repelishd.ceo/";
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
        console.log(`[RePelisHD] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode) {
    console.log(`[RePelisHD] Resolving: ${id} (${type})`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    try {
        const searchUrl = `${BASE_URL}?story=${encodeURIComponent(info.title).replace(/%20/g, "+")}&do=search&subaction=search`;
        const searchHtml = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());
        
        const regex = /<article[^>]*>.*?<a href="([^"]+)".*?alt="([^"]+)"/gs;
        let match;
        let matchedUrl = null;
        while ((match = regex.exec(searchHtml)) !== null) {
            matchedUrl = match[1];
            break;
        }

        if (!matchedUrl) return [];

        let targetUrl = matchedUrl;
        if (type === "tv") {
            const seriesHtml = await fetch(matchedUrl, { headers: HEADERS }).then(r => r.text());
            const cleanHtml = seriesHtml.replace(/\n|\r|\t|\s{2,}/g, '');
            
            const seasonBlockMatch = cleanHtml.match(new RegExp(`id="season-${season}"(.*?)<\/ul>`));
            if (!seasonBlockMatch) return [];

            const seasonBlock = seasonBlockMatch[1];
            const epRegex = new RegExp(`data-num="\\s*${season}x0*${episode}"[^>]*data-link="([^"]+)"`, 'i');
            const epMatch = seasonBlock.match(epRegex);
            if (!epMatch) return [];

            targetUrl = epMatch[1];
        }

        const episodeHtml = await fetch(targetUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];

        const cleanEpisodeHtml = episodeHtml.replace(/\n|\r|\t|\s{2,}/g, '');
        const mirrorMatches = [...cleanEpisodeHtml.matchAll(/<ul class="_player-mirrors\s+([^>]+)>(.*?)<\/ul>/g)];
        
        for (const mirror of mirrorMatches) {
            const attrs = mirror[1];
            const content = mirror[2];
            let lang = "Lat";
            if (attrs.includes("castellano") || attrs.includes("espanol") || attrs.includes("español")) lang = "Esp";
            if (attrs.includes("subtitulado")) lang = "Vose";

            const links = [...content.matchAll(/data-link="([^"]+)"/g)];
            for (const link of links) {
                let streamUrl = link[1];
                if (streamUrl.includes("verhdlink")) continue;
                if (!streamUrl.startsWith("http")) streamUrl = "https:" + streamUrl;

                streams.push({
                    name: "RePelisHD",
                    title: `Mirror (${lang})`,
                    url: streamUrl,
                    quality: "1080p",
                    headers: { Referer: targetUrl }
                });
            }
        }

        if (streams.length === 0) {
            const iframeRegex = /<iframe[^>]*src="([^"]+)"/g;
            let iframeMatch;
            while ((iframeMatch = iframeRegex.exec(episodeHtml)) !== null) {
                let embedUrl = iframeMatch[1];
                if (embedUrl.includes("youtube")) continue;
                if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
                streams.push({
                    name: "RePelisHD",
                    title: "Embed",
                    url: embedUrl,
                    quality: "720p",
                    headers: { Referer: targetUrl }
                });
            }
        }

        return streams;
    } catch (e) {
        console.log(`[RePelisHD] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
