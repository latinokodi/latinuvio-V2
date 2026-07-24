const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://www.veronline.tax";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Referer": "https://www.veronline.tax/",
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
        console.warn(`[VerOnline] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode, title) {
    if (type !== "tv") return []; // VerOnline is series only

    console.warn(`[VerOnline] Resolving series: ${id} S${season}E${episode} (${title})`);
    
    let tvTitle = title;
    const tmdbInfo = await getTMDBInfo(id, type);
    if (tmdbInfo) {
        tvTitle = tmdbInfo.title || tmdbInfo.original_title || title;
    }

    if (!tvTitle) return [];

    try {
        // Step 1: Search on VerOnline
        const searchUrl = `${BASE_URL}/recherche?q=${encodeURIComponent(tvTitle).replace(/%20/g, "+")}`;
        const searchHtml = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());

        const searchRegex = /<a\s+href="([^"]+)"\s+title="([^"]+)"\s+class="short-images-link">/gi;
        let match;
        let matchedSeriesUrl = null;
        const cleanTvTitle = tvTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

        while ((match = searchRegex.exec(searchHtml)) !== null) {
            const href = match[1];
            const itemTitle = match[2].toLowerCase().replace(/[^a-z0-9]/g, '');
            if (itemTitle.includes(cleanTvTitle) || cleanTvTitle.includes(itemTitle)) {
                matchedSeriesUrl = href;
                break;
            }
        }

        if (!matchedSeriesUrl) {
            // Fallback to first search result if no title matched exactly
            searchRegex.lastIndex = 0;
            const firstMatch = searchRegex.exec(searchHtml);
            if (firstMatch) {
                matchedSeriesUrl = firstMatch[1];
            }
        }

        if (!matchedSeriesUrl) {
            console.warn(`[VerOnline] No series found matching: ${tvTitle}`);
            return [];
        }

        console.warn(`[VerOnline] Found series page: ${matchedSeriesUrl}`);

        // Step 2: Fetch Series Page and find Season URL
        const seriesHtml = await fetch(matchedSeriesUrl, { headers: HEADERS }).then(r => r.text());
        const seasonRegex = /<a href="([^"]+)" class="short-images-link">[\s\S]*?<figcaption>Temporada\s*(\d+)<\/figcaption>/gi;
        let seasonUrl = null;

        while ((match = seasonRegex.exec(seriesHtml)) !== null) {
            const href = match[1];
            const seasonNum = parseInt(match[2], 10);
            if (seasonNum === parseInt(season, 10)) {
                seasonUrl = href;
                break;
            }
        }

        if (!seasonUrl) {
            console.warn(`[VerOnline] Season ${season} not found`);
            return [];
        }

        console.warn(`[VerOnline] Found season page: ${seasonUrl}`);

        // Step 3: Fetch Season Page and find Episode URL
        const seasonHtml = await fetch(seasonUrl, { headers: HEADERS }).then(r => r.text());
        const episodeRegex = /<a href="([^"]+)">\s*<span>(?:Episodio|Capitulo|Capítulo)\s*(\d+)<\/span>\s*<\/a>/gi;
        let episodeUrl = null;

        while ((match = episodeRegex.exec(seasonHtml)) !== null) {
            const href = match[1];
            const episodeNum = parseInt(match[2], 10);
            if (episodeNum === parseInt(episode, 10)) {
                episodeUrl = href;
                break;
            }
        }

        if (!episodeUrl) {
            console.warn(`[VerOnline] Episode ${episode} not found`);
            return [];
        }

        console.warn(`[VerOnline] Found episode page: ${episodeUrl}`);

        // Step 4: Fetch Episode Page and parse streamer options
        const episodeHtml = await fetch(episodeUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];

        // Match each <li class="streamer">...</li> block to align players with language icons
        const liRegex = /<li class="streamer">([\s\S]*?)<\/li>/gi;
        const LANG_MAP = {
            "latino": "Latino",
            "de": "Castellano",
            "subtitulado": "VOSE",
            "vo": "VO"
        };

        while ((match = liRegex.exec(episodeHtml)) !== null) {
            const block = match[1];
            const dataUrlMatch = block.match(/data-url="\/streamer\/([^"]+)"/i);
            if (!dataUrlMatch) continue;

            try {
                const base64Url = dataUrlMatch[1];
                const decodedUrl = Buffer.from(base64Url, "base64").toString("utf-8");

                // Parse server display name
                let serverName = "Direct";
                if (decodedUrl.includes("waaw")) serverName = "WAAW";
                else if (decodedUrl.includes("dood")) serverName = "DoodStream";
                else if (decodedUrl.includes("uqload")) serverName = "Uqload";
                else if (decodedUrl.includes("streamtape")) serverName = "Streamtape";
                else if (decodedUrl.includes("voe")) serverName = "VOE";
                else if (decodedUrl.includes("fembed")) serverName = "Fembed";
                else {
                    try {
                        serverName = new URL(decodedUrl).hostname.replace("www.", "").split(".")[0];
                    } catch(e) {}
                }

                // Parse language icon
                const langIconMatch = block.match(/\/icon\/([^.]+)\.png/i);
                const langCode = langIconMatch ? langIconMatch[1].toLowerCase() : "vo";
                const lang = LANG_MAP[langCode] || "VO";

                streams.push({
                    name: "VerOnline",
                    title: `${serverName.toUpperCase()} (${lang})`,
                    url: decodedUrl,
                    quality: "HD",
                    headers: { Referer: episodeUrl }
                });
            } catch(e) {
                console.warn(`[VerOnline] Error decoding base64 link: ${e.message}`);
            }
        }

        return streams;
    } catch (err) {
        console.warn(`[VerOnline] Scraping Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
