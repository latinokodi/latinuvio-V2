const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://cine24h.online/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

function unpack(p, a, c, k, e, d) {
    while (c--) {
        if (k[c]) {
            p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
        }
    }
    return p;
}

function decodePacker(packed) {
    let args = packed.match(/eval\(function\(p,a,c,k,e,[rd]\).*?\}\((.*?)\)\)/);
    if (!args) return "";
    let strArgs = args[1];
    try {
        let parsed = eval('[' + strArgs + ']');
        return unpack(parsed[0], parsed[1], parsed[2], parsed[3], parsed[4], parsed[5]);
    } catch(e) {
        return "";
    }
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
        
        const regex = /<article[^>]*>.*?<a href="([^"]+)"[^>]*>.*?alt="([^"]+)"/gs;
        let match;
        let matchedUrl = null;
        while ((match = regex.exec(searchHtml)) !== null) {
            const href = match[1];
            // For TV, prefer /series/ links over /peliculas/
            if (type === "tv" && !href.includes("/series/")) continue;
            matchedUrl = href;
            break;
        }
        // Fallback: if no TV match found, try any match
        if (!matchedUrl && type === "tv") {
            regex.lastIndex = 0;
            while ((match = regex.exec(searchHtml)) !== null) {
                matchedUrl = match[1];
                break;
            }
        }

        if (!matchedUrl) return [];

        let targetUrl = matchedUrl;
        if (type === "tv") {
            // New theme (2025+): episodes use /episode/SLUG-SxE/ pattern
            // Extract series slug from the matched URL
            const slugMatch = matchedUrl.match(/\/series\/([^\/]+)\/?/);
            const seriesSlug = slugMatch ? slugMatch[1] : "";
            if (seriesSlug) {
                targetUrl = `https://cine24h.online/episode/${seriesSlug}-${season}x${episode}/`;
                console.log(`[Cine24h] TV episode URL: ${targetUrl}`);
            } else {
                // Fallback to old method: fetch series page and find SxE in links
                const seriesHtml = await fetch(matchedUrl, { headers: HEADERS }).then(r => r.text());
                const cleanSeries = seriesHtml.replace(/\n|\r|\t|\s{2,}/g, '');
                const epRegex = new RegExp(`href="([^"]*episode[^"]*-${season}x${episode}[^"]*)"`, 'i');
                const epMatch = cleanSeries.match(epRegex);
                if (!epMatch) return [];
                targetUrl = epMatch[1];
                if (targetUrl.startsWith("/")) targetUrl = "https://cine24h.online" + targetUrl;
            }
        }

        const episodeHtml = await fetch(targetUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];

        const cleanEpisodeHtml = episodeHtml.replace(/\n|\r|\t|\s{2,}/g, '');
        // New theme (2025+): options use <li data-src="BASE64" data-option> with nested spans
        const optLiRegex = /<li[^>]*data-src="([^"]+)"[^>]*data-option[^>]*>([\s\S]*?)<\/li>/gi;
        let optLiMatch;
        while ((optLiMatch = optLiRegex.exec(cleanEpisodeHtml)) !== null) {
            const encodedUrl = optLiMatch[1];
            const block = optLiMatch[2];

            // Extract language from span text: LAT, ESP, SUB, VOSE
            let lang = "Lat";
            const langMatch = block.match(/<span[^>]*>\s*(LAT|ESP|SUB|VOSE|VO|CAST)\s*<\/span>/i);
            if (langMatch) {
                const raw = langMatch[1].toUpperCase();
                if (raw === "ESP" || raw === "CAST") lang = "Esp";
                else if (raw === "SUB" || raw === "VOSE" || raw === "VO") lang = "Vose";
                else lang = "Lat";
            }

            // Extract quality from inner span (e.g., <span>720HD</span>)
            let qlty = "HD";
            const qualMatch = block.match(/<span[^>]*>\s*(\d{3,4}(?:HD|p|K)?)\s*<\/span>/i);
            if (qualMatch) qlty = qualMatch[1];

            // Server name from button number or first span
            let serverName = "Server";
            const numMatch = block.match(/<span[^>]*class="[^"]*nmopt[^"]*"[^>]*>\s*(\d+)\s*<\/span>/i);
            if (numMatch) serverName = "Option " + numMatch[1];

            // Skip known non-working servers (fmd, msn, jet, gou)
            if (encodedUrl.length < 20) continue;

            let decodedUrl = encodedUrl;
            if (!encodedUrl.startsWith("http")) {
                try {
                    decodedUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
                } catch (e) {
                    continue;
                }
            }
            if (!decodedUrl || !decodedUrl.startsWith("http")) continue;

            streams.push({
                name: "Cine24H",
                title: `${serverName} (${lang})`,
                url: decodedUrl,
                quality: qlty,
                headers: { Referer: targetUrl }
            });
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

        // Resolve iframes to direct streams
        const resolvedStreams = [];
        for (let s of streams) {
            try {
                let embRes = await fetch(s.url, { headers: HEADERS });
                let embHtml = await embRes.text();
                
                let trueEmbedUrl = s.url;
                
                // If it's an intermediate page containing an iframe, extract it
                const iframeMatch = embHtml.match(/<iframe[^>]*src="([^"]+)"/i);
                if (iframeMatch) {
                    trueEmbedUrl = iframeMatch[1];
                    if (trueEmbedUrl.startsWith("//")) trueEmbedUrl = "https:" + trueEmbedUrl;
                    
                    // Fetch the true embed
                    embRes = await fetch(trueEmbedUrl, { headers: HEADERS });
                    embHtml = await embRes.text();
                }
                
                // Try to find raw m3u8
                let m3u8Match = embHtml.match(/(https:\/\/[^"']+\.m3u8[^"']*)/i);
                if (m3u8Match && !m3u8Match[1].includes("youtube")) {
                    s.url = m3u8Match[1];
                    resolvedStreams.push(s);
                    continue;
                }
                
                // Try Dean Edwards unpacker for Filemoon/others
                const packedMatch = embHtml.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
                if (packedMatch) {
                    let unpacked = decodePacker(packedMatch[0]);
                    let m3u8Unpacked = unpacked.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/i) || unpacked.match(/(https:\/\/[^"']+\.m3u8[^"']*)/i);
                    let mp4Unpacked = unpacked.match(/file:\s*["']([^"']+\.mp4[^"']*)["']/i) || unpacked.match(/(https:\/\/[^"']+\.mp4[^"']*)/i);
                    
                    if (m3u8Unpacked) {
                        s.url = m3u8Unpacked[1];
                        resolvedStreams.push(s);
                        continue;
                    } else if (mp4Unpacked) {
                        s.url = mp4Unpacked[1];
                        resolvedStreams.push(s);
                        continue;
                    }
                }
                
                // VOE specific (fallback)
                if (trueEmbedUrl.includes('voe.sx') || trueEmbedUrl.includes('voe.network')) {
                     const hlsVoe = embHtml.match(/'hls':\s*'([^']+)'/);
                     if (hlsVoe) {
                         s.url = hlsVoe[1];
                         resolvedStreams.push(s);
                         continue;
                     }
                }
                
                // Try to find raw mp4
                let mp4Match = embHtml.match(/(https:\/\/[^"']+\.mp4[^"']*)/i);
                if (mp4Match) {
                    s.url = mp4Match[1];
                    resolvedStreams.push(s);
                    continue;
                }
            } catch(e) {
                // ignore
            }
        }
        
        return resolvedStreams;
    } catch (e) {
        console.log(`[Cine24H] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
