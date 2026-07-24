const cheerio = require("cheerio");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HTML_HEADERS_RESOLVER = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

const SKIP_HOSTS = [
    "embedsb.com", "streamsb.net", "sbplay.org",
    "hqq.tv", "my.mail.ru",
    "animeav1.uns.bio",  // UPNShare — unresolvable
    "terabox.com", "1fichier.com",
    "luluvdo.com", "lulustream.com",
];

const EMBED_SAFE_PATTERNS = [
    "mp4upload.com", "streamtape.com", "yourupload.com",
    "ok.ru", "odnoklassniki.ru", "uqload.is", "uqload.co",
    "streamwish", "strwish", "embedwish", "awish", "wishfast",
    "sfastwish", "hanerix", "hglink", "dhcplay",
    "filemoon", "bysesukior", "moonembed", "fmoon",
    "vidhide", "filelions",
    "mixdrop",
    "voe.sx", "voe",
    "zilla-networks",  // HLS player
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
        } else if (name.includes("filemoon")) {
            // Filemoon clones are React SPAs — skip at host level, but keep branch for name matching
            resolved = null;
        } else if (name.includes("streamwish") || name === "sw") {
            const html = await fetchText(embedUrl);
            if (html === "DEAD") return "DEAD";
            if (html) {
                const m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
                if (m && !m[1].startsWith("blob:")) { resolved = m[1]; }
                else {
                    resolved = findFirstUrl(html, [/(https?:[^\s"']+\.m3u8[^\s"']*)/i, /file\s*:\s*["'](https?:[^\s"']+)["']/i, /"file"\s*:\s*"([^"]+)"/i]);
                    if (!resolved || resolved.startsWith("blob:") || !isLikelyVideoUrl(resolved)) resolved = null;
                }
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
const BASE_URL = "https://animeav1.com";

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
        console.error("[AnimeAV1] TMDB es-ES error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX`).then(r => r.json());
        titleEsMX = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[AnimeAV1] TMDB es-MX error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json());
        titleEn = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[AnimeAV1] TMDB en-US error:", e.message);
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
        const url = `${BASE_URL}/catalogo?search=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        const results = [];
        
        $("main section div article").each((i, el) => {
            const a = $(el).find("a");
            const href = a.attr("href") || "";
            if (!href.startsWith("/media/")) return;
            const slug = href.replace("/media/", "");
            const title = $(el).find("header h3").text().trim();
            const type = $(el).find("div > figure + div > div").text().trim();
            
            if (slug) {
                results.push({ slug, title, type });
            }
        });
        return results;
    } catch (e) {
        console.error(`[AnimeAV1] Search site error for "${query}":`, e.message);
        return [];
    }
}

/**
 * Parse AnimeAV1 server data from SvelteKit devalue format.
 * The site migrated to SvelteKit — data is in /media/{slug}/{ep}/__data.json
 * Format: flattened array where data[0] is a schema mapping field→index.
 */
function parseDevalueData(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length < 2) return [];
    
    const schema = dataArray[0];  // {media: 1, embeds: 56, episode: 53, ...}
    const servers = [];
    
    // Helper: resolve a devalue reference (walk numeric indices)
    const resolve = (idx) => {
        if (typeof idx !== 'number' || idx >= dataArray.length) return null;
        return dataArray[idx];
    };
    
    // Extract servers from embeds/dowbloads > SUB/DUB arrays
    const extractLang = (langKey) => {
        const langIdx = schema[langKey];  // e.g. embeds=56, downloads=70
        if (typeof langIdx !== 'number') return;
        
        const langObj = resolve(langIdx);  // {SUB: 57} or {SUB: 57, DUB: ...}
        if (!langObj || typeof langObj !== 'object') return;
        
        for (const [lang, arrIdx] of Object.entries(langObj)) {
            if (typeof arrIdx !== 'number') continue;
            const arr = resolve(arrIdx);
            if (!Array.isArray(arr)) continue;
            
            const isDub = lang.toUpperCase() === 'DUB';
            for (const serverIdx of arr) {
                if (typeof serverIdx !== 'number') continue;
                const serverObj = resolve(serverIdx);
                if (!serverObj || typeof serverObj !== 'object') continue;
                
                const serverIdx2 = serverObj.server;
                const urlIdx = serverObj.url;
                if (typeof serverIdx2 !== 'number' || typeof urlIdx !== 'number') continue;
                
                const serverName = String(resolve(serverIdx2) || '');
                const url = String(resolve(urlIdx) || '');
                
                if (url && url.startsWith('http')) {
                    servers.push({ title: serverName, url, dub: isDub });
                }
            }
        }
    };
    
    extractLang('embeds');
    extractLang('downloads');
    
    return servers;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[AnimeAV1] Resolving TMDB ID: ${tmdbId}, Season: ${season}, Episode: ${episode}`);
    
    const info = await getTmdbTitles(tmdbId, mediaType);
    if (!info.titleEsES && !info.titleEsMX && !info.titleOriginal && !info.titleEn) {
        console.log("[AnimeAV1] Failed to fetch titles from TMDB.");
        return [];
    }

    const uniqueQueries = generateQueries(info);
    let matchedAnime = null;
    let bestScore = -1;

    for (const q of uniqueQueries) {
        console.log(`[AnimeAV1] Searching with query: "${q}"`);
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
        console.log("[AnimeAV1] No matching anime found on site.");
        return [];
    }

    console.log(`[AnimeAV1] Matched Anime: "${matchedAnime.title}" (Score: ${bestScore}) -> ${matchedAnime.slug}`);

    const epNum = mediaType === "movie" ? 1 : episode;
    const epPath = `${matchedAnime.slug}/${epNum}`;
    const dataUrl = `${BASE_URL}/media/${epPath}/__data.json`;
    
    console.log(`[AnimeAV1] Fetching SvelteKit data: ${dataUrl}`);
    let servers = [];
    try {
        const res = await fetch(dataUrl, { headers: { ...HEADERS, "Accept": "application/json" } });
        if (res.ok) {
            const json = await res.json();
            // SvelteKit __data.json: { type: "data", nodes: [null, {...}, {data: [...]}] }
            const dataNode = json?.nodes?.[2] || json?.nodes?.find(n => n?.data?.[0]?.embeds || n?.data?.[0]?.downloads);
            if (dataNode?.data) {
                servers = parseDevalueData(dataNode.data);
            }
        }
    } catch (e) {
        console.error(`[AnimeAV1] Error fetching data:`, e.message);
    }

    console.log(`[AnimeAV1] Extracted ${servers.length} server elements from API.`);

    const streams = [];
    for (const s of servers) {
        const serverName = s.title || "Mirror";
        const embedUrl = s.url;
        if (!embedUrl) continue;

        if (embedUrl.includes("mega.nz") || embedUrl.includes("mega.co")) continue;
        try {
            const embedHost = new URL(embedUrl).hostname;
            if (SKIP_HOSTS.some(h => embedHost.includes(h))) {
                console.log(`[AnimeAV1] Skipping unresolvable host: ${embedHost}`);
                continue;
            }
        } catch (_) {}

        console.log(`[AnimeAV1] Resolving server ${serverName}: ${embedUrl}`);
        const resolved = await resolveUrl(serverName, embedUrl);

        if (resolved === "DEAD") {
            console.log(`[AnimeAV1] Stream is dead/deleted: ${embedUrl}`);
            continue;
        }

        if (resolved) {
            streams.push({
                provider: "AnimeAV1",
                title: `${serverName} \xB7 Direct${s.dub ? " \xB7 DUB" : ""}`,
                url: resolved,
                quality: "720p",
                headers: { "Referer": BASE_URL + "/", "User-Agent": UA }
            });
        } else {
            const isEmbedSafe = EMBED_SAFE_PATTERNS.some(h => embedUrl.includes(h));
            if (isEmbedSafe) {
                streams.push({
                    provider: "AnimeAV1",
                    title: `${serverName} (Embed)${s.dub ? " \xB7 DUB" : ""}`,
                    url: embedUrl,
                    quality: "720p",
                    isEmbed: true,
                    headers: { "Referer": BASE_URL + "/", "User-Agent": UA }
                });
            } else {
                console.log(`[AnimeAV1] Dropping non-resolvable embed: ${embedUrl}`);
            }
        }
    }

    console.log(`[AnimeAV1] Resolved ${streams.length} streams.`);
    return streams;
}

module.exports = { getStreams };
