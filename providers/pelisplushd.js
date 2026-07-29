/**
 * PelisPlusHD — pelisplushd.la
 * Extracts embed URLs from data-url attributes, resolves via embed69.
 */
const { resolveEmbed } = require("./embed69.js");
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const HOST = "https://www.pelisplushd.la";
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
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return { title: type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name) };
    } catch (e) { return null; }
}

async function searchSite(searchTitle, type) {
    const url = `${HOST}/search?s=${encodeURIComponent(searchTitle).replace(/%20/g, "+")}&page=1`;
    const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
    const cleaned = html.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");
    const block = (cleaned.match(/<div class="Posters">(.*?)<div class="copyright">/) || [])[1] || cleaned;
    const matches = [...block.matchAll(/<a([^]*?)<\/div><\/div>/gi)];
    const ns = norm(searchTitle);
    const wantSeries = type === "tv";

    for (const m of matches) {
        const href = (m[1].match(/href="([^"]*)"/) || [])[1];
        const title = (m[1].match(/<p>([^<]*)<\/p>/) || [])[1];
        if (!href || !title) continue;
        const isSeries = href.includes("/serie/");
        if (wantSeries !== isSeries) continue;
        const cleanTitle = title.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");
        if (norm(cleanTitle).includes(ns) || ns.includes(norm(cleanTitle)))
            return href.startsWith("/") ? HOST + href : href;
    }
    return null;
}

async function findEpisodeUrl(seriesUrl, season, episode) {
    const html = await fetch(seriesUrl, { headers: { ...HEADERS, "Referer": HOST + "/" } }).then(r => r.text());
    const cleaned = html.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");
    const targetS = String(parseInt(season, 10));
    const seasonBlock = (cleaned.match(new RegExp(
        `data-toggle="tab">(?:Temporada|TEMPORADA)\\s*${targetS}[^<]*</a>(.*?)<div class="clear">`
    )) || [])[1];
    if (!seasonBlock) return null;
    const epLinks = [...seasonBlock.matchAll(/<a href="([^"]*)".*?">([^<]*)<\/a>/gi)];
    const targetE = String(parseInt(episode, 10));
    for (const [, href, text] of epLinks) {
        const em = text.match(/(?:capitulo|episodio)[- ]?(\d+)/i) || href.match(/(?:capitulo|episodio)[- /](\d+)/i);
        if (em && em[1] === targetE) return href.startsWith("/") ? HOST + href : href;
    }
    return null;
}

async function getStreams(id, type, season, episode, title) {
    console.warn(`[PelisPlusHD] Resolving: ${id} (${type})${type === "tv" ? ` S${season}E${episode}` : ""} "${title || ""}"`);
    if (!id && !title) return [];

    try {
        let searchTitle = title;
        if (id) { const info = await getTmdbInfo(id, type); if (info) searchTitle = info.title || title; }
        if (!searchTitle) return [];

        let pageUrl = await searchSite(searchTitle, type);
        if (!pageUrl) { console.warn(`[PelisPlusHD] Not found: "${searchTitle}"`); return []; }
        console.warn(`[PelisPlusHD] Found: ${pageUrl}`);

        if (type === "tv" && season && episode) {
            const epUrl = await findEpisodeUrl(pageUrl, season, episode);
            if (!epUrl) { console.warn(`[PelisPlusHD] Episode S${season}E${episode} not found`); return []; }
            pageUrl = epUrl;
        }

        const html = await fetch(pageUrl, { headers: { ...HEADERS, "Referer": HOST + "/" } }).then(r => r.text());
        const cleaned = html.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");

        // Extract data-url="..." data-name="Lang" pairs
        const dataMatches = [...cleaned.matchAll(/data-url="([^"]+)"[^>]*data-name="([^"]+)"/gi)];
        const streams = [];

        for (const [, embedUrl, langName] of dataMatches) {
            if (!embedUrl.startsWith("http")) continue;
            const lang = langName === "Subtitulado" ? "Vose" : langName === "Español" ? "Esp" : "Lat";
            const server = embedUrl.split("/")[2]?.replace("www.", "").split(".")[0] || "?";

            const result = await resolveEmbed(embedUrl, server);
            if (result && result.url && result.url.startsWith("http")) {
                streams.push({
                    provider: "PelisPlusHD",
                    title: `${server} · ${lang}`,
                    url: result.url,
                    quality: result.quality || "HD",
                    headers: { Referer: embedUrl, "User-Agent": UA }
                });
                console.warn(`[PelisPlusHD] Resolved: ${server} (${lang}) → ${result.url.slice(0, 70)}`);
            }
        }

        // Also try span lid="N" url="URL" pattern (older pages)
        const spanMatches = [...cleaned.matchAll(/<span\s+lid="\d+"[^>]*url="([^"]+)"/gi)];
        for (const [, embedUrl] of spanMatches) {
            if (!embedUrl.startsWith("http")) continue;
            const server = embedUrl.split("/")[2]?.replace("www.", "").split(".")[0] || "?";

            const result = await resolveEmbed(embedUrl, server);
            if (result && result.url && result.url.startsWith("http")) {
                streams.push({
                    provider: "PelisPlusHD",
                    title: server,
                    url: result.url,
                    quality: result.quality || "HD",
                    headers: { Referer: embedUrl, "User-Agent": UA }
                });
                console.warn(`[PelisPlusHD] Resolved: ${server} → ${result.url.slice(0, 70)}`);
            }
        }

        console.warn(`[PelisPlusHD] Found ${streams.length} streams`);
        return streams;
    } catch (e) {
        console.warn(`[PelisPlusHD] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
