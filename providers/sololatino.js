/**
 * SoloLatino provider.
 * Searches sololatino.net → extracts IMDB ID → resolves via embed69 to direct m3u8.
 *
 * embed69 handles: POW challenge, vidhide/streamwish/voe resolution, m3u8 extraction.
 * Falls back to embed69.org/f/<imdb_id> isEmbed if embed69 module unavailable (QuickJS).
 */
const BASE_URL = "https://sololatino.net";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Referer": BASE_URL + "/",
    "Connection": "keep-alive"
};

// ─── TMDB helpers ──────────────────────────────────────────────────────

async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            imdb_id: res.imdb_id || null,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        return null;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function norm(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ─── Search & match ─────────────────────────────────────────────────────

async function searchSite(searchTitle, type) {
    const searchUrl = `${BASE_URL}/buscar?q=${encodeURIComponent(searchTitle).replace(/%20/g, "+")}`;
    const html = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());
    const cleaned = html.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");

    const cardRegex = /<div class="card">([\s\S]*?)<\/div><\/div><\/a>/gi;
    let match;
    const results = [];
    const ns = norm(searchTitle);
    const wantSeries = type === "tv";

    while ((match = cardRegex.exec(cleaned)) !== null) {
        const cardHtml = match[1];
        const href = cardHtml.match(/href="(.*?)"/);
        const altTitle = cardHtml.match(/alt="(.*?)"/);
        if (!href || !altTitle) continue;
        if (href[1].includes("guia-solo-latino")) continue;

        const isSeries = href[1].includes("/serie/");
        if (wantSeries && !isSeries) continue;
        if (!wantSeries && isSeries) continue;

        const na = norm(altTitle[1]);
        if (na.includes(ns) || ns.includes(na)) {
            return href[1];
        }
        results.push({ url: href[1], title: altTitle[1], isSeries });
    }

    for (const r of results) {
        if (wantSeries === r.isSeries) return r.url;
    }
    return results.length ? results[0].url : null;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function getStreams(id, type, season, episode, title) {
    console.warn(`[SoloLatino] Resolving: ${id} Type=${type} S${season}E${episode} (${title})`);

    const tmdbInfo = await getTMDBInfo(id, type);
    let searchTitle = title;
    let imdbId = null;
    if (tmdbInfo) {
        searchTitle = tmdbInfo.title || title;
        imdbId = tmdbInfo.imdb_id || null;
    }
    if (!searchTitle) return [];

    try {
        // Step 1: Search on sololatino.net
        const matchedUrl = await searchSite(searchTitle, type);
        if (!matchedUrl) {
            console.warn(`[SoloLatino] No match found for: ${searchTitle}`);
            return [];
        }
        console.warn(`[SoloLatino] Matched URL: ${matchedUrl}`);

        let targetUrl = matchedUrl;

        // Step 2: For TV, resolve season/episode
        if (type === "tv" && season && episode) {
            const seriesHtml = await fetch(matchedUrl, { headers: HEADERS }).then(r => r.text());
            const cleaned = seriesHtml.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");

            const epLinkRegex = /<a[^>]*href="([^"]*\/episodio\/[^"]*)"[^>]*>[^<]*E(\d+)[^<]*<\/a>/gi;
            let epMatch;
            while ((epMatch = epLinkRegex.exec(cleaned)) !== null) {
                const epNum = parseInt(epMatch[2]);
                if (epNum === parseInt(episode)) {
                    targetUrl = epMatch[1];
                    break;
                }
            }

            if (targetUrl === matchedUrl) {
                console.warn(`[SoloLatino] Episode S${season}E${episode} not found`);
                return [];
            }
        }

        // Step 3: Try to extract IMDB ID from the page
        const pageHtml = await fetch(targetUrl, { headers: HEADERS }).then(r => r.text());
        const pageImdb = (pageHtml.match(/\/title\/(tt\d+)/) || [])[1];
        if (!imdbId && pageImdb) imdbId = pageImdb;
        if (!imdbId) {
            console.warn("[SoloLatino] No IMDB ID found");
            return [];
        }

        // Step 4: Resolve via embed69 to direct m3u8 URLs
        console.warn(`[SoloLatino] Resolving IMDB ${imdbId} via embed69`);
        try {
            const embed69 = require("./embed69.js");
            const streams = await embed69.getStreams(imdbId, type, season, episode, title);
            if (streams && streams.length > 0) {
                // Prefix provider name
                const result = streams.filter(s => s.url && (s.url.includes(".m3u8") || s.url.includes(".mp4") || s.url.includes("/hls")));
                console.warn(`[SoloLatino] Resolved ${result.length} playable streams`);
                return result.map(s => ({
                    ...s,
                    provider: "SoloLatino",
                    title: s.title || "SoloLatino"
                }));
            }
        } catch (e) {
            console.warn(`[SoloLatino] embed69 resolution failed: ${e.message}`);
        }

        console.warn("[SoloLatino] No playable streams resolved");
        return [];

    } catch (err) {
        console.warn(`[SoloLatino] Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
