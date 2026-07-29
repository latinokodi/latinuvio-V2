/**
 * PelisPlusHD NZ — pelisplushd.bz
 * Uses embed69.org embeds. Extract embed69 URL → resolve via embed69 module.
 */
var streamLabels = (function(){try{return require("./stream_labels.js")}catch(e){return null}})();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
 return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};
const HOST = "https://pelisplushd.bz";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

async function getTmdbInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return { title: type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name) };
    } catch (e) { return null; }
}

function slugToTitle(slug) {
    return slug.replace(/-[a-zA-Z0-9]{6}$/, "").replace(/-/g, " ");
}

async function searchSite(searchTitle, type) {
    const pages = type === "tv" ? ["/series"] : ["/peliculas", "/peliculas/populares"];
    const ns = norm(searchTitle);

    for (const page of pages) {
        try {
            const html = await fetch(HOST + page, { headers: HEADERS }).then(r => r.text());
            const slugs = [...new Set([...html.matchAll(/pelicula\/([a-z0-9-]+)/gi)].map(m => m[1]))];
            for (const slug of slugs) {
                if (norm(slugToTitle(slug)).includes(ns) || ns.includes(norm(slugToTitle(slug))))
                    return `${HOST}/pelicula/${slug}`;
            }
        } catch (e) {}
    }

    try {
        const html = await fetch(`${HOST}/search?s=${encodeURIComponent(searchTitle)}`, { headers: HEADERS }).then(r => r.text());
        const slugs = [...new Set([...html.matchAll(/pelicula\/([a-z0-9-]+)/gi)].map(m => m[1]))];
        for (const slug of slugs) {
            if (norm(slugToTitle(slug)).includes(ns) || ns.includes(norm(slugToTitle(slug))))
                return `${HOST}/pelicula/${slug}`;
        }
    } catch (e) {}

    return null;
}

async function getStreams(id, type, season, episode, title) {
    console.warn(`[PelisPlusHDnz] Resolving: ${id} (${type}) "${title || ""}"`);
    if (!id && !title) return [];

    try {
        // Try user-provided title first, then TMDB Spanish title
        let searchTitle = title;
        const info = id ? await getTmdbInfo(id, type) : null;
        const tmdbTitle = info ? info.title : null;

        let pageUrl = searchTitle ? await searchSite(searchTitle, type) : null;
        if (!pageUrl && tmdbTitle && tmdbTitle !== searchTitle) {
            console.warn(`[PelisPlusHDnz] Retrying with TMDB: "${tmdbTitle}"`);
            pageUrl = await searchSite(tmdbTitle, type);
            searchTitle = tmdbTitle;
        }
        if (!pageUrl) { console.warn(`[PelisPlusHDnz] Not found: "${searchTitle}"`); return []; }
        console.warn(`[PelisPlusHDnz] Found: ${pageUrl}`);

        const html = await fetch(pageUrl, { headers: { ...HEADERS, "Referer": HOST + "/" } }).then(r => r.text());

        // Extract IMDB ID for embed69
        const imdbMatch = html.match(/\/title\/(tt\d+)/) || html.match(/embed69[^"'\s]*\/f\/(tt\d+)/);
        if (!imdbMatch) { console.warn("[PelisPlusHDnz] No IMDB ID found"); return []; }

        const imdbId = imdbMatch[1];
        console.warn(`[PelisPlusHDnz] Resolving IMDB ${imdbId} via embed69`);

        const embed69 = require("./embed69.js");
        return await embed69.getStreams(imdbId, type, season, episode, title);

    } catch (e) {
        console.warn(`[PelisPlusHDnz] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
