const cheerio = require('cheerio');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const { TMDB_API_KEY: TMDB_KEY } = require("./tmdb_config");
const { resolveEmbed: resolveShared, resolveVoe, resolveStreamwish, resolveVidhide, resolveFilemoon } = require("./resolvers");

// ─── Cvid resolver (cinemitas-specific) ──────────────────────────────────────

async function resolveCvid(embedUrl) {
    try {
        // Convert /f/ wrapper URL to /e/ actual player URL
        const playerUrl = embedUrl.replace(/\/f\//, '/e/');
        console.log(`[Cvid] Resolving: ${playerUrl}`);
        const r = await fetch(playerUrl, {
            headers: { "User-Agent": UA, "Referer": "https://cinemitas.org/" }
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        const m3u8 = text.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8) {
            return { url: m3u8[0], server: "Cvid", quality: "1080p", headers: { "User-Agent": UA, Referer: "https://cvid.lat/" } };
        }
        const mp4 = text.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/i);
        if (mp4) {
            return { url: mp4[0], server: "Cvid", quality: "1080p", headers: { "User-Agent": UA, Referer: "https://cvid.lat/" } };
        }
    } catch (t) {
        console.log(`[Cvid] Error: ${t.message}`);
    }
    return null;
}

// ─── Embed dispatcher ────────────────────────────────────────────────────────

async function resolveEmbed(embedUrl) {
    const u = embedUrl.toLowerCase();

    // Shared resolvers
    const shared = await resolveShared(embedUrl);
    if (shared) return shared;

    // Cinemitas-specific resolvers
    if (u.includes("cvid.lat")) return resolveCvid(embedUrl);

    if (u.includes("uqload")) {
        const { resolveUqload } = require("./cdn_resolvers");
        return resolveUqload(embedUrl);
    }
    if (u.includes("goodstream")) {
        const { resolveGoodstream } = require("./cdn_resolvers");
        return resolveGoodstream(embedUrl);
    }
    if (u.includes("vimeos")) {
        const { resolveVimeos } = require("./cdn_resolvers");
        return resolveVimeos(embedUrl);
    }

    return null;
}

function slugify(title) {
    return title.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, "y")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

// TMDB cache — deduplicates the 3-language fetch pattern
const _tmdbCache = new Map();
const _CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getTmdbTitles(tmdbId, type) {
    // Check cache first
    const cacheKey = `${tmdbId}|${type}`;
    const cached = _tmdbCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < _CACHE_TTL) {
        console.log(`[Cinemitas] TMDB CACHED ${type}/${tmdbId}`);
        return cached.data;
    }

    let titleEs = null;
    let titleOriginal = null;
    let titleEn = null;
    let year = null;
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-ES`).then(r => r.json());
        titleEs = type === "movie" ? res.title : res.name;
        titleOriginal = type === "movie" ? res.original_title : res.original_name;
        const dateStr = type === "movie" ? res.release_date : res.first_air_date;
        if (dateStr) {
            year = dateStr.split("-")[0];
        }
    } catch (e) {
        console.error("[Cinemitas] TMDB es-ES error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX`).then(r => r.json());
        const t = type === "movie" ? res.title : res.name;
        if (t && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(t)) {
            titleEs = titleEs || t;
        }
    } catch (e) {
        console.error("[Cinemitas] TMDB es-MX error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json());
        titleEn = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[Cinemitas] TMDB en-US error:", e.message);
    }
    
    const result = { titleEs, titleOriginal, titleEn, year };
    _tmdbCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
}

async function getStreams(tmdbId, mediaType, season, episode, title) {
    if (!tmdbId || !mediaType) {
        console.error("[Cinemitas] Missing tmdbId or mediaType");
        return [];
    }
    
    console.log(`[Cinemitas] Resolving: TMDB ${tmdbId} (${mediaType})${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`);
    const timeStart = Date.now();
    
    try {
        // Step 1: Query TMDB for titles and year
        const info = await getTmdbTitles(tmdbId, mediaType);
        if (!info.titleEs && !info.titleOriginal && !info.titleEn) {
            console.log("[Cinemitas] Failed to fetch titles from TMDB.");
            return [];
        }
        
        // Generate slug candidates
        const candidates = [];
        if (info.titleEs) {
            candidates.push(slugify(info.titleEs));
            if (info.year) candidates.push(`${slugify(info.titleEs)}-${info.year}`);
        }
        if (info.titleOriginal) {
            candidates.push(slugify(info.titleOriginal));
            if (info.year) candidates.push(`${slugify(info.titleOriginal)}-${info.year}`);
        }
        if (info.titleEn) {
            candidates.push(slugify(info.titleEn));
            if (info.year) candidates.push(`${slugify(info.titleEn)}-${info.year}`);
        }
        
        // De-duplicate candidates
        const uniqueCandidates = [...new Set(candidates)];
        
        let pageUrl = "";
        let pageHtml = "";
        
        // Probe slugs to find the correct details page URL
        for (let candidate of uniqueCandidates) {
            let testUrl = mediaType === "movie" 
                ? `https://cinemitas.org/movies/${candidate}/`
                : `https://cinemitas.org/tvshows/${candidate}/`;
                
            console.log(`[Cinemitas] Probing candidate page: ${testUrl}`);
            try {
                const res = await fetch(testUrl, { headers: { "User-Agent": UA } });
                if (res.status === 200) {
                    pageHtml = await res.text();
                    pageUrl = testUrl;
                    break;
                }
            } catch (err) {
                console.log(`[Cinemitas] Probe failed for ${testUrl}: ${err.message}`);
            }
        }
        
        if (!pageUrl) {
            console.log("[Cinemitas] No valid main page resolved via slug candidates.");
            return [];
        }
        console.log(`[Cinemitas] Resolved main page URL: ${pageUrl}`);
        
        // Step 2: For TV shows, resolve the episode page URL
        if (mediaType === "tv") {
            const slugMatch = pageUrl.match(/\/tvshows\/([^/]+)\/?/);
            const seriesSlug = slugMatch ? slugMatch[1] : null;
            
            if (!seriesSlug) {
                console.log("[Cinemitas] Could not extract series slug from page URL.");
                return [];
            }
            
            let epUrl = `https://cinemitas.org/episodes/${seriesSlug}-${season}x${episode}/`;
            console.log(`[Cinemitas] Probing predicted episode page: ${epUrl}`);
            
            try {
                let epRes = await fetch(epUrl, { headers: { "User-Agent": UA } });
                if (epRes.status === 200) {
                    pageUrl = epUrl;
                    pageHtml = await epRes.text();
                } else {
                    // Fallback: parse series page for links
                    console.log(`[Cinemitas] Predicted episode page failed. Parsing series page...`);
                    const $ = cheerio.load(pageHtml);
                    let foundUrl = null;
                    $('a[href*="/episodes/"]').each((i, el) => {
                        const href = $(el).attr('href');
                        const match = href.match(/-(\d+)x(\d+)\/?$/);
                        if (match && parseInt(match[1]) === season && parseInt(match[2]) === episode) {
                            foundUrl = href;
                            return false;
                        }
                    });
                    if (foundUrl) {
                        pageUrl = foundUrl;
                        console.log(`[Cinemitas] Found episode page via series parsing: ${pageUrl}`);
                        pageHtml = await fetch(pageUrl, { headers: { "User-Agent": UA } }).then(r => r.text());
                    } else {
                        console.log(`[Cinemitas] Episode S${season}E${episode} not found on series page.`);
                        return [];
                    }
                }
            } catch (err) {
                console.log(`[Cinemitas] TV resolution error: ${err.message}`);
                return [];
            }
        }
        
        // Step 3: Extract player options from page HTML
        const $ = cheerio.load(pageHtml);
        const options = [];
        $('.dooplay_player_option').each((i, el) => {
            const dataPost = $(el).attr('data-post');
            const dataNume = $(el).attr('data-nume');
            const dataType = $(el).attr('data-type');
            const lang = $(el).text().trim() || "Latino";
            if (dataPost && dataNume && dataType) {
                options.push({ dataPost, dataNume, dataType, lang });
            }
        });
        
        console.log(`[Cinemitas] Found ${options.length} player options`);
        const ajaxUrl = "https://cinemitas.org/wp-admin/admin-ajax.php";
        const streams = [];
        
        // Step 4: Fetch embed URLs and resolve them
        for (let opt of options) {
            try {
                console.log(`[Cinemitas] Resolving option ${opt.dataNume} (${opt.lang})...`);
                const payload = new URLSearchParams({
                    action: "doo_player_ajax",
                    post: opt.dataPost,
                    nume: opt.dataNume,
                    type: opt.dataType
                }).toString();
                
                const res = await fetch(ajaxUrl, {
                    method: "POST",
                    headers: {
                        "User-Agent": UA,
                        "Referer": pageUrl,
                        "X-Requested-With": "XMLHttpRequest",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: payload
                });
                
                if (!res.ok) continue;
                const data = await res.json();
                if (data && data.embed_url) {
                    let embedUrl = data.embed_url;
                    
                    // Some AJAX responses return a full <iframe> HTML tag — extract the src attribute
                    if (embedUrl.trim().startsWith('<')) {
                        const srcMatch = embedUrl.match(/src=["']([^"']+)["']/);
                        if (srcMatch) {
                            embedUrl = srcMatch[1];
                            console.log(`[Cinemitas] Extracted src from iframe HTML: ${embedUrl}`);
                        } else {
                            console.log(`[Cinemitas] Could not extract src from iframe response, skipping`);
                            continue;
                        }
                    }
                    
                    console.log(`[Cinemitas] Got embed URL: ${embedUrl}`);
                    const resolved = await resolveEmbed(embedUrl);
                    if (resolved && resolved.url) {
                        streams.push({
                            name: "Cinemitas",
                            title: `${resolved.quality || "1080p"} \xB7 ${opt.lang} \xB7 ${resolved.server}`,
                            url: resolved.url,
                            quality: resolved.quality || "1080p",
                            headers: resolved.headers || {}
                        });
                    }
                }
            } catch (err) {
                console.log(`[Cinemitas] Error resolving option ${opt.dataNume}: ${err.message}`);
            }
        }
        
        const timeElapsed = ((Date.now() - timeStart) / 1000).toFixed(2);
        console.log(`[Cinemitas] Resolved ${streams.length} stream(s) in ${timeElapsed}s`);
        return streams;
        
    } catch (e) {
        console.error("[Cinemitas] Error in getStreams:", e.message);
        return [];
    }
}

module.exports = { getStreams };
