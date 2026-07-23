const cheerio = require("cheerio");
const crypto = require("crypto");
const https = require("https");

const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://retrotve.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

// Workaround for Node.js undici SSL bugs with retrotve.com
function localFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: options.method || "GET",
            headers: { ...HEADERS, ...(options.headers || {}) },
            rejectUnauthorized: false,
            timeout: 15000,
        }, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => resolve({ ok: res.statusCode < 400, status: res.statusCode, text: () => Promise.resolve(data) }));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.end();
    });
}

const EMBED_SAFE = ["streamwish", "strwish", "embedwish", "vidhide", "voe", "filemoon",
    "mixdrop", "dood", "uqload", "streamtape", "ok.ru", "mp4upload", "yourupload",
    "sendvid", "dhtpre"];

// ── SendVid Resolver (from Kodi resolveurl) ─────────────────────────────

async function resolveSendvid(embedUrl) {
    try {
        // Normalize: extract video ID from URL
        const idMatch = embedUrl.match(/sendvid\.com\/(?:embed\/)?([a-z0-9]+)/i);
        if (!idMatch) return null;
        const url = `https://sendvid.com/${idMatch[1]}`;
        
        const resp = await localFetch(url);
        if (resp.status !== 200) return null;
        const html = await resp.text();
        
        // Extract source src from video tag
        const srcMatch = html.match(/source\s+src="([^"]+)"/i);
        if (srcMatch) {
            return { url: srcMatch[1], server: "SendVid", quality: "720p",
                headers: { "Referer": "https://sendvid.com/", "User-Agent": UA } };
        }
        // Try og:video meta
        const ogMatch = html.match(/<meta\s+property="og:video(?::secure_url)?"\s+content="([^"]+)"/i);
        if (ogMatch) {
            return { url: ogMatch[1], server: "SendVid", quality: "720p",
                headers: { "Referer": "https://sendvid.com/", "User-Agent": UA } };
        }
        return null;
    } catch { return null; }
}

// ── FileMoon Resolver (from Kodi addon) ──────────────────────────────────

function extractFilemoonId(url) {
    const m = url.match(/\/(?:e|d)\/([a-z0-9]{12})/i);
    return m ? m[1] : null;
}

const FILEMOON_KEY_PARTS = [
    "c2N0VmRFUTRlQ2xmVktsT1dsTlZjbFU5UldZeUNscFRkbkZLUVd0TlpYTkhSM0JWYmxJeFVuVjNia3BrVTAweFNrZFhSUVJEZUZoTVNqVkdkazB4YVVsck5sQm9aakZ5VDBkaFNqTndTM0pvVlVaaU56ZFVOMk5sUVd0S2RIaDBhM1JUZWsxMGRXUm5VREJ3VUZneFdrMUdRVWx4WjJjd1QyWjRkVHAwT1RWU2FIaHBURkpIWkRsQ2FGcEtWMnBZVjFZeFJqUjRiMWx2WmtWc1dUTnRiSGRhUkhoaFdtWlBkVTFIVldWbFJIQlRaWFJTVkVGM01VcERUbTFqZGtoR2RFbHBYMmRaUjBOTVNETjFia1ZVVERCeFpWbHRURzFxUlhCcVNYRjFlRXRETTFwc1ZYQmxWMjVZUTFwVmMzWXRSVGg0THpNclRpOU1SR3g2VXpBeE0wSXlNa1pRYVhwYVQzZHZUMmhRVVhOVVlXMW5NVTVHU0RoUVoweFhSMkozVTJGMVZuWlJkM05OZW1nM2Mxd3hUbXBaWjBVNFNrNTFkQ3R1VEdwWFNGTjFOa3hGVFhWeVZUQkRVRWhIUVRsUE5VdDVOMlpDZGxGVVdsRk5OSEp6WWpsNFlrUXlOakZZV0hOSWJUQXdRMUpXYTA5VVJqTkNUblZsYVRFM1dIbHhSbFZ4VFVwUkswUXRhbWxPUjBwaVh6TTJZa0VpTENBaw==",
    "Um10T2JWbHVXbEZQVkdNd1kybDBORmx0VFRsT1ZUVnFZMjVDVlUweVNUUlBSRTEzV2tSS1VsWnNhRTVoU0VwblRHMU9iRTVzVW5aUFZHY3hUbGhzYjFFeGNHOVdNazV3WWxOS2NGSnNhRUZqUjBaTFdrUndWRTB5ZUVWWFJWcFRVVmh3VlZKRVVsRlhSa1pMVjFab1VGRlViRkJpVjBaR1kxWndlbE5JZEhkV2JYaHBUMmxDVjJacVJYZFBSazE2VFdwV1YwMVdaRWhhV0doeFZUSjBkVm95V25kV2FtUnJUa2xyVDAxRFFqQlBVazEyVmpKNFlWSXlhRzlWYlRWc1dUSTFkMDVFVVhsTmVrVjZXVE5XYTA1RlJYaFBSRGhQVjFoblowMVJiSFZOU0VwWlZGVmFkMDlFUW5aT2FrVXlVVlV4VDAxVmFHdFBWekZ4VTFoV1EwMUVUWE5QUjBaelUxWk9iMUpFUW1wT1JsSkhVV3hCTlU5SFJtcE9WRkpRVUdsQ2FrMVhTa3hVVmxaQ1ZrUk5RVTFIU21sT1ZFMVhaRVZSTlU1SFRtaE5WRlF3V1ROVk0wMVhUVEpOYWxreVRFTldhazFJV2twT1ZrRTBUM2xDUlU5VFFUTk5hbEV3VmpCUk5FMVhVVEpQVkVreVRVUlJNRTlZVGtwUFZFRTBVMVpqWTAxRVdUSk5lbEUwVWpOTmFrMUhXa3BPVjJkb1VHMWFiRTB5Um5SVk0xVTlDaTBnSWl3Z0lDQWlRV1J6YjJsMElpNEtDUT09",
];

function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Buffer.from(s, 'base64');
}

function aesGcmDecrypt(encryptedB64, key, iv) {
    try {
        const authTagLength = 16;
        const encrypted = b64urlDecode(encryptedB64);
        const ciphertext = encrypted.subarray(0, encrypted.length - authTagLength);
        const authTag = encrypted.subarray(encrypted.length - authTagLength);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString('utf-8'));
    } catch (e) {
        return null;
    }
}

async function resolveFilemoon(embedUrl) {
    try {
        const videoId = extractFilemoonId(embedUrl);
        if (!videoId) return null;
        const apiUrl = `https://filemoon.to/api/videos/${videoId}`;
        const res = await fetch(apiUrl, {
            headers: { "User-Agent": UA, "Accept": "application/json", "Origin": BASE_URL, "Referer": BASE_URL + "/" }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.encrypted) return null;

        for (const keyPartB64 of FILEMOON_KEY_PARTS) {
            const keyPart = b64urlDecode(keyPartB64);
            const key = Buffer.concat([keyPart.subarray(0, 16), keyPart.subarray(16, 32)]);
            const iv = b64urlDecode(data.iv || data.salt || "AAAAAAAAAAAAAAAAAAAAAA==");
            const decrypted = aesGcmDecrypt(data.encrypted, key, iv);
            if (decrypted && decrypted.source) {
                return { url: decrypted.source, server: "FileMoon", quality: "1080p", headers: { "User-Agent": UA, "Referer": "https://filemoon.to/", "Origin": "https://filemoon.to" } };
            }
        }
    } catch (e) {}
    return null;
}

// ── Trembed / DooPlay system ────────────────────────────────────────────

async function extractVideoLinks(pageUrl) {
    const streams = [];
    try {
        const res = await localFetch(pageUrl);
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);

        const trembedUrls = new Set();
        const seenUrls = new Set();

        // 1. DooPlay player option buttons (from Kodi addon)
        $("li.dooplay_player_option").each((_, opt) => {
            const postId = $(opt).attr("data-post");
            const nume = $(opt).attr("data-nume");
            const trtype = $(opt).attr("data-type") || "1";
            if (postId && nume) {
                trembedUrls.add(`${BASE_URL}/?trembed=${nume}&trid=${postId}&trtype=${trtype}`);
            }
        });

        // 2. Direct iframes — capture trembed URLs and embed-safe hosts
        $("iframe[src]").each((_, iframe) => {
            let src = $(iframe).attr("src") || "";
            if (src.startsWith("//")) src = "https:" + src;
            if (!src || seenUrls.has(src)) return;

            // Trembed URLs in iframes
            if (src.includes("trembed=") && src.includes("trid=")) {
                src = src.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
                trembedUrls.add(src);
                return;
            }

            if (src.includes("mega.nz") || EMBED_SAFE.some(h => src.includes(h))) {
                streams.push({
                    provider: "Colección 2",
                    title: "Direct Embed",
                    url: src,
                    quality: "720p",
                    isEmbed: true,
                    headers: { "Referer": BASE_URL + "/", "User-Agent": UA }
                });
                seenUrls.add(src);
            }
        });

        // 2b. Regex extraction for encoded trembed URLs (from Kodi addon)
        const rawHtml = html.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
        const regexTrembed = rawHtml.match(/https?:\/\/[^\s"'<>]+\/?\?trembed=\d+[^\s"'<>]*trid=\d+[^\s"'<>]*trtype=\d+/gi);
        if (regexTrembed) {
            regexTrembed.forEach(u => trembedUrls.add(u));
        }

        // 3. Process trembed URLs
        for (const embedUrl of trembedUrls) {
            try {
                const resp = await localFetch(embedUrl);
                if (resp.status !== 200) continue;
                const innerHtml = await resp.text();
                const $$ = cheerio.load(innerHtml);
                const iframe = $$("iframe[src]").first();
                if (iframe.length === 0) continue;

                let src = iframe.attr("src") || "";
                if (src.startsWith("//")) src = "https:" + src;
                if (!src || seenUrls.has(src)) continue;
                seenUrls.add(src);

                const serverName = getServerName(src);
                const isEmbed = EMBED_SAFE.some(h => src.toLowerCase().includes(h));

                // Try FileMoon resolver
                if (src.includes("filemoon")) {
                    const resolved = await resolveFilemoon(src);
                    if (resolved && resolved.url) {
                        streams.push({
                            provider: "Colección 2",
                            title: `${resolved.server} · Direct`,
                            url: resolved.url,
                            quality: resolved.quality,
                            headers: resolved.headers
                        });
                        continue;
                    }
                }

                // Try SendVid resolver
                if (src.includes("sendvid")) {
                    const resolved = await resolveSendvid(src);
                    if (resolved && resolved.url) {
                        streams.push({
                            provider: "Colección 2",
                            title: `${resolved.server} · Direct`,
                            url: resolved.url,
                            quality: resolved.quality,
                            headers: resolved.headers
                        });
                        continue;
                    }
                }

                streams.push({
                    provider: "Colección 2",
                    title: `${serverName} (Embed)`,
                    url: src,
                    quality: "720p",
                    isEmbed: isEmbed || undefined,
                    headers: { "Referer": BASE_URL + "/", "User-Agent": UA }
                });
            } catch (e) {
                console.log(`[Colección 2] Trembed error: ${e.message}`);
            }
        }

        console.log(`[Colección 2] Found ${streams.length} streams`);
    } catch (e) {
        console.error(`[Colección 2] Extract error: ${e.message}`);
    }
    return streams;
}

function getServerName(url) {
    try {
        const host = new URL(url).hostname;
        return host.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + host.replace("www.", "").split(".")[0].slice(1);
    } catch { return "Mirror"; }
}

// ── TMDB helpers ─────────────────────────────────────────────────────────

function cleanTitle(title) {
    if (!title) return "";
    return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function getSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 100;
    const len = Math.max(a.length, b.length);
    if (len === 0) return 100;
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
    }
    return Math.round((matches / len) * 100);
}

async function getTmdbTitles(tmdbId, type) {
    let titleEsES = null, titleEsMX = null, titleOriginal = null, titleEn = null, year = null;
    try {
        const langs = [
            ["es-ES", (r) => { titleEsES = type === "movie" ? r.title : r.name; titleOriginal = type === "movie" ? r.original_title : r.original_name; year = (r.release_date || r.first_air_date || "").substring(0, 4); }],
            ["es-MX", (r) => { titleEsMX = type === "movie" ? r.title : r.name; }],
            ["en-US", (r) => { titleEn = type === "movie" ? r.title : r.name; }],
        ];
        for (const [lang, cb] of langs) {
            try {
                const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=${lang}`).then(r => r.json());
                cb(res);
            } catch (e) {}
        }
    } catch (e) {}
    return { titleEsES, titleEsMX, titleOriginal, titleEn, year };
}

function generateQueries(info) {
    const queries = [];
    const add = (q) => { if (q) { const c = q.replace(/[,;.:!?]/g, "").replace(/\s+/g, " ").trim(); if (c) queries.push(c); } };
    // Prioritize original/English titles — the site uses original names
    if (info.titleOriginal) add(info.titleOriginal);
    if (info.titleEn && info.titleEn !== info.titleOriginal) add(info.titleEn);
    if (info.titleEsMX) add(info.titleEsMX);
    if (info.titleEsES && info.titleEsES !== info.titleEsMX) add(info.titleEsES);
    return [...new Set(queries)];
}

function parseSearchPage($) {
    const list = [];
    $("article, .item").each((_, el) => {
        const linkTag = $(el).find("a").first();
        if (!linkTag.length) return;
        const href = linkTag.attr("href");
        if (!href) return;
        const titleTag = $(el).find("h2, h3").first();
        const title = titleTag.length ? titleTag.text().trim() : linkTag.text().trim();
        const is_series = href.includes("/serie/") || href.includes("/lista-de-series/");
        list.push({ id: href, title, is_series });
    });
    return list.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
}

async function searchOnSite(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const res = await localFetch(url);
        if (!res.ok) return [];
        const html = await res.text();
        return parseSearchPage(cheerio.load(html));
    } catch (e) {
        console.error(`[Colección 2] Search error: ${e.message}`);
        return [];
    }
}

// ── getStreams ────────────────────────────────────────────────────────────

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[Colección 2] Resolving: TMDB ${tmdbId} (${mediaType}) S${season}E${episode}`);

    const info = await getTmdbTitles(tmdbId, mediaType);
    if (!info.titleEsES && !info.titleEsMX && !info.titleOriginal && !info.titleEn) {
        console.log("[Colección 2] Failed to fetch titles from TMDB.");
        return [];
    }

    const queries = generateQueries(info);
    let matchedContent = null;
    let bestScore = -1;

    for (const q of queries) {
        console.log(`[Colección 2] Searching: "${q}"`);
        const results = await searchOnSite(q);
        console.log(`[Colección 2] Found ${results.length} matches`);

        for (const res of results) {
            if (mediaType === "movie" && res.is_series) continue;
            if (mediaType === "tv" && !res.is_series) continue;

            let score = 0;
            const cleanedResult = cleanTitle(res.title);
            const checkTitles = [info.titleOriginal, info.titleEn, info.titleEsMX, info.titleEsES].filter(Boolean);

            for (const t of checkTitles) {
                const cleanedT = cleanTitle(t);
                const sim = getSimilarity(cleanedResult, cleanedT);
                if (cleanedResult === cleanedT) score = Math.max(score, 100);
                else if (cleanedResult.includes(cleanedT) || cleanedT.includes(cleanedResult)) score = Math.max(score, 70 + (sim * 0.3));
                else score = Math.max(score, sim);
            }

            if (score > bestScore && score >= 30) {
                bestScore = score;
                matchedContent = res;
            }
        }
        if (bestScore === 100) break;
    }

    if (!matchedContent) {
        console.log("[Colección 2] No matching content found.");
        return [];
    }

    console.log(`[Colección 2] Best Match: "${matchedContent.title}" (Score: ${bestScore})`);

    if (mediaType === "movie") {
        return extractVideoLinks(matchedContent.id);
    }

    // TV: find episode
    try {
        const seriesHtml = await localFetch(matchedContent.id).then(r => r.text());
        const $ = cheerio.load(seriesHtml);

        let episodeUrl = null;
        const headers = $(".AA-Season");
        for (let i = 0; i < headers.length; i++) {
            const text = $(headers[i]).text().trim();
            const sMatch = text.match(/Temporada\s+(\d+)/i);
            if (!sMatch || parseInt(sMatch[1]) !== season) continue;

            const container = $(headers[i]).next(".TPTblCn");
            if (!container.length) continue;

            const rows = container.find("tr, li, a[href]");
            rows.each((_, row) => {
                const a = $(row).is("a") ? $(row) : $(row).find("a[href]").first();
                const href = a.attr("href");
                if (!href || !href.includes("/seriestv/")) return;

                // Extract season+episode from href — two formats:
                // Format A: "{slug}-{S}x{E}/" (e.g. automan-1x1)
                // Format B: "{slug}-temporada{S}-episodio{E}/" (e.g. el-auto-fantastico-temporada1-episodio1)
                const epMatchA = href.match(/-(\d+)x(\d+)\/?$/i);
                const epMatchB = href.match(/temporada(\d+)[-]episodio(\d+)/i);
                const epMatch = epMatchA || epMatchB;
                if (epMatch && parseInt(epMatch[1]) === season && parseInt(epMatch[2]) === episode) {
                    episodeUrl = href;
                    return false;
                }
            });
            if (episodeUrl) break;
        }

        if (episodeUrl) {
            console.log(`[Colección 2] Found episode: ${episodeUrl}`);
            return extractVideoLinks(episodeUrl);
        }
        console.log(`[Colección 2] Episode S${season}E${episode} not found`);
    } catch (e) {
        console.error(`[Colección 2] Series error: ${e.message}`);
    }

    return [];
}

module.exports = { getStreams };
