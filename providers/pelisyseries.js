/**
 * Pelisyseries provider — WordPress DooPlay theme.
 *
 * Host: https://www2.pelisyseries.net/
 *
 * Flow:
 *   1. Search: /?s=<title> → <article> blocks with href + alt title
 *   2. Movie page: contains <tr id='link-...'> rows with domain, quality, language, href
 *   3. Series page: <span class='se-t...'> for seasons, <li class='mark-...'> for episodes
 *   4. Each link row's href points to an intermediate page with <a id="link" href="...">
 *   5. Resolve that embed URL to direct m3u8/mp4 where possible
 *
 * Requires: Node.js 18+ (global fetch)
 */
var streamLabels = typeof require !== "undefined" ? require("./stream_labels.js") : null;
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
 return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const HOST = "https://www2.pelisyseries.net/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanTitleForSearch(title) {
    if (!title) return "";
    let q = title.split(":")[0];
    q = q.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
    q = q.replace(/[^a-zA-Z0-9\s\-áéíóúÁÉÍÓÚñÑ]/g, "");
    return q.replace(/\s+/g, " ").trim();
}

function decodeEntities(str) {
    if (!str) return "";
    return str
        .replace(/&#038;/g, "&").replace(/&amp;/g, "&")
        .replace(/&#8217;s/g, "'s").replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "").replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"').replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

function extractDirectM3u8(text) {
    const m = text.match(/(?:sources|file)\s*:\s*\[?"?(https?:\/\/[^\s"'<>\[\]]+\.m3u8[^\s"'<>\[\]]*)/i);
    if (m) return m[1];
    const m2 = text.match(/https?:\/\/[^\s"'<>\[\]]+\.m3u8[^\s"'<>\[\]]*/i);
    if (m2) return m2[0];
    const m3 = text.match(/https?:\/\/[^\s"'<>\[\]]+\.mp4[^\s"'<>\[\]]*/i);
    if (m3) return m3[0];
    return null;
}

// ─── TMDB ───────────────────────────────────────────────────────────────────

async function getTmdbTitle(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return { title: type === "movie" ? res.title : res.name, year: (res.release_date || res.first_air_date || "").substring(0, 4) };
    } catch (e) {
        console.warn(`[Pelisyseries] TMDB Error: ${e.message}`);
        return null;
    }
}

// ─── Site fetch helper with Cloudflare detection ────────────────────────────

async function fetchPage(url, referer) {
    try {
        const resp = await fetch(url, {
            headers: { ...HEADERS, "Referer": referer || HOST },
            signal: AbortSignal.timeout(20000)
        });
        if (!resp.ok) return "";
        const html = await resp.text();
        if (/<title>Just a moment\.\.\.<\/title>|challenges\.cloudflare\.com/i.test(html)) {
            console.warn("[Pelisyseries] Cloudflare challenge detected");
        }
        return html;
    } catch (e) {
        console.warn(`[Pelisyseries] Fetch error (${url}): ${e.message}`);
        return "";
    }
}

// ─── Search ─────────────────────────────────────────────────────────────────

async function searchSite(searchTitle, type) {
    const query = encodeURIComponent(searchTitle).replace(/%20/g, "+");
    const searchUrl = `${HOST}?s=${query}`;

    const html = await fetchPage(searchUrl);
    if (!html) return [];

    // Remove whitespace noise (same as Balandro does)
    const cleaned = html.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");

    // Find the block containing results
    let block;
    if (cleaned.includes("<h1")) {
        block = cleaned.match(/<h1[^>]*>(.*?)>Año de lanzamiento</);
        if (block) block = block[1];
    }
    if (!block) block = cleaned;

    // Match all <article> blocks
    const results = [];
    const articleRegex = /<article(.*?)<\/article>/gi;
    let match;

    while ((match = articleRegex.exec(block)) !== null) {
        const articleHtml = match[1];

        const hrefMatch = articleHtml.match(/\shref="([^"]*)"/i);
        const titleMatch = articleHtml.match(/\salt="([^"]*)"/i);

        if (!hrefMatch || !titleMatch) continue;

        const href = hrefMatch[1];
        const title = decodeEntities(titleMatch[1]);

        if (!href || !title) continue;

        // Type filter: peliculas → movie, series → tvshow
        const isMovie = href.includes("/peliculas/") || href.includes("/pelicula/");
        const isSeries = href.includes("/series/") || href.includes("/serie/");
        const wantMovie = type !== "tv";

        if (wantMovie && isSeries) continue;
        if (!wantMovie && isMovie) continue;

        results.push({ url: href, title });
    }

    return results;
}

// ─── Match result by title ──────────────────────────────────────────────────

function matchResult(results, searchTitle) {
    if (!results.length) return null;
    const nSearch = norm(searchTitle);

    // Exact normalized match first
    for (const r of results) {
        if (norm(r.title) === nSearch) return r;
    }

    // Contains match
    for (const r of results) {
        const nR = norm(r.title);
        if (nR.includes(nSearch) || nSearch.includes(nR)) return r;
    }

    // Fallback: first result
    return results[0];
}

// ─── TV: Extract seasons from series page ───────────────────────────────────

function extractSeasons(html) {
    const cleaned = html.replace(/\\n|\\r|\\t|\\s{2}|&nbsp;/g, "");
    const matches = cleaned.match(/<span class='se-t[^']*'>(\d+)<\/span>/gi) || [];
    return [...new Set(matches.map(m => {
        const num = m.match(/>(\d+)</i);
        return num ? num[1] : "";
    }).filter(n => n))];
}

// ─── TV: Extract episodes for a specific season ─────────────────────────────

function extractEpisodes(html, targetSeason) {
    const cleaned = html.replace(/\\n|\\r|\\t|\\s{2}|&nbsp;/g, "");

    // Find the block for the target season
    let block;
    const seasonRegex = new RegExp(`<span class='se-t[^']*'>${targetSeason}</span>(.*?)</div></div>`, "i");
    const seasonMatch = cleaned.match(seasonRegex);
    if (seasonMatch) {
        block = seasonMatch[1];
    } else {
        block = cleaned;
    }

    // Match episode <li> blocks: <li class='mark-N'>...<img src='THUMB'>...<div class='numerando'>S - E</div>...<a href='URL'>TITLE</a>
    const episodeRegex = /<li class='mark-(\d+)'[^>]*>[\s\S]*?<img\s+src='([^']*)'[\s\S]*?<div class='numerando'>\d+\s*-\s*(\d+)<\/div>[\s\S]*?<a\s+href='([^']*)'>([^<]*)<\/a>/gi;

    const episodes = [];
    let match;

    while ((match = episodeRegex.exec(block)) !== null) {
        episodes.push({
            episode: parseInt(match[3]),
            url: match[4],
            title: match[5],
            thumb: match[2]
        });
    }

    // Fallback: try the simpler Balandro-style regex if modern one yields nothing
    if (!episodes.length) {
        const fallbackRegex = /<li class='mark-[^']*'\s*src='([^']*)'[^>]*>[\s\S]*?<div class='numerando'>(.*?)<\/div>[\s\S]*?<a href='([^']*)'>(.*?)<\/a>/gi;
        while ((match = fallbackRegex.exec(block)) !== null) {
            const epNum = match[2].match(/-\s*(\d+)$/);
            if (!epNum) continue;
            episodes.push({
                episode: parseInt(epNum[1]),
                url: match[3],
                title: match[4],
                thumb: match[1]
            });
        }
    }

    return episodes;
}

// ─── Extract embed links from movie/episode page ────────────────────────────

function extractLinkRows(html) {
    const cleaned = html.replace(/\\n|\\r|\\t|\\s{2}|&nbsp;/g, "");
    const rowRegex = /<tr\s+id='link-([\s\S]*?)<\/tr>/gi;

    const links = [];
    let match;

    while ((match = rowRegex.exec(cleaned)) !== null) {
        const rowHtml = match[1];

        // Server domain
        const domainMatch = rowHtml.match(/domain=([^']*)'/i);
        const domain = domainMatch ? domainMatch[1].toLowerCase().trim() : "";

        // Normalize server name
        let server = domain
            .replace(/\.com|\.co|\.cc|\.ru|\.tv|\.to|\.me|\.nz|\.vg|\.io|\.eu|\.ac|\.org|\.net|\.club|\.site|\.watch|\.life|\.biz|\.fun|\.xyz|\.host/gi, "")
            .trim();

        // Skip unsupported servers
        if (!server || /pelisyseries|hydrax|videohost|vidto-do|videomega|gdriveplayer|dfiles|embed\.mystream|storage\.googleapis|goo\.gl|jwplayerembed|vev\.io|pelispng|steamplay|streamp1ay|powvideo|powvldeo|powv1deo|uploaded|viduplayer|verlapeliculaonline/i.test(server)) {
            continue;
        }

        if (server === "ul" || server === "torrent" || server === "utorrent") continue;

        // Server alias mapping
        const serverMap = { waaw: "waaw", hqq: "waaw", netu: "waaw", ok: "okru", dood: "doodstream", uptostream: "uptobox", archive: "archiveorg", zto: "zembed", "player.vimeo": "vimeo", utorrent: "torrent" };
        if (serverMap[server]) server = serverMap[server];

        // Quality
        const qualityMatch = rowHtml.match(/<strong\s+class='quality'>(.*?)<\/strong>/i);
        const quality = qualityMatch ? qualityMatch[1].trim() : "HD";

        if (quality.toLowerCase() === "subtitulos") continue;

        // Language
        const langMatch = rowHtml.match(/<\/strong>.*?<\/td><td>(.*?)<\/td>/i);
        let lang = langMatch ? langMatch[1].trim() : "?";

        if (/latino/i.test(lang)) lang = "Lat";
        else if (/castellano|español|espanol/i.test(lang)) lang = "Esp";
        else if (/subtitulado|vose/i.test(lang)) lang = "Vose";

        // URL
        const urlMatch = rowHtml.match(/<a\s+href='([^']*)'/i);
        const url = urlMatch ? urlMatch[1] : "";

        if (!url) continue;

        links.push({ server, quality, language: lang, url });
    }

    return links;
}

// ─── Resolve intermediate URL to final embed URL ────────────────────────────

async function resolveIntermediateUrl(url, referer) {
    try {
        const html = await fetchPage(url, referer);
        if (!html) return url; // Return original if fetch fails

        // Pattern: <a id="link" ... href="...">
        const cleaned = html.replace(/\\n|\\r|\\t|\\s{2}|&nbsp;/g, "");
        const linkMatch = cleaned.match(/<a\s+id="link"[^>]*href="([^"]*)"/i);
        if (linkMatch) {
            let embedUrl = linkMatch[1]
                .replace(/&#038;/g, "&")
                .replace(/&amp;/g, "&")
                .replace(/\\\//g, "/");

            if (embedUrl.startsWith("http")) return embedUrl;
        }

        // Fallback: any iframe src
        const iframeMatch = cleaned.match(/<iframe[^>]*src="([^"]+)"/i);
        if (iframeMatch) {
            const src = iframeMatch[1].replace(/&amp;/g, "&");
            if (src.startsWith("http")) return src;
        }

        return url;
    } catch (e) {
        return url;
    }
}

// ─── Embed resolvers ────────────────────────────────────────────────────────

function unpackPayload(p, radix, symtab) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unbase = (s) => { let r = 0; for (const c of s) r = r * radix + chars.indexOf(c); return r; };
    return p.replace(/\b([0-9a-zA-Z]+)\b/g, (m) => {
        const idx = unbase(m);
        return (!isNaN(idx) && symtab[idx] && symtab[idx] !== "") ? symtab[idx] : m;
    });
}

function evalUnpack(script) {
    const m = script.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (!m) return null;
    return unpackPayload(m[1], parseInt(m[2]), m[4].split("|"));
}

async function resolveUnpackEval(url, referer) {
    try {
        const html = await fetchPage(url, referer);
        if (!html) return null;

        const em = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
        if (em) {
            const up = evalUnpack(em[0]);
            if (up) { const d = extractDirectM3u8(up); if (d) return d; }
        }
        return extractDirectM3u8(html);
    } catch (e) { return null; }
}

async function resolveVoe(url, referer) {
    try {
        const html = await fetchPage(url, referer);
        if (!html) return null;

        // voe.sx pattern: 'hls': 'https://...'
        let m = html.match(/['"]hls['"]:\s*['"](https?:[^'"]+)['"]/);
        if (m) return m[1].replace(/\\\//g, "/");

        // Alternate: window.location.href redirect to m3u8
        m = html.match(/window\.location\.href\s*=\s*['"](https?:[^'"]+\.m3u8[^'"]*)['"]/i);
        if (m) return m[1];

        return await resolveUnpackEval(url, referer);
    } catch (e) { return null; }
}

async function resolveStreamWish(url, referer) {
    try {
        const html = await fetchPage(url, referer);
        if (!html) return null;

        // Pattern: sources: [{file:"m3u8_url"}]
        let m = html.match(/sources\s*:\s*\[([^\]]+)\]/);
        if (m) { const d = extractDirectM3u8(m[1]); if (d) return d; }

        return await resolveUnpackEval(url, referer);
    } catch (e) { return null; }
}

async function resolveEmbed(embedUrl, referer) {
    const u = (embedUrl || "").toLowerCase();
    if (!u.startsWith("http")) return null;

    // Voe
    if (/voe\.(sx|to|tv|me|cc)|voex\./i.test(u)) {
        return await resolveVoe(embedUrl, referer);
    }

    // StreamWish / VidHide family
    if (/streamwish|vidhide|awish|hlswish|hglink|strwish|embedwish|wishfast|sfastwish|hanerix|dwish|wishembed/i.test(u)) {
        return await resolveStreamWish(embedUrl, referer);
    }

    // Doodstream — direct m3u8 often in page
    if (/dood/i.test(u)) {
        try {
            const html = await fetchPage(embedUrl, referer);
            if (html) {
                const m = html.match(/\$\.get\('([^']+)'/);
                if (m) {
                    const tokenUrl = m[1];
                    if (tokenUrl.startsWith("/")) {
                        const embedHost = new URL(embedUrl).origin;
                        const resp = await fetch(embedHost + tokenUrl, {
                            headers: { ...HEADERS, "Referer": embedUrl }
                        }).then(r => r.text());
                        const m3u8 = resp.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
                        if (m3u8) return m3u8[0];
                    }
                }
            }
        } catch (e) {}
    }

    // Generic unpack-eval fallback
    return await resolveUnpackEval(embedUrl, referer);
}

// ─── Check if URL is an embed that needs resolution ─────────────────────────

function looksEmbed(url) {
    if (!url) return false;
    const u = url.toLowerCase();
    if (/\.m3u8/.test(u) || /\.mp4/.test(u) || /\/hls/.test(u)) return false; // Already direct
    return true;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function getStreams(id, type, season, episode, title) {
    console.warn(`[Pelisyseries] Resolving: ${id} Type=${type}${type === "tv" ? ` S${season}E${episode}` : ""} (${title || "?"})`);

    // Step 1: Gather title candidates (user-provided + TMDB)
    const titleCandidates = [];
    if (title) titleCandidates.push(title);

    if (id) {
        const tmdb = await getTmdbTitle(id, type);
        if (tmdb && tmdb.title && tmdb.title !== title) {
            titleCandidates.push(tmdb.title);
        }
    }

    if (!titleCandidates.length) {
        console.warn("[Pelisyseries] No search title available");
        return [];
    }

    try {
        // Step 2: Search with each title candidate until we find results
        let results = [];
        let matchedSearchTitle = "";

        for (const t of titleCandidates) {
            const q = cleanTitleForSearch(t);
            if (!q) continue;
            results = await searchSite(q, type);
            if (results.length) {
                matchedSearchTitle = t;
                console.warn(`[Pelisyseries] Found ${results.length} results for "${q}"`);
                break;
            }
            console.warn(`[Pelisyseries] No results for "${q}", trying next candidate...`);
        }

        if (!results.length) {
            console.warn(`[Pelisyseries] No search results for any title candidate`);
            return [];
        }

        // Step 3: Match by title
        const matched = matchResult(results, matchedSearchTitle);
        if (!matched) {
            console.warn(`[Pelisyseries] No match in results for: "${matchedSearchTitle}"`);
            return [];
        }
        console.warn(`[Pelisyseries] Matched: ${matched.title} → ${matched.url}`);

        // Step 4: For TV series, resolve season → episode URL
        let targetUrl = matched.url;

        if (type === "tv") {
            const seriesHtml = await fetchPage(targetUrl);
            if (!seriesHtml) {
                console.warn("[Pelisyseries] Could not load series page");
                return [];
            }

            // Get episodes
            const episodes = extractEpisodes(seriesHtml, String(season));
            if (!episodes.length) {
                console.warn(`[Pelisyseries] No episodes found for S${season}`);
                return [];
            }

            // Find target episode
            const ep = episodes.find(e => e.episode === parseInt(episode));
            if (!ep) {
                console.warn(`[Pelisyseries] Episode S${season}E${episode} not found. Available: ${episodes.map(e => e.episode).join(", ")}`);
                // Try first episode as fallback
                targetUrl = episodes[0].url;
            } else {
                targetUrl = ep.url;
            }
            console.warn(`[Pelisyseries] Episode URL: ${targetUrl}`);
        }

        // Step 5: Extract embed links from movie/episode page
        const pageHtml = await fetchPage(targetUrl);
        if (!pageHtml) {
            console.warn("[Pelisyseries] Could not load content page");
            return [];
        }

        const links = extractLinkRows(pageHtml);
        if (!links.length) {
            console.warn("[Pelisyseries] No embed links found on page");
            return [];
        }
        console.warn(`[Pelisyseries] Found ${links.length} link rows`);

        // Step 6: Resolve each link
        const streams = [];
        const seenUrls = new Set();

        for (const link of links) {
            try {
                // Resolve intermediate URL to actual embed URL
                const embedUrl = await resolveIntermediateUrl(link.url, targetUrl);
                if (!embedUrl || !embedUrl.startsWith("http")) continue;

                // Skip duplicates
                const dedupeKey = `${embedUrl}|${link.language}|${link.server}`;
                if (seenUrls.has(dedupeKey)) continue;
                seenUrls.add(dedupeKey);

                // If it's already a direct m3u8/mp4, return it directly
                if (/\.m3u8|\.mp4|\/hls\//i.test(embedUrl)) {
                    streams.push({
                        provider: "Pelisyseries",
                        title: `${link.server} (${link.language})`,
                        url: embedUrl,
                        quality: link.quality,
                        headers: { Referer: link.url, "User-Agent": UA }
                    });
                    console.warn(`[Pelisyseries] Direct: ${link.server} (${link.language})`);
                    continue;
                }

                // Try to resolve embed to direct URL
                const resolved = await resolveEmbed(embedUrl, targetUrl);
                if (resolved && resolved.startsWith("http")) {
                    streams.push({
                        provider: "Pelisyseries",
                        title: `${link.server} (${link.language})`,
                        url: resolved,
                        quality: link.quality,
                        headers: { Referer: embedUrl, "User-Agent": UA }
                    });
                    console.warn(`[Pelisyseries] Resolved: ${link.server} (${link.language}) → ${resolved.slice(0, 70)}`);
                }
            } catch (e) {
                console.warn(`[Pelisyseries] Error resolving ${link.server}: ${e.message}`);
            }
        }

        console.warn(`[Pelisyseries] Total streams: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[Pelisyseries] Fatal error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
