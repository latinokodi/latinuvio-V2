const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const API_URL = "https://fluxcedene.net/api/gql";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://peliculasflix.co/",
    "Content-Type": "application/json",
    "x-access-platform": "lDakkGUZx7_nX25Nv1CJVbz_ZAjMKMTcwNTQyMzU4Nw=="
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
        console.warn(`[PeliculasFlix] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode, title) {
    if (type !== "movie") return []; // PeliculasFlix is movie only

    console.warn(`[PeliculasFlix] Resolving movie: ${id} (${title})`);
    
    let movieTitle = title;
    let movieYear = "";

    const tmdbInfo = await getTMDBInfo(id, type);
    if (tmdbInfo) {
        movieTitle = tmdbInfo.title || tmdbInfo.original_title || title;
        movieYear = tmdbInfo.year;
    }

    if (!movieTitle) return [];

    try {
        // Step 1: Search movie via GraphQL
        const searchBody = {
            operationName: "searchAll",
            variables: { input: movieTitle },
            query: "query searchAll($input: String!) {\n  searchFilm(input: $input, limit: 10) {\n    _id\n    slug\n    title\n    name\n  }\n}\n"
        };

        const searchRes = await fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(searchBody)
        }).then(r => r.json());

        const items = searchRes.data?.searchFilm || [];
        if (!items.length) {
            console.warn(`[PeliculasFlix] No search results for: ${movieTitle}`);
            return [];
        }

        // Find best slug match (case insensitive match on title or name)
        let bestItem = items[0];
        const cleanTitle = movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const item of items) {
            const itemTitle = (item.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const itemName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            if (itemTitle === cleanTitle || itemName === cleanTitle) {
                bestItem = item;
                break;
            }
        }

        console.warn(`[PeliculasFlix] Found matching slug: ${bestItem.slug}`);

        // Step 2: Fetch details & streams via GraphQL
        const detailBody = {
            operationName: "detailFilm",
            variables: { slug: bestItem.slug },
            query: "query detailFilm($slug: String!) {\n  detailFilm(filter: {slug: $slug}) {\n    name\n    title\n    links_online {\n      _id\n      server\n      lang\n      link\n      page\n    }\n  }\n}\n"
        };

        const detailRes = await fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(detailBody)
        }).then(r => r.json());

        const links = detailRes.data?.detailFilm?.links_online || [];
        const streams = [];

        const LANG_MAP = {
            "38": "Latino",
            "37": "Castellano",
            "192": "VOSE"
        };

        for (const linkObj of links) {
            const link = linkObj.link;
            if (!link || typeof link !== "string" || !link.startsWith("http")) continue;

            // Extract host name/server for nice titles
            let serverName = "Direct";
            if (link.includes("dood")) serverName = "DoodStream";
            else if (link.includes("streamtape")) serverName = "Streamtape";
            else if (link.includes("sbplay") || link.includes("sbembed") || link.includes("playersb")) serverName = "StreamPlay";
            else if (link.includes("pelisplus")) serverName = "PelisPlus";
            else if (link.includes("uqload")) serverName = "Uqload";
            else if (link.includes("fembed")) serverName = "Fembed";
            else if (link.includes("voe")) serverName = "VOE";
            else if (link.includes("filemoon")) serverName = "Filemoon";
            else if (link.includes("mixdrop")) serverName = "MixDrop";
            else {
                try {
                    const host = new URL(link).hostname.replace("www.", "");
                    serverName = host.split(".")[0];
                } catch(e) {}
            }

            const langCode = String(linkObj.lang);
            const lang = LANG_MAP[langCode] || "VOSE";

            streams.push({
                name: "PeliculasFlix",
                title: `${serverName.toUpperCase()} (${lang})`,
                url: link,
                quality: "HD",
                headers: { Referer: "https://peliculasflix.co/" }
            });
        }

        return streams;
    } catch (err) {
        console.warn(`[PeliculasFlix] Scraping Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
