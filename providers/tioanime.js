const cheerio = require("cheerio");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HTML_HEADERS_RESOLVER = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

// Hosts that return React SPAs or require JS execution — cannot be resolved via plain fetch.
// Never emit their URLs as embed fallback; Nuvio cannot play them (error 3003).
const SKIP_HOSTS = [
    "streamwish.to",   // SPA — "Loading..." shell, needs JS
    "dhcplay.com",     // Streamwish mirror — same SPA
    "awish.pro",
    "sfastwish.com",
    "wishfast.top",
    "strwish.com",
    "hanerix.com",
    "embedsb.com",     // StreamSB — JS-gated
    "streamsb.net",
    "sbplay.org",
    "hqq.tv",          // Netu — JS-gated
    "my.mail.ru",      // Mail.ru — login required
    "animeav1.uns.bio",// UPNShare — hash-based, unresolvable
    "terabox.com",     // Requires auth
    "1fichier.com",    // Requires account for large files
    "mixdrop.ps",      // MixDrop — JS-gated
    "mixdrop.ag",
    "filelions.top",   // FileLions — eval-packed SPA
    "luluvdo.com",
    "lulustream.com",
    "bysesukior.com",  // Filemoon clone — React SPA
];

// Embed URLs that Nuvio's built-in web player CAN handle directly.
const EMBED_SAFE_PATTERNS = [
    "mp4upload.com",
    "streamtape.com",
    "yourupload.com",
    "ok.ru",
    "odnoklassniki.ru",
    "uqload.is",
    "uqload.co",
];

async function fetchText(url, headers = HTML_HEADERS_RESOLVER) {
    try {
        const resp = await fetch(url, { headers });
        if (resp.status === 404) return "DEAD";
        const text = await resp.text();
        const lower = text.toLowerCase();
        if (lower.includes("file was deleted") || 
            lower.includes("no longer exists") || 
            lower.includes("file not found") || 
            lower.includes("content restricted") ||
            lower.includes("file was locked") ||
            text.length < 100) {
            return "DEAD";
        }
        return text;
    } catch (e) { return null; }
}

function normalizeExtractedUrl(value) {
    if (!value || typeof value !== "string") return null;
    return value.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&")
        .replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%3D/gi, "=").trim();
}

function findFirstUrl(payload, patterns) {
    if (!payload || typeof payload !== "string") return null;
    for (const pattern of patterns) {
        try {
            const match = payload.match(pattern);
            if (match && match[1]) { const c = normalizeExtractedUrl(match[1]); if (c) return c; }
        } catch (_e) {}
    }
    return null;
}

function isLikelyVideoUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    for (const p of ["cloudflareinsights","google-analytics","googletagmanager","facebook.net","beacon.min.js",".js?","analytics","pixel","bigbuckbunny","test-videos","sample-video","placeholder"]) {
        if (lower.includes(p)) return false;
    }
    return /\.(mp4|m3u8)$/i.test(url) || lower.includes("video") || lower.includes("stream") || lower.includes(".mp4") || lower.includes(".m3u8");
}

async function resolveUrl(serverName, embedUrl) {
    if (!embedUrl) return null;
    if (embedUrl.includes("mega.nz") || embedUrl.includes("mega.co")) return null;
    const name = serverName.toLowerCase();
    let resolved = null;
    try {
        if (name.includes("yourupload")) {
            const html = await fetchText(embedUrl);
            if (html === "DEAD") return "DEAD";
            if (html) { const m = /property\s*=\s*"og:video"/g.exec(html); if (m) { const v = /content\s*=\s*"(\S+)"/g.exec(html.substring(m.index)); if (v) resolved = v[1]; } }
        } else if (name.includes("mp4upload")) {
            const html = await fetchText(embedUrl);
            if (html === "DEAD") return "DEAD";
            if (html) { const m = /<script(?:.|\n)+?src:(?:.|\n)*?"(.+?\.mp4)"/g.exec(html); if (m) resolved = m[1]; }
        } else if (name.includes("voe")) {
            let html = await fetchText(embedUrl);
            if (html === "DEAD") return "DEAD";
            if (html) { const r = html.match(/window\.location\.href\s*=\s*['"](https?:\/\/[^'"]+)['"]]/i); if (r) html = await fetchText(r[1]); }
            if (html === "DEAD") return "DEAD";
            if (html) resolved = findFirstUrl(html, [/sources?\s*:\s*\[\s*\{[^}]*src\s*:\s*["']([^"']+)["']/i, /"file"\s*:\s*"([^"]+)"/i, /(https?:\/\/[^\s"'<>]+\.(?:mp4|m3u8)[^\s"'<>]*)/i]);
            if (!isLikelyVideoUrl(resolved)) resolved = null;
        } else if (name.includes("vidhide")) {
            const html = await fetchText(embedUrl);
            if (html === "DEAD") return "DEAD";
            if (html) resolved = findFirstUrl(html, [/sources?\s*:\s*\[\s*\{[^}]*(?:file|src)\s*:\s*["'](https?:\/\/[^"']+)["']/i, /"file"\s*:\s*"([^"]+)"/i, /"source"\s*:\s*"([^"]+)"/i, /file\s*:\s*'([^']+)'/i]);
            if (!isLikelyVideoUrl(resolved)) resolved = null;
        } else if (name.includes("okru") || name.includes("ok.ru") || name.includes("odnoklassniki")) {
            const html = await fetchText(embedUrl);
            if (html === "DEAD") return "DEAD";
            if (html) resolved = findFirstUrl(html, [/"metadata"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/i, /flashvars\s*=\s*\{[^}]*src\s*:\s*"([^"]+)"/i, /videoUrl\s*=\s*"([^"]+)"/i]);
            if (!isLikelyVideoUrl(resolved)) resolved = null;
        } else if (name.includes("streamtape")) {
            const html = await fetchText(embedUrl, { "Referer": BASE_URL + "/" });
            if (html === "DEAD") return "DEAD";
            if (html) {
                const linkMatch = html.match(/getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*(['"][^'"]+['"])\s*\+\s*\((['"][^'"]+['"])\)(?:\.substring\((\d+)\))?(?:\.substring\((\d+)\))?/);
                if (linkMatch) {
                    const prefix = linkMatch[1].replace(/['"]/g, '');
                    let mainStr = linkMatch[2].replace(/['"]/g, '');
                    const sub1 = linkMatch[3] ? parseInt(linkMatch[3], 10) : 0;
                    const sub2 = linkMatch[4] ? parseInt(linkMatch[4], 10) : 0;
                    if (sub1) mainStr = mainStr.substring(sub1);
                    if (sub2) mainStr = mainStr.substring(sub2);
                    const finalPath = prefix + mainStr;
                    if (finalPath.startsWith('//')) {
                        resolved = `https:${finalPath}`;
                    } else if (finalPath.startsWith('/streamtape.com/')) {
                        resolved = `https:/${finalPath}`;
                    } else {
                        resolved = `https://streamtape.com${finalPath.startsWith('/') ? '' : '/'}${finalPath}`;
                    }
                } else {
                    const rb = html.match(/id=["']robotlink["'][^>]*>([^<]+)</);
                    if (rb) {
                        const path = rb[1].trim();
                        if (path.startsWith('//')) {
                            resolved = `https:${path}`;
                        } else if (path.startsWith('/streamtape.com/')) {
                            resolved = `https:/${path}`;
                        } else {
                            resolved = `https://streamtape.com${path.startsWith('/') ? '' : '/'}${path}`;
                        }
                    }
                }
                if (resolved && !resolved.includes('streamtape')) resolved = null;
            }
        } else if (name.includes("pdrain") || name.includes("pixeldrain")) {
            const mm = /(.+?:\/\/.+?)\/.+?\/(.+?)(?:\?embed)?$/.exec(embedUrl);
            if (mm) resolved = `${mm[1]}/api/file/${mm[2]}`;
        } else if (name.includes("hls")) {
            if (embedUrl.includes("/play/") || embedUrl.includes("/m3u8/")) resolved = embedUrl.replace("/play/", "/m3u8/");
        }
    } catch (err) {}
    if (resolved && (resolved.includes("mega.nz") || resolved.includes("mega.co"))) return null;
    return resolved;
}

const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://tioanime.com";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Referer": BASE_URL + "/"
};

function cleanTitle(title) {
    if (!title) return "";
    return title.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function getTmdbTitles(tmdbId, type) {
    let titleEsES = null;
    let titleEsMX = null;
    let titleOriginal = null;
    let titleEn = null;
    let year = null;
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-ES`).then(r => r.json());
        titleEsES = type === "movie" ? res.title : res.name;
        titleOriginal = type === "movie" ? res.original_title : res.original_name;
        const dateStr = type === "movie" ? res.release_date : res.first_air_date;
        if (dateStr) {
            year = dateStr.split("-")[0];
        }
    } catch (e) {
        console.error("[TioAnime] TMDB es-ES error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX`).then(r => r.json());
        titleEsMX = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[TioAnime] TMDB es-MX error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json());
        titleEn = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[TioAnime] TMDB en-US error:", e.message);
    }
    
    return { titleEsES, titleEsMX, titleOriginal, titleEn, year };
}

function generateQueries(info) {
    const queries = [];
    const addQuery = (q) => {
        if (!q) return;
        const cleanQ = q.replace(/[,;.:!\?]/g, "").replace(/\s+/g, " ").trim();
        queries.push(cleanQ);
        
        const stripped = cleanQ.replace(/^(the|los|las|el|la|lo|un|una|unos|unas)\s+/i, "");
        if (stripped !== cleanQ) {
            queries.push(stripped);
        }
    };
    
    if (info.titleEsMX) addQuery(info.titleEsMX);
    if (info.titleEsES && info.titleEsES !== info.titleEsMX) addQuery(info.titleEsES);
    if (info.titleEn) addQuery(info.titleEn);
    if (info.titleOriginal) addQuery(info.titleOriginal);
    
    return [...new Set(queries)];
}

async function searchOnSite(query) {
    try {
        // TioAnime search URL with director filters
        const url = `${BASE_URL}/directorio?q=${encodeURIComponent(query)}&year=1950%2C2026&status=2&sort=recent`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        const results = [];
        
        $("main ul li").each((i, el) => {
            const a = $(el).find("a");
            const href = a.attr("href") || "";
            if (!href.startsWith("/anime/")) return;
            const slug = href.replace("/anime/", "");
            const title = $(el).find("h3").text().trim();
            const type = $(el).find("span.anime-type-peli").text().trim();
            
            if (slug) {
                results.push({ slug, title, type });
            }
        });
        return results;
    } catch (e) {
        console.error(`[TioAnime] Search site error for "${query}":`, e.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[TioAnime] Resolving TMDB ID: ${tmdbId}, Season: ${season}, Episode: ${episode}`);
    
    const info = await getTmdbTitles(tmdbId, mediaType);
    if (!info.titleEsES && !info.titleEsMX && !info.titleOriginal && !info.titleEn) {
        console.log("[TioAnime] Failed to fetch titles from TMDB.");
        return [];
    }

    const uniqueQueries = generateQueries(info);
    let matchedAnime = null;
    let bestScore = -1;

    for (const q of uniqueQueries) {
        console.log(`[TioAnime] Searching with query: "${q}"`);
        const results = await searchOnSite(q);
        
        for (const res of results) {
            let score = 0;
            const cleanedResult = cleanTitle(res.title);
            
            const matchTitles = [info.titleEsMX, info.titleEsES, info.titleOriginal, info.titleEn].filter(Boolean);
            for (const t of matchTitles) {
                const cleanedT = cleanTitle(t);
                if (cleanedResult === cleanedT) {
                    score = Math.max(score, 100);
                } else if (cleanedResult.includes(cleanedT) || cleanedT.includes(cleanedResult)) {
                    score = Math.max(score, 50);
                }
            }

            const normType = res.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isPelicula = normType.includes("pelicula");
            const isEspecial = normType.includes("especial");
            const isMovieType = isPelicula || isEspecial;
            if (mediaType === "movie" && isPelicula) {
                score += 15; // strong bonus — real movies must outrank specials/OVAs
            } else if (mediaType === "movie" && isEspecial) {
                score += 5; // lower bonus so real movies outrank OVA specials
            } else if (mediaType === "movie" && !isMovieType) {
                score = Math.max(score - 20, 0); // penalise TV series when searching for a movie
            } else if (mediaType === "tv" && !isMovieType) {
                score += 10;
            }

            console.log(`  - Candidate: "${res.title}" (${res.type}) -> Score: ${score} -> ${res.slug}`);
            if (score > bestScore && score >= 40) {
                bestScore = score;
                matchedAnime = res;
            }
        }
        if (bestScore >= 100) break;
    }

    if (!matchedAnime) {
        console.log("[TioAnime] No matching anime found on site.");
        return [];
    }

    console.log(`[TioAnime] Matched Anime: "${matchedAnime.title}" (Score: ${bestScore}) -> ${matchedAnime.slug}`);

    const epNum = mediaType === "movie" ? 1 : episode;
    const urlsToTry = [
        `${BASE_URL}/ver/${matchedAnime.slug}-${epNum}`,
        `${BASE_URL}/ver/${matchedAnime.slug}`
    ];

    let episodeHtml = null;
    let successfulUrl = null;

    for (const url of urlsToTry) {
        try {
            const res = await fetch(url, { headers: HEADERS });
            if (res.ok) {
                episodeHtml = await res.text();
                successfulUrl = url;
                break;
            }
        } catch (e) {
            console.error(`[TioAnime] Error fetching ${url}:`, e.message);
        }
    }

    if (!episodeHtml) {
        console.log(`[TioAnime] Episode ${epNum} page not found.`);
        return [];
    }

    const $ = cheerio.load(episodeHtml);
    const scripts = $("script");
    const serversFind = scripts.map((_, el) => $(el).html()).get().find(script => script?.includes("var videos ="));
    const serversObjMatch = serversFind?.match(/var videos = (\[\[.*]])/);
    if (!serversObjMatch) {
        console.log("[TioAnime] No videos script block found.");
        return [];
    }

    let serversArray;
    try {
        serversArray = JSON.parse(serversObjMatch[1]);
    } catch (err) {
        console.error("[TioAnime] Failed parsing videos JSON:", err.message);
        return [];
    }

    const streams = [];
    for (const s of serversArray) {
        const serverName = s[0] || "Mirror";
        const embedUrl = s[1];
        if (!embedUrl) continue;

        if (embedUrl.includes("mega.nz") || embedUrl.includes("mega.co")) continue;
        try {
            const embedHost = new URL(embedUrl).hostname;
            if (SKIP_HOSTS.some(h => embedHost.includes(h))) {
                console.log(`[TioAnime] Skipping unresolvable host: ${embedHost}`);
                continue;
            }
        } catch (_) {}

        console.log(`[TioAnime] Resolving server ${serverName}: ${embedUrl}`);
        const resolved = await resolveUrl(serverName, embedUrl);

        if (resolved === "DEAD") {
            console.log(`[TioAnime] Stream is dead/deleted: ${embedUrl}`);
            continue;
        }

        if (resolved) {
            streams.push({
                name: "TioAnime",
                title: `${serverName} \xB7 Direct`,
                url: resolved,
                quality: "720p",
                headers: { "Referer": BASE_URL + "/", "User-Agent": UA }
            });
        } else {
            const isEmbedSafe = EMBED_SAFE_PATTERNS.some(h => embedUrl.includes(h)) && 
                (embedUrl.includes("/e/") || embedUrl.includes("/embed") || embedUrl.includes("/embed-") || embedUrl.includes("ok.ru") || embedUrl.includes("odnoklassniki"));
            if (isEmbedSafe) {
                streams.push({
                    name: "TioAnime",
                    title: `${serverName} (Embed)`,
                    url: embedUrl,
                    quality: "720p",
                    headers: { "Referer": BASE_URL + "/", "User-Agent": UA }
                });
            } else {
                console.log(`[TioAnime] Dropping non-resolvable embed: ${embedUrl}`);
            }
        }
    }

    console.log(`[TioAnime] Resolved ${streams.length} streams.`);
    return streams;
}

module.exports = { getStreams };
