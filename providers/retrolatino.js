const cheerio = require("cheerio");

const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://cineova.site";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Connection": "close"
};

const axios = require("axios");

let sessionCookie = null;
async function localFetch(url, options = {}) {
    if (!sessionCookie && url.includes(BASE_URL)) {
        try {
            const r = await axios.get(BASE_URL, { headers: { "User-Agent": UA } });
            const cookies = r.headers["set-cookie"] || [];
            sessionCookie = cookies.map(c => c.split(";")[0]).join("; ");
        } catch(e) {}
    }
    
    const headers = { ...options.headers };
    if (!headers["Accept-Encoding"]) headers["Accept-Encoding"] = "gzip, deflate";
    if (sessionCookie && url.includes(BASE_URL)) {
        headers["Cookie"] = sessionCookie;
    }
    
    try {
        const res = await axios({
            method: options.method || "GET",
            url,
            headers,
            data: options.body,
            validateStatus: () => true
        });
        return {
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            text: async () => typeof res.data === "string" ? res.data : JSON.stringify(res.data),
            json: async () => typeof res.data === "string" ? JSON.parse(res.data) : res.data
        };
    } catch(e) {
        throw e;
    }
}

// Packer Unpacker Helper for resolvers
function unpackPacker(e) {
    try {
        let n = e.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
        if (!n) return null;
        let [, t, u, r, l] = n;
        u = parseInt(u), r = parseInt(r), l = l.split("|");
        let a = (i, s) => {
            let o = "0123456789abcdefghijklmnopqrstuvwxyz", c = "";
            for (; i > 0; )
                c = o[i % s] + c, i = Math.floor(i / s);
            return c || "0";
        };
        return t = t.replace(/\b\w+\b/g, (i) => {
            let s = parseInt(i, 36);
            return s < l.length && l[s] ? l[s] : a(s, u);
        }), t;
    } catch (n) {
        return null;
    }
}

async function resolveOkRu(embedUrl) {
    try {
        let e = await localFetch(embedUrl, {
            headers: { "User-Agent": UA, "Accept": "text/html", "Referer": "https://ok.ru/" },
            redirect: "follow"
        }).then((n) => n.text());

        if (e.includes("copyrightsRestricted") || e.includes("COPYRIGHTS_RESTRICTED") || e.includes("LIMITED_ACCESS") || e.includes("notFound") || !e.includes("urls")) {
            return null;
        }

        let cleaned = e.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "");
        let r = [...cleaned.matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)];
        let s = ["full", "hd", "sd", "low", "lowest"];
        let i = r.map((n) => ({ type: n[1], url: n[2] })).filter((n) => !n.type.toLowerCase().includes("mobile") && n.url.startsWith("http"));

        if (i.length === 0) return null;

        let l = i.sort((n, u) => {
            let f = s.findIndex((p) => n.type.toLowerCase().includes(p)), d = s.findIndex((p) => u.type.toLowerCase().includes(p));
            return (f === -1 ? 99 : f) - (d === -1 ? 99 : d);
        })[0];

        let c = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
        return {
            url: l.url,
            server: "OkRu",
            quality: c[l.type] || l.type,
            headers: { "User-Agent": UA, Referer: "https://ok.ru/" }
        };
    } catch (err) {
        return null;
    }
}

async function resolveFilemoon(embedUrl) {
    try {
        let res = await localFetch(embedUrl, { headers: { "User-Agent": UA, Referer: BASE_URL } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let text = await res.text();
        let evalMatch = text.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (evalMatch) {
            let unpacked = unpackPacker(evalMatch[0]);
            if (unpacked) {
                let m3 = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m3) return { url: m3[0], server: "FileMoon", quality: "1080p", headers: { "User-Agent": UA, Referer: embedUrl } };
            }
        }
        let m3 = text.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3) {
            return { url: m3[0], server: "FileMoon", quality: "720p", headers: { "User-Agent": UA, Referer: embedUrl } };
        }
    } catch (err) {
        // ignore
    }
    return null;
}

async function resolveEmbed(url) {
    const u = url.toLowerCase();
    if (u.includes("ok.ru") || u.includes("odnoklassniki")) {
        return resolveOkRu(url);
    }
    if (u.includes("filemoon") || u.includes("fmoon")) {
        return resolveFilemoon(url);
    }
    return null;
}

function cleanTitle(title) {
    if (!title) return "";
    return title.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
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
        const res = await localFetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-ES`).then(r => r.json());
        titleEsES = type === "movie" ? res.title : res.name;
        titleOriginal = type === "movie" ? res.original_title : res.original_name;
        const dateStr = type === "movie" ? res.release_date : res.first_air_date;
        if (dateStr) {
            year = dateStr.split("-")[0];
        }
    } catch (e) {
        console.error("[Retro Latino] TMDB es-ES error:", e.message);
    }
    
    try {
        const res = await localFetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX`).then(r => r.json());
        titleEsMX = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[Retro Latino] TMDB es-MX error:", e.message);
    }
    
    try {
        const res = await localFetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json());
        titleEn = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[Retro Latino] TMDB en-US error:", e.message);
    }
    
    return { titleEsES, titleEsMX, titleOriginal, titleEn, year };
}

function parseSearchPage($, baseUrl) {
    const list = [];
    $("a").each((i, el) => {
        const href = $(el).attr("href");
        if (!href || !href.startsWith("/") || href.length < 4) return;
        
        // Skip navigation/category links
        if (["/peliculas/", "/series/", "/animadas/", "/novedades/", "/busqueda/", "/acceso/", "/membresia.php"].some(x => href.includes(x))) {
            return;
        }
        
        const rawText = $(el).text().trim();
        if (rawText.length < 3) return;

        let year = null;
        let rating = null;
        let title = rawText;

        const match = rawText.match(/^(\d{4})\*([\d.]+)\s*(.*)/);
        if (match) {
            year = parseInt(match[1], 10);
            rating = parseFloat(match[2]);
            title = match[3].trim();
        }

        const absoluteId = href.startsWith("http") ? href : `${baseUrl}${href}`;
        list.push({
            id: absoluteId,
            title: title,
            year: year,
            rating: rating
        });
    });
    return list.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
}

async function searchOnSite(query, type) {
    try {
        const url = `${BASE_URL}/busqueda.php?p=${encodeURIComponent(query)}&s=${type}`;
        const res = await localFetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        return parseSearchPage($, BASE_URL);
    } catch (e) {
        console.error(`[Retro Latino] Search site error for query "${query}" (type=${type}):`, e.message);
        return [];
    }
}

function cleanQueryString(q) {
    return q.replace(/[,;.:!\?]/g, "").replace(/\s+/g, " ").trim();
}

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[Retro Latino] Resolving: TMDB ${tmdbId} (${mediaType})${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`);
    
    // Step 1: Query TMDB for titles
    const info = await getTmdbTitles(tmdbId, mediaType);
    if (!info.titleEsES && !info.titleEsMX && !info.titleOriginal && !info.titleEn) {
        console.log("[Retro Latino] Failed to fetch titles from TMDB.");
        return [];
    }

    // Generate queries
    const queries = [];
    if (info.titleEsMX) queries.push(cleanQueryString(info.titleEsMX));
    if (info.titleEsES && info.titleEsES !== info.titleEsMX) queries.push(cleanQueryString(info.titleEsES));
    if (info.titleEn) queries.push(cleanQueryString(info.titleEn));
    if (info.titleOriginal && info.titleOriginal !== info.titleEsES && info.titleOriginal !== info.titleEn) {
        queries.push(cleanQueryString(info.titleOriginal));
    }
    const uniqueQueries = [...new Set(queries)];

    let matchedContent = null;
    let bestScore = -1;
    let finalSearchType = "";

    const searchTypes = mediaType === "movie" ? ["p"] : ["s", "a"]; // series, then animadas fallback

    for (const typeParam of searchTypes) {
        for (const q of uniqueQueries) {
            console.log(`[Retro Latino] Searching query: "${q}" (type=${typeParam})`);
            const results = await searchOnSite(q, typeParam);
            console.log(`[Retro Latino] Found ${results.length} matches`);

            for (const res of results) {
                let score = 0;
                const cleanedResult = cleanTitle(res.title);

                const checkTitles = [info.titleEsMX, info.titleEsES, info.titleOriginal, info.titleEn];
                for (const t of checkTitles) {
                    if (!t) continue;
                    const cleanedT = cleanTitle(t);
                    if (cleanedResult === cleanedT) {
                        score = Math.max(score, 100);
                    } else if (cleanedResult.includes(cleanedT) || cleanedT.includes(cleanedResult)) {
                        score = Math.max(score, 50);
                    }
                }

                if (score > bestScore && score >= 40) {
                    bestScore = score;
                    matchedContent = res;
                    finalSearchType = typeParam;
                }
            }
            if (bestScore === 100) break;
        }
        if (bestScore === 100) break;
    }

    if (!matchedContent) {
        console.log("[Retro Latino] No matching content found on site.");
        return [];
    }

    console.log(`[Retro Latino] Best Match: "${matchedContent.title}" (Score: ${bestScore}) -> ${matchedContent.id}`);

    const streams = [];

    // Step 2: Resolve stream options based on type
    if (mediaType === "movie") {
        const slugMatch = matchedContent.id.match(/\/([^/]+)\/?$/);
        if (!slugMatch) return [];
        const slug = slugMatch[1];
        
        for (let idx = 0; idx < 3; idx++) {
            try {
                const payload = new URLSearchParams({ p: slug, r: String(idx) }).toString();
                const res = await localFetch(`${BASE_URL}/serv.php`, {
                    method: "POST",
                    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
                    body: payload
                });
                if (!res.ok) continue;
                const iframeUrl = (await res.text()).trim();
                
                if (iframeUrl && iframeUrl !== "Error" && iframeUrl !== "nada") {
                    const cleanIframe = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
                    const resolved = await resolveEmbed(cleanIframe);
                    if (resolved) {
                        streams.push({
                            name: "Retro Latino",
                            title: `${resolved.quality} \xB7 ${resolved.server} \xB7 Direct`,
                            url: resolved.url,
                            quality: resolved.quality,
                            headers: resolved.headers
                        });
                    } else if (!cleanIframe.includes("mega.nz") && !cleanIframe.includes("mega.co")) {
                        let server = "Mirror";
                        try { server = new URL(cleanIframe).hostname.split(".")[0]; } catch(e){}
                        server = server.charAt(0).toUpperCase() + server.slice(1);
                        streams.push({
                            name: "Retro Latino",
                            title: `${server} (Embed)`,
                            url: cleanIframe,
                            quality: "720p",
                            headers: { Referer: matchedContent.id }
                        });
                    }
                }
            } catch (err) {
                console.log(`[Retro Latino] Movie option ${idx} error: ${err.message}`);
            }
        }
    } else {
        const seriesUrl = matchedContent.id;
        let seriesHtml = "";
        try {
            seriesHtml = await localFetch(seriesUrl, { headers: HEADERS }).then(r => r.text());
        } catch (e) {
            console.error("[Retro Latino] Failed to load series page:", e.message);
            return [];
        }

        const $ = cheerio.load(seriesHtml);
        
        let targetOnClick = null;
        let isAnimada = false;

        $("button[onclick]").each((i, el) => {
            const onclick = $(el).attr("onclick") || "";
            const match5 = onclick.match(/carga\(['"]([^'"]+)['"],\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
            if (match5) {
                const p_val = parseInt(match5[4], 10);
                if (p_val === season) {
                    targetOnClick = { slug: match5[1], i: match5[2], f: match5[3], p: match5[4] };
                    isAnimada = true;
                    return false;
                }
            }
            const match3 = onclick.match(/carga\(['"]([^'"]+)['"],\s*(\d+),\s*(\d+)\)/);
            if (match3) {
                const s_num = parseInt(match3[2], 10);
                if (s_num === season) {
                    targetOnClick = { slug: match3[1], season: match3[2] };
                    isAnimada = false;
                    return false;
                }
            }
        });

        if (!targetOnClick) {
            console.log(`[Retro Latino] Season ${season} not found.`);
            return [];
        }

        let vcapUrl = "";
        let payload = null;

        if (isAnimada) {
            vcapUrl = `${BASE_URL}/c/vcap.php`;
            payload = new URLSearchParams({
                s: targetOnClick.slug,
                i: targetOnClick.i,
                f: targetOnClick.f,
                p: targetOnClick.p,
                td: "00"
            }).toString();
        } else {
            vcapUrl = `${BASE_URL}/vcap.php`;
            payload = new URLSearchParams({
                s: targetOnClick.slug,
                t: targetOnClick.season,
                td: "00"
            }).toString();
        }

        let episodesText = "";
        try {
            episodesText = await localFetch(vcapUrl, {
                method: "POST",
                headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
                body: payload
            }).then(r => r.text());
        } catch (e) {
            console.error("[Retro Latino] Failed to fetch episodes list:", e.message);
            return [];
        }

        if (episodesText.includes("≡")) {
            episodesText = episodesText.split("≡")[0];
        }
        
        const parts = episodesText.split("|");
        let matchedEpNumStr = null;

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (!part || !part.includes("┼") || !part.includes("°")) continue;

            const numTitle = part.split("┼")[0];
            const [numStr, title] = numTitle.split("°");
            const epNum = parseInt(numStr.trim(), 10);

            if (epNum === episode) {
                matchedEpNumStr = numStr.trim();
                break;
            }
        }

        if (!matchedEpNumStr) {
            console.log(`[Retro Latino] Episode ${episode} not found in Season ${season}`);
            return [];
        }

        console.log(`[Retro Latino] Matched Episode number string: "${matchedEpNumStr}"`);

        let servUrl = "";
        let servPayload = null;

        if (isAnimada) {
            servUrl = `${BASE_URL}/c/serv-s.php`;
            servPayload = new URLSearchParams({
                s: targetOnClick.slug,
                c: matchedEpNumStr,
                r: "0"
            });
        } else {
            servUrl = `${BASE_URL}/serv-s.php`;
            const epFormat = `${season}x${String(episode).padStart(2, '0')}`;
            servPayload = new URLSearchParams({
                s: targetOnClick.slug,
                t: String(season),
                c: epFormat,
                r: "0"
            });
        }

        for (let idx = 0; idx < 3; idx++) {
            try {
                servPayload.set("r", String(idx));
                const res = await localFetch(servUrl, {
                    method: "POST",
                    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
                    body: servPayload.toString()
                });
                if (!res.ok) continue;
                const iframeUrl = (await res.text()).trim();

                if (iframeUrl && iframeUrl !== "Error" && iframeUrl !== "nada") {
                    const cleanIframe = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
                    console.log(`[Retro Latino] Found Episode Stream Mirror ${idx + 1}: ${cleanIframe}`);
                    
                    const resolved = await resolveEmbed(cleanIframe);
                    if (resolved) {
                        streams.push({
                            name: "Retro Latino",
                            title: `${resolved.quality} \xB7 ${resolved.server} \xB7 Direct`,
                            url: resolved.url,
                            quality: resolved.quality,
                            headers: resolved.headers
                        });
                    } else if (!cleanIframe.includes("mega.nz") && !cleanIframe.includes("mega.co")) {
                        let server = "Mirror";
                        try { server = new URL(cleanIframe).hostname.split(".")[0]; } catch(e){}
                        server = server.charAt(0).toUpperCase() + server.slice(1);
                        streams.push({
                            name: "Retro Latino",
                            title: `${server} (Embed)`,
                            url: cleanIframe,
                            quality: "720p",
                            headers: { Referer: matchedContent.id }
                        });
                    }
                }
            } catch (err) {
                console.log(`[Retro Latino] Episode option ${idx} error: ${err.message}`);
            }
        }
    }

    console.log(`[Retro Latino] Successfully resolved ${streams.length} stream(s)`);
    return streams;
}

module.exports = { getStreams };
