/**
 * AnimeJL — anime-jl.net
 * Embeds: voe.sx, vidhide, cdnwish, mp4upload, streamtape, uqload via iframe blocks.
 * Resolves via embed69.
 */
var streamLabels = (function(){try{return require("./stream_labels.js")}catch(e){return null}})();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
 return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};
const HOST = "https://anime-jl.net";
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

async function searchSite(searchTitle) {
    const html = await fetch(`${HOST}/animes?q=${encodeURIComponent(searchTitle)}`, {
        headers: { ...HEADERS, "Referer": HOST + "/" }
    }).then(r => r.text());

    const ns = norm(searchTitle);
    const articles = [...html.matchAll(/<article([\s\S]*?)<\/article>/gi)];
    for (const [, article] of articles) {
        const href = (article.match(/<a href='([^']+)'/) || [])[1] || "";
        const title = (article.match(/<h3 class='Title'>([^<]+)<\/h3>/) || [])[1] || "";
        if (!href || !title) continue;
        const cleanTitle = title.replace(/&#039;/g, "'").replace(/&quot;/g, "").trim();
        if (norm(cleanTitle).includes(ns) || ns.includes(norm(cleanTitle)))
            return href;
    }
    return null;
}

async function getEmbedUrls(episodeUrl) {
    const html = await fetch(episodeUrl, {
        headers: { ...HEADERS, "Referer": HOST + "/" }
    }).then(r => r.text());

    const embeds = [];
    // Extract: video[N] = '<iframe src="URL"...>'
    const videoBlocks = [...html.matchAll(/video\[\d+\]\s*=\s*'<iframe[^>]*src="([^"]+)"/gi)];
    for (const [, url] of videoBlocks) {
        if (url.startsWith("http")) embeds.push(url);
    }

    // Also check var video = {...} blocks with <a href="URL">
    const varVideo = html.match(/var video\s*=\s*([\s\S]*?)<\/script>/);
    if (varVideo) {
        const hrefs = [...varVideo[1].matchAll(/<a href="([^"]+)"/g)];
        for (const [, url] of hrefs) {
            if (url.startsWith("http")) embeds.push(url);
        }
    }

    return [...new Set(embeds)];
}

async function getStreams(id, type, season, episode, title) {
    console.warn(`[AnimeJL] Resolving: ${id} (${type}) S${season}E${episode} "${title || ""}"`);
    if (!id && !title) return [];

    try {
        let searchTitle = title;
        if (id) { const info = await getTmdbInfo(id, type); if (info) searchTitle = info.title || title; }
        if (!searchTitle) return [];

        const seriesUrl = await searchSite(searchTitle);
        if (!seriesUrl) { console.warn(`[AnimeJL] Not found: "${searchTitle}"`); return []; }
        console.warn(`[AnimeJL] Series: ${seriesUrl}`);

        // For TV: append /episodio-N to series URL
        let pageUrl = seriesUrl;
        if (type === "tv" && episode) {
            pageUrl = seriesUrl.replace(/\/$/, "") + `/episodio-${parseInt(episode, 10)}`;
            console.warn(`[AnimeJL] Episode: ${pageUrl}`);
        }

        const embeds = await getEmbedUrls(pageUrl);
        if (!embeds.length) { console.warn("[AnimeJL] No embeds"); return []; }
        console.warn(`[AnimeJL] Embeds: ${embeds.length}`);

        const { resolveEmbed } = require("./embed69.js");
        const streams = [];

        for (const embedUrl of embeds) {
            const server = (embedUrl.match(/:\/\/(?:www\.)?([^.]+)\./) || [])[1] || "?";
            const result = await resolveEmbed(embedUrl, server);
            if (result && result.url && result.url.startsWith("http")) {
                streams.push({
                    provider: "AnimeJL",
                    title: server,
                    url: result.url,
                    quality: result.quality || "HD",
                    headers: { Referer: embedUrl, "User-Agent": UA }
                });
                console.warn(`[AnimeJL] Resolved: ${server} → ${result.url.slice(0, 70)}`);
            }
        }

        console.warn(`[AnimeJL] Found ${streams.length} streams`);
        return streams;
    } catch (e) {
        console.warn(`[AnimeJL] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
