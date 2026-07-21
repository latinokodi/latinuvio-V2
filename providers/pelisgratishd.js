const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://ver.pelis28.net";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Referer": "https://pelis28.net/",
    "Connection": "keep-alive"
};

async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            original_title: type === "movie" ? res.original_title : res.original_name,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        console.warn(`[PelisGratisHD] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode, title) {
    console.warn(`[PelisGratisHD] Resolving: ${id} Type=${type} S${season}E${episode} (${title})`);
    
    let searchTitle = title;
    const tmdbInfo = await getTMDBInfo(id, type);
    if (tmdbInfo) {
        searchTitle = tmdbInfo.title || tmdbInfo.original_title || title;
    }

    if (!searchTitle) return [];

    try {
        // Step 1: Search on Pelis28
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(searchTitle).replace(/%20/g, "+")}`;
        const searchHtml = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());

        // Extract result items
        const itemRegex = /<div class="result-item">([\s\S]*?)<\/article>/gi;
        let match;
        let matchedUrl = null;
        const cleanSearchTitle = searchTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

        while ((match = itemRegex.exec(searchHtml)) !== null) {
            const itemHtml = match[1];
            const linkMatch = itemHtml.match(/<div class="title"><a href="([^"]+)">([^<]+)<\/a>/i);
            if (!linkMatch) continue;

            const href = linkMatch[1];
            const itemTitle = linkMatch[2].toLowerCase().replace(/[^a-z0-9]/g, '');

            if (itemTitle.includes(cleanSearchTitle) || cleanSearchTitle.includes(itemTitle)) {
                matchedUrl = href;
                break;
            }
        }

        if (!matchedUrl) {
            // Fallback to first result if no title matched exactly
            itemRegex.lastIndex = 0;
            const firstMatch = itemRegex.exec(searchHtml);
            if (firstMatch) {
                const linkMatch = firstMatch[1].match(/<div class="title"><a href="([^"]+)">/i);
                if (linkMatch) matchedUrl = linkMatch[1];
            }
        }

        if (!matchedUrl) {
            console.warn(`[PelisGratisHD] No match found on Pelis28 for: ${searchTitle}`);
            return [];
        }

        console.warn(`[PelisGratisHD] Matched URL: ${matchedUrl}`);

        let targetUrl = matchedUrl;

        // Step 2: If TV series, resolve episode URL from season/episode tabs
        if (type === "tv") {
            const seriesHtml = await fetch(matchedUrl, { headers: HEADERS }).then(r => r.text());
            
            // Look for <div class="numerando">S-E</div> and the corresponding href in the same list item
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            let episodeHref = null;
            const targetCode = `${parseInt(season, 10)}x${parseInt(episode, 10)}`;
            const targetCodeLeading = `${String(season).padStart(2, '0')}x${String(episode).padStart(2, '0')}`;

            while ((match = liRegex.exec(seriesHtml)) !== null) {
                const liHtml = match[1];
                const numerandoMatch = liHtml.match(/<div class="numerando">([^<]+)<\/div>/i);
                if (!numerandoMatch) continue;

                const code = numerandoMatch[1].trim();
                if (code === targetCode || code === targetCodeLeading) {
                    const hrefMatch = liHtml.match(/<a href="([^"]+)">/i);
                    if (hrefMatch) {
                        episodeHref = hrefMatch[1];
                        break;
                    }
                }
            }

            if (!episodeHref) {
                console.warn(`[PelisGratisHD] Episode ${targetCode} not found on series page`);
                return [];
            }

            targetUrl = episodeHref;
            console.warn(`[PelisGratisHD] Matched episode URL: ${targetUrl}`);
        }

        // Step 3: Fetch movie/episode page and extract player options
        const targetHtml = await fetch(targetUrl, { headers: HEADERS }).then(r => r.text());
        
        // Extract DooPlayer options: data-type, data-post, data-nume
        const optionRegex = /<li id='player-option-[^']+' class='dooplay_player_option' data-type='([^']*)' data-post='([^']*)' data-nume='([^']*)'>([\s\S]*?)<\/li>/gi;
        const playerOptions = [];

        while ((match = optionRegex.exec(targetHtml)) !== null) {
            const optType = match[1];
            const optPost = match[2];
            const optNume = match[3];
            const optContent = match[4];

            const titleMatch = optContent.match(/<span class='title'>([^<]+)<\/span>/i);
            const optTitle = titleMatch ? titleMatch[1].toUpperCase() : "LATINO HD";

            playerOptions.push({
                type: optType,
                post: optPost,
                nume: optNume,
                title: optTitle
            });
        }

        if (!playerOptions.length) {
            console.warn(`[PelisGratisHD] No player options found on page`);
            return [];
        }

        const streams = [];

async function resolveEmbedUrl(url, ref) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": ref || url,
                "Accept": "*/*"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const html = await response.text();
        
        let finalUrl = null;
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (packedMatch) {
            try {
                const match = packedMatch[0].match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
                if (match) {
                    let [full, p, a, c, k] = match;
                    a = parseInt(a); c = parseInt(c); k = k.split('|');
                    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
                    const decode = (l, s) => { let res = ''; while (l > 0) { res = chars[l % s] + res; l = Math.floor(l / s); } return res || '0'; };
                    const unpacked = p.replace(/\b\w+\b/g, (l) => { const s = parseInt(l, 36); return s < k.length && k[s] ? k[s] : decode(s, a); });
                    
                    const hlsMatch = unpacked.match(/"hls[24]"\s*:\s*"([^"]+)"/) || unpacked.match(/file\s*:\s*["']([^"']+)["']/i);
                    if (hlsMatch) finalUrl = hlsMatch[1];
                }
            } catch(e) {}
        }
        
        if (!finalUrl) {
            const rawMatch = html.match(/"hls[24]"\s*:\s*"([^"]+)"/) || html.match(/file\s*:\s*["']([^"']+)["']/i) || html.match(/["'](https?:\/\/[^"']+?\/stream\/[^"']+?\.m3u8[^"']*?)["']/i) || html.match(/source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
            if (rawMatch) finalUrl = rawMatch[1];
        }

        if (finalUrl) {
            if (!finalUrl.startsWith("http")) finalUrl = new URL(url).origin + (finalUrl.startsWith("/") ? "" : "/") + finalUrl;
            return finalUrl;
        }
    } catch(e) {
        return null;
    }
    return null;
}

        // Step 4: Direct REST API query to fetch direct links for each player option
        for (const opt of playerOptions) {
            try {
                const apiPlayerUrl = `${BASE_URL}/wp-json/dooplayer/v2/${opt.post}/${opt.type}/${opt.nume}`;
                const apiRes = await fetch(apiPlayerUrl, { headers: { ...HEADERS, "Accept": "application/json" } }).then(r => r.json());
                
                if (apiRes && apiRes.embed_url) {
                    const embedUrl = apiRes.embed_url;
                    if (!embedUrl.startsWith("http")) continue;

                    let serverName = "Direct";
                    if (embedUrl.includes("dood")) serverName = "DoodStream";
                    else if (embedUrl.includes("streamtape")) serverName = "Streamtape";
                    else if (embedUrl.includes("uqload")) serverName = "Uqload";
                    else if (embedUrl.includes("voe")) serverName = "VOE";
                    else if (embedUrl.includes("fembed")) serverName = "Fembed";
                    else if (embedUrl.includes("filemoon")) serverName = "Filemoon";
                    else if (embedUrl.includes("mixdrop")) serverName = "MixDrop";
                    else {
                        try {
                            serverName = new URL(embedUrl).hostname.replace("www.", "").split(".")[0];
                        } catch(e) {}
                    }

                    // Map languages based on option title
                    let lang = "Latino";
                    if (opt.title.includes("ESPAÑOL") || opt.title.includes("CASTELLANO") || opt.title.includes("ESP")) {
                        lang = "Castellano";
                    } else if (opt.title.includes("SUB") || opt.title.includes("VOSE")) {
                        lang = "VOSE";
                    }

                    const directMediaUrl = await resolveEmbedUrl(embedUrl, targetUrl);
                    
                    if (directMediaUrl) {
                        streams.push({
                            provider: "PelisGratisHD",
                            title: `${serverName.toUpperCase()} (${lang})`,
                            url: directMediaUrl,
                            quality: "HD",
                            headers: { Referer: new URL(embedUrl).origin }
                        });
                    }
                }
            } catch(e) {
                console.warn(`[PelisGratisHD] Error calling player option API: ${e.message}`);
            }
        }

        return streams;
    } catch (err) {
        console.warn(`[PelisGratisHD] Scraping Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
