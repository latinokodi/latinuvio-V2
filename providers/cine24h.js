const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://cine24h.online/";
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
        console.log(`[Cine24h] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode) {
    console.log(`[Cine24h] Resolving: ${id} (${type})`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    try {
        const searchUrl = `${BASE_URL}?s=${encodeURIComponent(info.title).replace(/%20/g, "+")}`;
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
            
            const seasonBlockMatch = cleanHtml.match(new RegExp(`data-season[^>]*>.*?Season\\s*0*${season}(.*?)<\/table>`));
            if (!seasonBlockMatch) return [];

            const seasonBlock = seasonBlockMatch[1];
            const epRegex = new RegExp(`<span class="Num">\\s*${episode}\\s*<\\/span>.*?<a href="([^"]+)"`, 'i');
            const epMatch = seasonBlock.match(epRegex);
            if (!epMatch) return [];

            targetUrl = epMatch[1];
        }

        const episodeHtml = await fetch(targetUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];

        const cleanEpisodeHtml = episodeHtml.replace(/\n|\r|\t|\s{2,}/g, '');
        const optionsMatch = cleanEpisodeHtml.match(/>Opciones<(.*?)>Enlaces</);
        if (optionsMatch) {
            const optionsBlock = optionsMatch[1];
            const optRegex = /<li[^>]*>.*?<span>([^<]+)<\/span>.*?<span>([^<]+)<span>.*?<span>([^<]+)<\/span>.*?src="([^"]+)"/g;
            let optMatch;
            while ((optMatch = optRegex.exec(optionsBlock)) !== null) {
                const serverName = optMatch[1].replace(/[^\w]/g, "").trim();
                const rawLang = optMatch[2].trim();
                const qlty = optMatch[3].trim();
                let encodedUrl = optMatch[4];

                if (serverName.toLowerCase() === "fmd" || serverName.toLowerCase() === "msn" || serverName.toLowerCase() === "jet" || serverName.toLowerCase() === "gou") {
                    continue;
                }

                let decodedUrl = encodedUrl;
                if (!encodedUrl.startsWith("http")) {
                    try {
                        decodedUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
                    } catch (e) {
                        continue;
                    }
                }

                let lang = "Lat";
                if (rawLang === "ESP") lang = "Esp";
                if (rawLang === "SUB") lang = "Vose";

                streams.push({
                    name: "Cine24H",
                    title: `${serverName} (${lang})`,
                    url: decodedUrl,
                    quality: qlty,
                    headers: { Referer: targetUrl }
                });
            }
        }

        if (streams.length === 0) {
            const iframeRegex = /<iframe[^>]*src="([^"]+)"/g;
            let iframeMatch;
            while ((iframeMatch = iframeRegex.exec(episodeHtml)) !== null) {
                let embedUrl = iframeMatch[1];
                if (embedUrl.includes("youtube") || embedUrl === "null") continue;
                if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
                streams.push({
                    name: "Cine24H",
                    title: "Embed",
                    url: embedUrl,
                    quality: "HD",
                    headers: { Referer: targetUrl }
                });
            }
        }

        return streams;
    } catch (e) {
        console.log(`[Cine24H] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
