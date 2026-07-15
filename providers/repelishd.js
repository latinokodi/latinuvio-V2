const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://repelishd.ceo/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

function unpack(p, a, c, k, e, d) {
    while (c--)
        if (k[c]) p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    return p;
}

function decodePacked(text) {
    const match = text.match(/eval\(function\(p,a,c,k,e,d\).*?return p}\('(.*?)',\s*(\d+),\s*(\d+),\s*'([^']+)'\.split\('\|'\).*?\)\)/);
    if (match) {
        let p = match[1];
        let a = parseInt(match[2]);
        let c = parseInt(match[3]);
        let k = match[4].split('|');
        return unpack(p, a, c, k, 0, {});
    }
    return null;
}

async function resolveEmbed(url) {
    try {
        const res = await fetch(url, { headers: Object.assign({}, HEADERS, { "Referer": BASE_URL }) });
        const text = await res.text();
        
        let fileMatch = text.match(/file:\s*["']([^"']*\.m3u8[^"']*)["']/i) || text.match(/file:\s*["']([^"']*\.mp4[^"']*)["']/i);
        if (fileMatch) return fileMatch[1];
        
        const unpacked = decodePacked(text);
        if (unpacked) {
            fileMatch = unpacked.match(/file:\s*["']([^"']*\.m3u8[^"']*)["']/i) || unpacked.match(/file:\s*["']([^"']*\.mp4[^"']*)["']/i);
            if (fileMatch) return fileMatch[1];
        }
    } catch (e) {
        // ignore
    }
    return null;
}

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
                if (!streamUrl.startsWith("http")) streamUrl = "https:" + streamUrl;
                
                if (streamUrl.includes("verhdlink")) {
                    try {
                        const vHtml = await fetch(streamUrl, { headers: Object.assign({}, HEADERS, { "Referer": targetUrl }) }).then(r => r.text());
                        const subLinks = [...vHtml.matchAll(/data-link="([^"]+)"/g)];
                        for (const sub of subLinks) {
                            let subUrl = sub[1];
                            if (!subUrl.startsWith("http")) subUrl = "https:" + subUrl;
                            const direct = await resolveEmbed(subUrl);
                            if (direct) {
                                streams.push({
                                    name: "RePelisHD",
                                    title: `Mirror (${lang})`,
                                    url: direct,
                                    quality: direct.includes(".m3u8") ? "1080p" : "720p",
                                    headers: { Referer: subUrl }
                                });
                            }
                        }
                    } catch(e) {}
                    continue;
                }

                const direct = await resolveEmbed(streamUrl);
                if (direct) {
                    streams.push({
                        name: "RePelisHD",
                        title: `Mirror (${lang})`,
                        url: direct,
                        quality: direct.includes(".m3u8") ? "1080p" : "720p",
                        headers: { Referer: streamUrl }
                    });
                }
            }
        }

        if (streams.length === 0) {
            const iframeRegex = /<iframe[^>]*src="([^"]+)"/g;
            let iframeMatch;
            while ((iframeMatch = iframeRegex.exec(episodeHtml)) !== null) {
                let embedUrl = iframeMatch[1];
                if (embedUrl.includes("youtube")) continue;
                if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
                
                if (embedUrl.includes("verhdlink")) {
                    try {
                        const vHtml = await fetch(embedUrl, { headers: Object.assign({}, HEADERS, { "Referer": targetUrl }) }).then(r => r.text());
                        const subLinks = [...vHtml.matchAll(/data-link="([^"]+)"/g)];
                        for (const sub of subLinks) {
                            let subUrl = sub[1];
                            if (!subUrl.startsWith("http")) subUrl = "https:" + subUrl;
                            const direct = await resolveEmbed(subUrl);
                            if (direct) {
                                streams.push({
                                    name: "RePelisHD",
                                    title: "Embed",
                                    url: direct,
                                    quality: direct.includes(".m3u8") ? "1080p" : "720p",
                                    headers: { Referer: subUrl }
                                });
                            }
                        }
                    } catch(e) {}
                } else {
                    const direct = await resolveEmbed(embedUrl);
                    if (direct) {
                        streams.push({
                            name: "RePelisHD",
                            title: "Embed",
                            url: direct,
                            quality: direct.includes(".m3u8") ? "1080p" : "720p",
                            headers: { Referer: embedUrl }
                        });
                    }
                }
            }
        }

        return streams;
    } catch (e) {
        console.log(`[RePelisHD] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
