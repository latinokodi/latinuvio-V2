const cheerio = require("cheerio");
const CryptoJS = require("crypto-js");

const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://www.lacartoons.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Connection": "keep-alive"
};

function cleanTitle(title) {
    if (!title) return "";
    return title.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function replaceNumberWords(str) {
    const numWords = {
        "un": "1", "uno": "1", "dos": "2", "tres": "3", "cuatro": "4", "cinco": "5",
        "seis": "6", "siete": "7", "ocho": "8", "nueve": "9", "diez": "10"
    };
    let current = str;
    for (const [word, digit] of Object.entries(numWords)) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        current = current.replace(regex, digit);
    }
    return current;
}

async function resolveOkRu(embedUrl) {
    try {
        let e = await fetch(embedUrl, {
            headers: {
                "User-Agent": UA,
                "Accept": "text/html",
                "Referer": "https://ok.ru/"
            },
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
            headers: {
                "User-Agent": UA,
                "Referer": "https://ok.ru/"
            }
        };
    } catch (err) {
        console.error(`[La Cartoons] OkRu Resolver Error: ${err.message}`);
        return null;
    }
}

// ── Rpmvid / Cubeembed Resolver ──
// API: GET {host}/api/v1/video?id={id}&w=1920&h=1080
// Response: HEX-encoded AES-CBC payload, decrypt with key/iv
async function resolveRpmvid(embedUrl) {
    try {
        let id = "";
        const idx = embedUrl.indexOf("#");
        if (idx !== -1 && idx < embedUrl.length - 1) {
            id = embedUrl.substring(idx + 1).split("&")[0];
        } else {
            id = embedUrl.split("/").pop().replace(".html", "");
        }
        if (!id) return null;
        console.log(`[La Cartoons] Rpmvid resolving id: ${id}`);

        // Extract the main host from the embed URL
        let mainLink;
        try {
            const u = new URL(embedUrl);
            mainLink = `${u.protocol}//${u.host}`;
        } catch (e) {
            mainLink = "https://rpmvid.com";
        }
        console.log(`[La Cartoons] Rpmvid mainLink: ${mainLink}`);

        const apiUrl = `${mainLink}/api/v1/video?id=${encodeURIComponent(id)}&w=1920&h=1080`;

        const resp = await fetch(apiUrl, {
            headers: {
                "User-Agent": UA,
                "Referer": mainLink,
                "Accept": "*/*"
            }
        });

        if (!resp.ok) {
            console.log(`[La Cartoons] Rpmvid API returned ${resp.status}`);
            return null;
        }

        const hexPayload = await resp.text();
        console.log(`[La Cartoons] Rpmvid hex payload: ${hexPayload.substring(0, 60)}...`);

        // Decrypt hex AES-CBC payload
        const key = CryptoJS.enc.Utf8.parse("kiemtienmua911ca");
        const iv = CryptoJS.enc.Utf8.parse("1234567890oiuytr");
        const hexBytes = CryptoJS.enc.Hex.parse(hexPayload);
        const base64Cipher = CryptoJS.enc.Base64.stringify(hexBytes);
        
        const decrypted = CryptoJS.AES.decrypt(base64Cipher, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
            console.log(`[La Cartoons] Rpmvid: decryption produced empty string`);
            return null;
        }

        console.log(`[La Cartoons] Rpmvid decrypted: ${decrypted.substring(0, 200)}`);
        const payload = JSON.parse(decrypted);

        // Extract stream URL from hls, hlsVideoTiktok, or cf fields
        let finalUrl = null;
        if (payload.hls) {
            finalUrl = payload.hls.startsWith("http") ? payload.hls : `${mainLink}${payload.hls}`;
        } else if (payload.hlsVideoTiktok) {
            let v = "";
            try {
                const config = JSON.parse(payload.streamingConfig || "{}");
                v = (config.adjust && config.adjust.Tiktok && config.adjust.Tiktok.params && config.adjust.Tiktok.params.v) || "";
            } catch (e) {}
            const query = v ? `?v=${v}` : "";
            const path = payload.hlsVideoTiktok.startsWith("http") ? payload.hlsVideoTiktok : `${mainLink}${payload.hlsVideoTiktok}`;
            finalUrl = `${path}${query}`;
        } else if (payload.cf) {
            let cfUrl = payload.cf.startsWith("http") ? payload.cf : payload.cf;
            // Add expiry tokens
            if (payload.cfExpire) {
                const parts = payload.cfExpire.split("::");
                if (parts.length >= 2) {
                    cfUrl = `${cfUrl}?t=${parts[0]}&e=${parts[1]}`;
                }
            }
            finalUrl = cfUrl;
        }

        if (finalUrl) {
            if (finalUrl.includes(".txt")) {
                finalUrl += "#index.m3u8";
            }
            console.log(`[La Cartoons] Rpmvid resolved: ${finalUrl.substring(0, 120)}...`);
            return {
                url: finalUrl,
                quality: "720p",
                server: "Rpmvid",
                headers: {
                    "Referer": mainLink,
                    "User-Agent": UA
                }
            };
        }

        console.log(`[La Cartoons] Rpmvid: no hls/cf field in decrypted payload`);
        return null;
    } catch (err) {
        console.error(`[La Cartoons] Rpmvid Error: ${err.message}`);
        return null;
    }
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
        console.error("[La Cartoons] TMDB es-ES error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX`).then(r => r.json());
        titleEsMX = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[La Cartoons] TMDB es-MX error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json());
        titleEn = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[La Cartoons] TMDB en-US error:", e.message);
    }
    
    return { titleEsES, titleEsMX, titleOriginal, titleEn, year };
}

function parseHomeShows($, baseUrl) {
    const list = [];
    const containers = $("div.conjuntos-series");
    containers.each((i, container) => {
        const links = $(container).find("a[href^='/serie/'], a[href*='/serie/']");
        links.each((j, a) => {
            const href = $(a).attr("href");
            if (!href) return;
            const card = $(a).find("div.serie");
            if (card.length === 0) return;
            const img = card.find("img").attr("src") || "";
            const title = card.find("p.nombre-serie").text().replace(/\s+/g, " ").trim();
            const absolutePoster = img.startsWith("http") ? img : `${baseUrl}${img}`;
            const absoluteId = href.startsWith("http") ? href : `${baseUrl}${href}`;
            list.push({
                id: absoluteId,
                title: title,
                poster: absolutePoster,
                banner: absolutePoster
            });
        });
    });
    return list.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
}

async function searchOnSite(query) {
    try {
        const url = `${BASE_URL}/?Titulo=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        return parseHomeShows($, BASE_URL);
    } catch (e) {
        console.error(`[La Cartoons] Search site error for query "${query}":`, e.message);
        return [];
    }
}

function generateQueries(info) {
    const queries = [];
    const addQuery = (q) => {
        if (!q) return;
        
        // Clean punctuation first (Crucial for La Cartoons search engine)
        const cleanQ = q.replace(/[,;.:!\?]/g, "").replace(/\s+/g, " ").trim();
        queries.push(cleanQ);

        // Stripped leading articles
        const stripped = cleanQ.replace(/^(the|los|las|el|la|lo|un|una|unos|unas)\s+/i, "");
        if (stripped !== cleanQ) {
            queries.push(stripped);
        }
        
        // Digit conversion variant
        const digitVariant = replaceNumberWords(cleanQ);
        if (digitVariant !== cleanQ) {
            queries.push(digitVariant);
            const strippedDigit = digitVariant.replace(/^(the|los|las|el|la|lo|un|una|unos|unas)\s+/i, "");
            if (strippedDigit !== digitVariant) {
                queries.push(strippedDigit);
            }
        }

        // "Super" word boundary splitting helper
        if (cleanQ.toLowerCase().includes("super")) {
            const splitSuper = cleanQ.replace(/super(\w+)/gi, "super $1");
            if (splitSuper !== cleanQ) {
                queries.push(splitSuper);
                const strippedSplit = splitSuper.replace(/^(the|los|las|el|la|lo|un|una|unos|unas)\s+/i, "");
                if (strippedSplit !== splitSuper) {
                    queries.push(strippedSplit);
                }
            }
            const combineSuper = cleanQ.replace(/super\s+(\w+)/gi, "super$1");
            if (combineSuper !== cleanQ) {
                queries.push(combineSuper);
                const strippedCombine = combineSuper.replace(/^(the|los|las|el|la|lo|un|una|unos|unas)\s+/i, "");
                if (strippedCombine !== combineSuper) {
                    queries.push(strippedCombine);
                }
            }
        }
        
        // Split by colons and dashes
        if (q.includes(":") || q.includes("-")) {
            const parts = q.split(/[:\-]/);
            const firstPart = parts[0].replace(/[,;.:!\?]/g, "").replace(/\s+/g, " ").trim();
            if (firstPart.length > 2) {
                queries.push(firstPart);
                const strippedFirst = firstPart.replace(/^(the|los|las|el|la|lo|un|una|unos|unas)\s+/i, "");
                if (strippedFirst !== firstPart) {
                    queries.push(strippedFirst);
                }
                const digitFirst = replaceNumberWords(firstPart);
                if (digitFirst !== firstPart) {
                    queries.push(digitFirst);
                }
            }
        }
    };
    
    if (info.titleEsMX) addQuery(info.titleEsMX);
    if (info.titleEsES && info.titleEsES !== info.titleEsMX) addQuery(info.titleEsES);
    if (info.titleEn) addQuery(info.titleEn);
    if (info.titleOriginal) addQuery(info.titleOriginal);
    
    return [...new Set(queries)];
}

function extractEpisodeNumber(text) {
    const match = text.match(/Capitulo\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== "tv") {
        console.log("[La Cartoons] Only TV shows are supported.");
        return [];
    }

    console.log(`[La Cartoons] Resolving TMDB ID: ${tmdbId}, Season: ${season}, Episode: ${episode}`);
    
    // Step 1: Query TMDB for titles
    const info = await getTmdbTitles(tmdbId, mediaType);
    if (!info.titleEsES && !info.titleEsMX && !info.titleOriginal && !info.titleEn) {
        console.log("[La Cartoons] Failed to fetch titles from TMDB.");
        return [];
    }

    console.log(`[La Cartoons] TMDB Info: EsMX="${info.titleEsMX}", EsES="${info.titleEsES}", Original="${info.titleOriginal}", En="${info.titleEn}", Year=${info.year}`);

    // Generate search queries
    const uniqueQueries = generateQueries(info);
    
    let matchedSeries = null;
    let bestScore = -1;

    for (const q of uniqueQueries) {
        console.log(`[La Cartoons] Searching on site with query: "${q}"`);
        const results = await searchOnSite(q);
        console.log(`[La Cartoons] Found ${results.length} search results on site.`);

        for (const res of results) {
            let score = 0;
            const cleanedResult = cleanTitle(res.title);
            
            if (info.titleEsMX) {
                const cleanedEsMX = cleanTitle(info.titleEsMX);
                const digitEsMX = cleanTitle(replaceNumberWords(info.titleEsMX));
                const splitSuperEsMX = cleanTitle(info.titleEsMX.replace(/super(\w+)/gi, "super $1"));
                if (cleanedResult === cleanedEsMX || cleanedResult === digitEsMX || cleanedResult === splitSuperEsMX) {
                    score = Math.max(score, 100);
                } else if (cleanedResult.includes(cleanedEsMX) || cleanedEsMX.includes(cleanedResult)) {
                    score = Math.max(score, 50);
                }
            }
            if (info.titleEsES) {
                const cleanedEsES = cleanTitle(info.titleEsES);
                const digitEsES = cleanTitle(replaceNumberWords(info.titleEsES));
                const splitSuperEsES = cleanTitle(info.titleEsES.replace(/super(\w+)/gi, "super $1"));
                if (cleanedResult === cleanedEsES || cleanedResult === digitEsES || cleanedResult === splitSuperEsES) {
                    score = Math.max(score, 95);
                } else if (cleanedResult.includes(cleanedEsES) || cleanedEsES.includes(cleanedResult)) {
                    score = Math.max(score, 48);
                }
            }
            if (info.titleOriginal) {
                const cleanedOrig = cleanTitle(info.titleOriginal);
                if (cleanedResult === cleanedOrig) {
                    score = Math.max(score, 90);
                } else if (cleanedResult.includes(cleanedOrig) || cleanedOrig.includes(cleanedResult)) {
                    score = Math.max(score, 45);
                }
            }
            if (info.titleEn) {
                const cleanedEn = cleanTitle(info.titleEn);
                if (cleanedResult === cleanedEn) {
                    score = Math.max(score, 80);
                } else if (cleanedResult.includes(cleanedEn) || cleanedEn.includes(cleanedResult)) {
                    score = Math.max(score, 40);
                }
            }

            console.log(`  - Candidate: "${res.title}" -> Score: ${score} -> ${res.id}`);
            if (score > bestScore && score >= 40) {
                bestScore = score;
                matchedSeries = res;
            }
        }

        // If we found an exact match, stop searching other queries
        if (bestScore === 100) break;
    }

    if (!matchedSeries) {
        console.log("[La Cartoons] No matching series found on site.");
        return [];
    }

    console.log(`[La Cartoons] Matched Series: "${matchedSeries.title}" (Score: ${bestScore}) -> ${matchedSeries.id}`);

    // Step 2: Fetch Series Page
    const seriesUrl = matchedSeries.id;
    let seriesHtml = "";
    try {
        const res = await fetch(seriesUrl, { headers: HEADERS });
        if (!res.ok) return [];
        seriesHtml = await res.text();
    } catch (e) {
        console.error(`[La Cartoons] Error fetching series page ${seriesUrl}:`, e.message);
        return [];
    }

    const $ = cheerio.load(seriesHtml);

    // Parse seasons to locate index
    const temporadaHeaders = $("section.contenedor-episodio-temporada h4.accordion");
    let targetIndex = -1;
    let seasonCounter = 0;
    
    temporadaHeaders.each((i, el) => {
        const text = $(el).text().trim();
        const match = text.match(/Temporada\s+(\d+)/i);
        const seasonNumber = match ? parseInt(match[1], 10) : (++seasonCounter);
        if (seasonNumber === season) {
            targetIndex = i;
        }
    });

    const panels = $("section.contenedor-episodio-temporada div.episodio-panel");
    let episodeLinks = null;

    if (targetIndex !== -1 && panels.length > targetIndex) {
        episodeLinks = $(panels[targetIndex]).find("ul.listas-de-episodion li a");
    } else {
        // Fallback: search links containing ?t=season query param
        episodeLinks = $(`ul.listas-de-episodion li a[href*="?t=${season}"]`);
    }

    if (!episodeLinks || episodeLinks.length === 0) {
        console.log(`[La Cartoons] Season ${season} not found or has no episodes.`);
        return [];
    }

    let matchedEpisodeUrl = null;
    episodeLinks.each((i, a) => {
        const href = $(a).attr("href");
        if (!href) return;
        const text = $(a).text().trim().replace(/\s+/g, " ");
        const epNum = extractEpisodeNumber(text);
        if (epNum === episode) {
            matchedEpisodeUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
            return false; // break loop
        }
    });

    if (!matchedEpisodeUrl) {
        console.log(`[La Cartoons] Episode ${episode} not found in Season ${season}.`);
        return [];
    }

    console.log(`[La Cartoons] Matched Episode URL: ${matchedEpisodeUrl}`);

    // Step 3: Fetch Episode Page and resolve stream iframe
    let episodeHtml = "";
    try {
        const res = await fetch(matchedEpisodeUrl, { headers: HEADERS });
        if (!res.ok) return [];
        episodeHtml = await res.text();
    } catch (e) {
        console.error(`[La Cartoons] Error fetching episode page ${matchedEpisodeUrl}:`, e.message);
        return [];
    }

    const $ep = cheerio.load(episodeHtml);
    const iframe = $ep("iframe[src]").first();
    if (iframe.length === 0) {
        console.log("[La Cartoons] No iframe source found on episode page.");
        return [];
    }

    let iframeSrc = iframe.attr("src") || "";
    if (iframeSrc.startsWith("//")) {
        iframeSrc = "https:" + iframeSrc;
    }

    if (!iframeSrc) {
        console.log("[La Cartoons] Iframe source is empty.");
        return [];
    }

    console.log(`[La Cartoons] Found Stream Iframe: ${iframeSrc}`);

    let resolved = null;
    if (iframeSrc.includes("ok.ru") || iframeSrc.includes("odnoklassniki")) {
        console.log("[La Cartoons] Attempting to resolve ok.ru stream...");
        resolved = await resolveOkRu(iframeSrc);
    } else if (iframeSrc.includes("rpmvid") || iframeSrc.includes("cubeembed") || iframeSrc.includes("upns")) {
        console.log("[La Cartoons] Attempting to resolve rpmvid/cubeembed stream...");
        resolved = await resolveRpmvid(iframeSrc);
    }

    const streams = [];
    if (resolved) {
        const quality = resolved.quality || "720p";
        const server = resolved.server || "Direct";
        streams.push({
            provider: "La Cartoons",
            title: `${quality} \\xB7 ${server} \\xB7 Direct`,
            url: resolved.url,
            quality: quality,
            headers: resolved.headers
        });
    } else {
        let serverName = "Mirror";
        try {
            const host = new URL(iframeSrc).hostname;
            serverName = host
                .replace("www.", "")
                .split(".")[0];
            serverName = serverName.charAt(0).toUpperCase() + serverName.slice(1);
        } catch (err) {
            // ignore
        }
        streams.push({
            provider: "La Cartoons",
            title: `${serverName} (Embed)`,
            url: iframeSrc,
            quality: "720p",
            isEmbed: true,
            headers: {
                "Referer": "https://www.lacartoons.com/"
            }
        });
    }

    console.log(`[La Cartoons] Successfully resolved ${streams.length} stream.`);
    return streams;
}

module.exports = { getStreams };
