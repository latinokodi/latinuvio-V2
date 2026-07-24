/**
 * EntrePeliculasySeries provider
 * Source site: https://entrepeliculasyseries.nz/
 *
 * Architecture:
 *  1. TMDB lookup → collect ES/EN title variants
 *  2. Search site via /search?s= (HTML scrape of <article> cards)
 *  3. Determine movie slug → /pelicula/<slug>  or  TV slug → /serie/<slug>
 *  4. For TV: parse season tabs → navigate to /serie/<slug>/temporada/<s>/capitulo/<e>
 *  5. Fetch /vidurl/<imdb-id>-<SxEE>/  embed page
 *  6. Solve Proof-of-Work (SHA-256 hashcash, difficulty 3) to derive AES key
 *  7. Decrypt each sortedEmbed.link via AES-CBC → real embed URL
 *  8. Route each embed URL through our resolver stack
 *
 * Supports: movies, TV shows
 */

const CryptoJS = require("crypto-js");
const nodeCrypto = require("crypto");

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const HOST        = "https://entrepeliculasyseries.nz";
const USER_AGENT  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-MX,es-US;q=0.9,es;q=0.8,en-US;q=0.7,en;q=0.6",
    "Referer": HOST + "/",
    "Connection": "keep-alive"
};

// ---------------------------------------------------------------------------
// Title utilities
// ---------------------------------------------------------------------------

function cleanTitle(title) {
    if (!title) return "";
    return title
        .toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/:\s*.*?$/g, "")
        .replace(/[-_]/g, " ")
        .replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getSearchQuery(title) {
    if (!title) return "";
    let q = title.split(":")[0];
    q = q.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
    q = q.replace(/[^a-zA-Z0-9\s\-áéíóúÁÉÍÓÚñÑ]/g, "");
    return q.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// TMDB
// ---------------------------------------------------------------------------

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
    let imdbId = "";
    const languages = ["es-MX", "es-ES", "en-US"];

    for (const lang of languages) {
        try {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`;
            const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(r => r.json());
            const title = type === "movie" ? res.title : res.name;
            const original = type === "movie" ? res.original_title : res.original_name;
            if (title) titles.add(title);
            if (original) titles.add(original);
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        } catch (e) {
            console.log(`[EntrePeliculas] TMDB Error (${lang}): ${e.message}`);
        }
    }

    // Get external IDs (for IMDB id used by vidurl)
    try {
        const extUrl = `https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${TMDB_API_KEY}`;
        const extRes = await fetch(extUrl, { headers: { "User-Agent": USER_AGENT } }).then(r => r.json());
        imdbId = extRes.imdb_id || "";
    } catch (e) {}

    return titles.size > 0 ? { titles: Array.from(titles), year, imdbId } : null;
}

// ---------------------------------------------------------------------------
// HTML scraping helpers
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g, "&")
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#8211;/g, "–")
        .replace(/&#8217;/g, "'")
        .replace(/&#8230;/g, "…")
        .replace(/&nbsp;/g, " ");
}

const https = require('https');

function localFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        // Create fresh agent per request to avoid TLS session issues
        const agent = new https.Agent({
            rejectUnauthorized: false,
            ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256',
            maxVersion: 'TLSv1.3',
        });
        https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: { ...HEADERS, ...(options.headers || {}) },
            agent,
            timeout: 15000,
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                agent.destroy();
                resolve({ ok: res.statusCode < 400, status: res.statusCode, text: () => Promise.resolve(data) });
            });
        }).on('error', e => {
            agent.destroy();
            reject(e);
        }).on('timeout', function() {
            agent.destroy();
            this.destroy();
            reject(new Error('timeout'));
        }).end();
    });
}

async function fetchPage(url, extraHeaders = {}) {
    try {
        const res = await localFetch(url, { headers: extraHeaders });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (e) {
        console.log(`[EntrePeliculas] Fetch error ${url}: ${e.message}`);
        return "";
    }
}

// ---------------------------------------------------------------------------
// Search: HTML scrape of /search?s=<query>
// ---------------------------------------------------------------------------

async function searchSite(query, type) {
    const url = `${HOST}/search?s=${encodeURIComponent(query)}`;
    console.log(`[EntrePeliculas] Searching: ${url}`);
    const html = await fetchPage(url);
    if (!html) return [];

    const clean = html.replace(/\n|\r|\t|\s{2}/g, "");
    const articles = [...clean.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)];

    const results = [];
    for (const art of articles) {
        const content = art[0];

        // URL → determines type (movie vs tvshow)
        const hrefMatch = content.match(/href="([^"]+\/(?:pelicula|serie)\/[^"]+)"/);
        if (!hrefMatch) continue;
        let itemUrl = hrefMatch[1];
        if (itemUrl.startsWith("/")) itemUrl = HOST + itemUrl;

        const isMovie = itemUrl.includes("/pelicula/");
        const isTv    = itemUrl.includes("/serie/");
        if (!isMovie && !isTv) continue;

        // Filter by requested type
        if (type === "movie" && !isMovie) continue;
        if (type === "tv"    && !isTv) continue;

        // Title
        const titleMatch = content.match(/alt="([^"]+)"/) || content.match(/<h2 class="title">(.*?)<\/h2>/);
        let title = titleMatch ? titleMatch[1] : "";
        title = decodeHtmlEntities(title)
            .replace(/Ver\s+/, "")
            .replace(/online en HD/i, "")
            .replace(/- Película completa/i, "")
            .replace(/- Serie completa/i, "")
            .replace(/\(\d{4}\)/g, "")
            .trim();

        // Year
        const yearMatch = content.match(/<span class="tag">(\d{4})<\/span>/);
        const year = yearMatch ? yearMatch[1] : "";

        // Slug (last path segment)
        const slug = itemUrl.split("/").filter(Boolean).pop();

        results.push({ title, url: itemUrl, slug, year, type: isMovie ? "movie" : "tv" });
    }

    return results;
}

// ---------------------------------------------------------------------------
// Season / Episode navigation (HTML scrape)
// ---------------------------------------------------------------------------

async function getEpisodeUrl(serieSlug, season, episode) {
    const serieUrl = `${HOST}/serie/${serieSlug}`;
    console.log(`[EntrePeliculas] Fetching serie page: ${serieUrl}`);
    const html = await fetchPage(serieUrl);
    if (!html) return null;

    const clean = html.replace(/\n|\r|\t|\s{2}/g, "");

    // Season tabs: id="season-tab-N" where N is 0-indexed
    // Find the tab whose label is "Temporada <season>"
    const seasonTabPattern = /id="season-tab-(\d+)"[^>]*>\s*Temporada\s*(\d+)\s*<\/button>/g;
    let seasonIdx = null;
    for (const m of clean.matchAll(seasonTabPattern)) {
        if (parseInt(m[2]) === parseInt(season)) {
            seasonIdx = m[1]; // 0-indexed tab id
            break;
        }
    }

    if (seasonIdx === null) {
        console.log(`[EntrePeliculas] Season ${season} tab not found`);
        return null;
    }

    // Episode cards within that season block: id="season-<seasonIdx>"
    const seasonBlockRx = new RegExp('id="season-' + seasonIdx + '"([\\s\\S]*?)</div></div>');
    const seasonBlock = clean.match(seasonBlockRx);
    if (!seasonBlock) {
        console.log(`[EntrePeliculas] Season block ${seasonIdx} not found in HTML`);
        return null;
    }

    // Each episode card: <div class="episode-card"><a href="..."><div>Episodio N</div></a>
    const epCards = [...seasonBlock[0].matchAll(/<div class="episode-card">[\s\S]*?href="([^"]+)"[\s\S]*?<div>([\s\S]*?)<\/div>[\s\S]*?<\/a>/g)];

    for (const ep of epCards) {
        const epHref = ep[1];
        const epLabel = ep[2].replace(/Episodio\s*/i, "").trim();
        if (parseInt(epLabel) === parseInt(episode)) {
            let epUrl = epHref.startsWith("http") ? epHref : HOST + epHref;
            console.log(`[EntrePeliculas] Matched S${season}E${episode}: ${epUrl}`);
            return epUrl;
        }
    }

    console.log(`[EntrePeliculas] Episode ${episode} not found in season ${season}`);
    return null;
}

// ---------------------------------------------------------------------------
// /vidurl/ page: extract PoW params + encrypted dataLink
// ---------------------------------------------------------------------------

async function getVidurlPage(vidurlPath) {
    const url = HOST + vidurlPath;
    console.log(`[EntrePeliculas] Fetching vidurl: ${url}`);
    const html = await fetchPage(url);
    if (!html) return null;

    // Extract the large inline script
    const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const bigScript = scripts.find(m => m[1].length > 5000);
    if (!bigScript) { console.log("[EntrePeliculas] No big inline script found"); return null; }

    const s = bigScript[1];

    // PoW params
    const challengeM = s.match(/const POW_CHALLENGE\s*=\s*'([^']+)'/);
    const difficultyM = s.match(/const POW_DIFFICULTY\s*=\s*(\d+)/);
    const saltM       = s.match(/const POW_SALT\s*=\s*'([^']+)'/);

    if (!challengeM || !difficultyM || !saltM) {
        console.log("[EntrePeliculas] PoW params not found in script");
        return null;
    }

    const challenge  = challengeM[1];
    const difficulty = parseInt(difficultyM[1]);
    const salt       = saltM[1];

    // dataLink JSON array — the encrypted embed list
    const dataLinkM = s.match(/(?:const|let)\s+dataLink\s*=\s*(\[[\s\S]*?\]);/);
    if (!dataLinkM) { console.log("[EntrePeliculas] dataLink not found"); return null; }

    let dataLink;
    try {
        dataLink = JSON.parse(dataLinkM[1]);
    } catch (e) {
        console.log("[EntrePeliculas] dataLink JSON parse error:", e.message);
        return null;
    }

    return { challenge, difficulty, salt, dataLink };
}

// ---------------------------------------------------------------------------
// Proof-of-Work solver (SHA-256 hashcash)
// challenge + nonce → SHA256 must start with "0".repeat(difficulty)
// AES key = SHA256(challenge + nonce + salt)  [raw 32 bytes]
// ---------------------------------------------------------------------------

async function solvePoW(challenge, difficulty, salt) {
    const prefix = "0".repeat(difficulty);
    let nonce = 0;
    console.log(`[EntrePeliculas] Solving PoW (difficulty=${difficulty})...`);

    while (true) {
        const hash = nodeCrypto.createHash("sha256")
            .update(challenge + nonce)
            .digest("hex");

        if (hash.startsWith(prefix)) {
            console.log(`[EntrePeliculas] PoW solved at nonce=${nonce}, hash=${hash.substring(0, 16)}...`);
            // Derive AES key from challenge + nonce + salt
            const aesKey = nodeCrypto.createHash("sha256")
                .update(challenge + nonce + salt)
                .digest(); // Buffer (32 bytes)
            return aesKey;
        }
        nonce++;
        // Safety: give up after 10M iterations (difficulty 3 usually solves in ~4096)
        if (nonce > 10_000_000) {
            console.log("[EntrePeliculas] PoW solving timed out");
            return null;
        }
    }
}

// ---------------------------------------------------------------------------
// AES-CBC decrypt: IV = first 16 bytes, ciphertext = remaining bytes
// ---------------------------------------------------------------------------

function aesDecrypt(encryptedBase64, aesKeyBuffer) {
    try {
        const raw = Buffer.from(encryptedBase64, "base64");
        const iv = raw.slice(0, 16);
        const ciphertext = raw.slice(16);
        const decipher = nodeCrypto.createDecipheriv("aes-256-cbc", aesKeyBuffer, iv);
        const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return dec.toString("utf8");
    } catch (e) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Embed resolvers (shared stack — StreamWish, VidHide, Vimeos, GoodStream, VOE)
// ---------------------------------------------------------------------------

const MIRRORS = {
    STREAMWISH: ["hlswish", "streamwish", "hglink", "hglamioz", "audinifer",
                 "embedwish", "awish", "dwish", "strwish", "wishembed", "wishfast", "hanerix",
                 "sfastwish", "jodwish", "swhoi", "swdyu", "playerwish"],
    VIDHIDE:    ["vidhide", "minochinos", "vadisov", "vaiditv", "amusemre",
                 "callistanise", "vhaudm", "mdfury", "dintezuvio", "acek-cdn",
                 "vedonm", "vidhidepro", "vidhidevip", "masukestin", "filelions"],
    FILEMOON:   ["filemoon", "moonalu", "moonembed", "bysedikamoum", "r66nv9ed",
                 "398fitus", "bysejikuar", "fmoon"],
    VOE:        ["voe.sx", "voe-sx", "voex.sx", "marissashare", "cloudwindow",
                 "marissasharecareer"],
    DOODSTREAM: ["doodstream", "dood.", "d000d", "d0000d", "doodapi", "d0o0d",
                 "do0od", "dooodster", "do7go", "ds2play", "ds2video"],
    STREAMTAPE: ["streamtape"],
};

function isMirror(url, group) {
    const u = (url || "").toLowerCase();
    return (MIRRORS[group] || []).some(m => u.includes(m));
}

function unpackEval(payload, radix, symtab) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unbase = (str) => {
        let result = 0;
        for (let i = 0; i < str.length; i++) {
            const pos = chars.indexOf(str[i]);
            if (pos === -1) return NaN;
            result = result * radix + pos;
        }
        return result;
    };
    return payload.replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
        const idx = unbase(match);
        if (isNaN(idx) || idx >= symtab.length) return match;
        return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
    });
}

function evalUnpack(script) {
    try {
        const m = script.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
        if (!m) return null;
        return unpackEval(m[1], parseInt(m[2]), m[4].split("|"));
    } catch { return null; }
}

function localAtob(input) {
    if (!input) return "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let str = String(input).replace(/=+$/, "").replace(/[\s\n\r\t]/g, "");
    let output = "";
    if (str.length % 4 === 1) return "";
    for (let bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> (-2 * bc & 6)))) : 0) {
        buffer = chars.indexOf(buffer);
    }
    return output;
}

async function resolveStreamwish(embedUrl) {
    try {
        const rawId = embedUrl.split("/").pop().replace(/\.html$/, "");
        const mirrors = [
            `https://hanerix.com/e/${rawId}`,
            `https://embedwish.com/e/${rawId}`,
            `https://hglink.to/e/${rawId}`,
            `https://streamwish.to/e/${rawId}`,
            `https://awish.pro/e/${rawId}`,
            `https://strwish.com/e/${rawId}`,
            `https://wishfast.top/e/${rawId}`,
            `https://sfastwish.com/e/${rawId}`,
            embedUrl,
        ];
        const result = await new Promise((resolve) => {
            let resolved = false;
            let pending = mirrors.length;
            mirrors.forEach(async (mirror) => {
                try {
                    const mirrorOrigin = new URL(mirror).origin;
                    const resp = await fetch(mirror, { headers: { "Referer": mirror, "User-Agent": USER_AGENT } });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const html = await resp.text();
                    if (html.includes("__vite_is_modern_browser") || html.length < 500) throw new Error("SPA page");
                    let m3u8Url = null;
                    const hashMatch = html.match(/[0-9a-f]{32}/i);
                    if (hashMatch) {
                        const dlUrl = `${mirrorOrigin}/dl?op=view&file_code=${rawId}&hash=${hashMatch[0]}&embed=1&referer=&adb=1&hls4=1`;
                        const dlResp = await fetch(dlUrl, { headers: { "User-Agent": USER_AGENT, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" } });
                        if (dlResp.ok) {
                            const dlText = await dlResp.text();
                            const m = dlText.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
                            if (m) m3u8Url = m[0];
                        }
                    }
                    if (!m3u8Url) {
                        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
                        if (fileMatch) m3u8Url = fileMatch[1];
                    }
                    if (!m3u8Url) {
                        const bare = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/i);
                        if (bare) m3u8Url = bare[0];
                    }
                    if (m3u8Url && !resolved) {
                        resolved = true;
                        m3u8Url = m3u8Url.replace(/\\/g, "");
                        if (m3u8Url.startsWith("/")) m3u8Url = mirrorOrigin + m3u8Url;
                        resolve({ url: m3u8Url, mirror });
                    }
                } catch (e) {
                } finally {
                    pending--;
                    if (pending === 0 && !resolved) resolve(null);
                }
            });
            setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 5000);
        });
        if (!result) return null;
        return {
            url: result.url,
            server: "StreamWish",
            quality: "1080p",
            headers: { "Referer": result.mirror, "Origin": new URL(result.mirror).origin, "User-Agent": USER_AGENT }
        };
    } catch (e) { return null; }
}

async function resolveVidhide(embedUrl) {
    try {
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Referer": `${origin}/` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        let finalUrl = null;
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (packedMatch) {
            const unpacked = evalUnpack(packedMatch[0]);
            if (unpacked) {
                const hlsMatch = unpacked.match(/"hls[24]"\s*:\s*"([^"]+)"/);
                if (hlsMatch) finalUrl = hlsMatch[1];
                if (!finalUrl) {
                    const m3 = unpacked.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/i);
                    if (m3) finalUrl = m3[0];
                }
            }
        }
        if (!finalUrl) {
            const rawMatch = html.match(/"hls[24]"\s*:\s*"([^"]+)"/) || html.match(/file\s*:\s*["']([^"']+)["']/i);
            if (rawMatch) finalUrl = rawMatch[1];
        }
        if (!finalUrl) return null;
        if (!finalUrl.startsWith("http")) finalUrl = origin + finalUrl;
        return { url: finalUrl, server: "VidHide", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": `${origin}/`, "Origin": origin } };
    } catch (e) { return null; }
}

async function resolveVoe(embedUrl) {
    try {
        let res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let html = await res.text();
        if (html.includes("window.location.href") && html.length < 2000) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm) { const next = await fetch(rm[1], { headers: { "User-Agent": USER_AGENT } }); if (next.ok) html = await next.text(); }
        }
        const jsonMatch = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                let encText = Array.isArray(parsed) ? parsed[0] : parsed;
                if (typeof encText === "string") {
                    let decoded = encText.replace(/[a-zA-Z]/g, (c) => {
                        const code = c.charCodeAt(0);
                        const limit = c <= "Z" ? 90 : 122;
                        const shifted = code + 13;
                        return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
                    });
                    for (const n of ["@$", "^^", "~@", "%?", "*~", "!!", "#&"]) decoded = decoded.split(n).join("");
                    const b64_1 = localAtob(decoded);
                    if (b64_1) {
                        let shifted = "";
                        for (let j = 0; j < b64_1.length; j++) shifted += String.fromCharCode(b64_1.charCodeAt(j) - 3);
                        const reversed = shifted.split("").reverse().join("");
                        const decrypted = localAtob(reversed);
                        if (decrypted) {
                            const data = JSON.parse(decrypted);
                            if (data?.source) return { url: data.source, server: "VOE", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": embedUrl } };
                        }
                    }
                }
            } catch (ex) {}
        }
        const m3 = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)['"]/i);
        if (m3) return { url: m3[1], server: "VOE", quality: "1080p", headers: { "Referer": embedUrl, "User-Agent": USER_AGENT } };
    } catch (e) {}
    return null;
}

async function resolveVimeos(embedUrl) {
    try {
        console.log("[Vimeos] Resolviendo: " + embedUrl);
        const html = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://vimeos.net/", "Accept": "text/html,application/xhtml+xml" }
        }).then(r => r.text());
        let vimeoIdMatch = html.match(/vimeo\.com\/video\/(\d+)/i);
        if (!vimeoIdMatch) vimeoIdMatch = embedUrl.match(/\/(\d{7,10})/);
        if (vimeoIdMatch) {
            const configRes = await fetch("https://player.vimeo.com/video/" + vimeoIdMatch[1] + "/config", {
                headers: { "User-Agent": USER_AGENT, "Referer": embedUrl }
            });
            if (configRes.ok) {
                const config = await configRes.json();
                const hlsUrl = config?.request?.files?.hls?.cdns?.default?.url;
                if (hlsUrl) return { url: hlsUrl, server: "Vimeos", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": "https://player.vimeo.com/" } };
            }
        }
        const packMatch = html.match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
        if (packMatch) {
            console.log("[Vimeos] Usando Unpacker...");
            const symtab = packMatch[4].split("|");
            const radix = parseInt(packMatch[2]);
            const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const unbase = (str) => { let r = 0; for (let i = 0; i < str.length; i++) r = r * radix + chars.indexOf(str[i]); return r; };
            const unpacked = packMatch[1].replace(/\b(\w+)\b/g, (m) => { const idx = unbase(m); return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : m; });
            const m3u8Match = unpacked.match(/["']([^"']+\.m3u8[^"']*)['"]/i);
            if (m3u8Match) return { url: m3u8Match[1], server: "Vimeos", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": "https://vimeos.net/" } };
        }
    } catch (err) { console.log("[Vimeos] Error:", err.message); }
    return null;
}

async function resolveGoodstream(embedUrl) {
    try {
        console.log(`[GoodStream] Resolviendo: ${embedUrl}`);
        const response = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://goodstream.one/", "Accept": "text/html,*/*" }
        });
        if (!response.ok) return null;
        const html = await response.text();
        const match = html.match(/file:\s*"([^"]+)"/);
        if (!match) return null;
        const videoUrl = match[1];
        const qm = videoUrl.match(/[_-](\d{3,4})p/i);
        return { url: videoUrl, server: "GoodStream", quality: qm ? `${qm[1]}p` : "1080p", headers: { "Referer": embedUrl, "Origin": "https://goodstream.one", "User-Agent": USER_AGENT } };
    } catch (err) { return null; }
}

// Server name → embed URL resolver routing
function serverNameToResolver(servername, url) {
    const sn = (servername || "").toLowerCase();
    if (sn.includes("vidhide") || sn.includes("filelions") || sn.includes("vidhidepro")) return resolveVidhide(url);
    if (sn.includes("streamwish") || sn.includes("wish") || sn.includes("hanerix")) return resolveStreamwish(url);
    if (sn.includes("voe")) return resolveVoe(url);
    if (sn.includes("filemoon") || sn.includes("moon")) return null; // not supported without ECDSA
    if (sn.includes("vimeos")) return resolveVimeos(url);
    if (sn.includes("goodstream")) return resolveGoodstream(url);
    return null;
}

async function resolveEmbed(url) {
    if (isMirror(url, "STREAMWISH")) return resolveStreamwish(url);
    if (isMirror(url, "VIDHIDE"))    return resolveVidhide(url);
    if (isMirror(url, "VOE"))        return resolveVoe(url);
    if (isMirror(url, "FILEMOON"))   return null; // requires ECDSA attest
    if (isMirror(url, "DOODSTREAM")) return null;
    if (isMirror(url, "STREAMTAPE")) return null;
    const u = url.toLowerCase();
    if (u.includes("vimeos.net") || u.includes("vimeos.cc") || u.includes("vimeos.zip")) return resolveVimeos(url);
    if (u.includes("goodstream.one") || u.includes("goodstream.co")) return resolveGoodstream(url);
    return null;
}

// ---------------------------------------------------------------------------
// Build vidurl path from movie/TV context
// Movies:   /vidurl/<imdb_id>/
// Episodes: /vidurl/<imdb_id>-<S>x<EE>/   (e.g. tt13443470-1x01)
// ---------------------------------------------------------------------------

function buildVidurlPath(imdbId, type, season, episode) {
    if (!imdbId) return null;
    if (type === "movie") return `/vidurl/${imdbId}/`;
    // Episode format: imdbId-SxEE  (season no leading zero, episode with leading zero if <10)
    const epNum = String(episode).padStart(2, "0");
    return `/vidurl/${imdbId}-${season}x${epNum}/`;
}

// ---------------------------------------------------------------------------
// Main entrypoint
// ---------------------------------------------------------------------------

async function getStreams(id, type, season, episode) {
    console.log(`[EntrePeliculas] Resolving ID=${id}, Type=${type}, Season=${season}, Episode=${episode}`);

    const info = await getTMDBInfo(id, type);
    if (!info) { console.log("[EntrePeliculas] TMDB lookup failed"); return []; }

    // --- Step 1: Build vidurl path from IMDB ID (fast path, no HTML scraping needed) ---
    let vidurlPath = null;
    if (info.imdbId) {
        vidurlPath = buildVidurlPath(info.imdbId, type, season, episode);
        console.log(`[EntrePeliculas] IMDB ID: ${info.imdbId} → vidurl: ${vidurlPath}`);
    }

    // --- Step 2: If no IMDB id or as fallback, search the site for slug ---
    let episodeUrl = null;
    if (!vidurlPath || type === "tv") {
        // For TV we still need to discover the site's vidurl format via the episode page
        for (const title of info.titles) {
            const query = getSearchQuery(title);
            if (!query) continue;
            const results = await searchSite(query, type);
            if (!results.length) continue;

            const cleaned = cleanTitle(title);
            let match = results.find(r => {
                const rt = cleanTitle(r.title);
                return rt.includes(cleaned) || cleaned.includes(rt);
            });
            if (!match && results.length > 0) match = results[0];
            if (!match) continue;

            console.log(`[EntrePeliculas] Matched: "${match.title}" (${match.url})`);

            if (type === "movie") {
                // Fetch movie page to get its vidurl iframe
                const movieHtml = await fetchPage(match.url);
                if (!movieHtml) break;
                const ifrMatch = movieHtml.replace(/\n|\r|\t|\s{2}/g, "").match(/iframe[^>]+src="([^"]+\/vidurl\/[^"]+)"/i);
                if (ifrMatch) {
                    vidurlPath = ifrMatch[1].startsWith("http") ? new URL(ifrMatch[1]).pathname : ifrMatch[1];
                    console.log(`[EntrePeliculas] Movie vidurl from HTML: ${vidurlPath}`);
                }
                break;
            }

            if (type === "tv") {
                // Navigate to specific episode to get its vidurl iframe
                episodeUrl = await getEpisodeUrl(match.slug, season, episode);
                if (!episodeUrl) break;

                const epHtml = await fetchPage(episodeUrl);
                if (!epHtml) break;
                const ifrMatch = epHtml.replace(/\n|\r|\t|\s{2}/g, "").match(/iframe[^>]+src="([^"]+\/vidurl\/[^"]+)"/i);
                if (ifrMatch) {
                    vidurlPath = ifrMatch[1].startsWith("http") ? new URL(ifrMatch[1]).pathname : ifrMatch[1];
                    console.log(`[EntrePeliculas] TV episode vidurl from HTML: ${vidurlPath}`);
                }
                break;
            }
        }
    }

    // If we have IMDB id and it's a TV show, try the standard vidurl format directly
    if (!vidurlPath && info.imdbId && type === "tv") {
        vidurlPath = buildVidurlPath(info.imdbId, type, season, episode);
    }

    if (!vidurlPath) {
        console.log("[EntrePeliculas] Could not determine vidurl path");
        return [];
    }

    // --- Step 3: Fetch vidurl page, extract PoW + encrypted dataLink ---
    const vidurlData = await getVidurlPage(vidurlPath);
    if (!vidurlData) { console.log("[EntrePeliculas] vidurl page extraction failed"); return []; }

    const { challenge, difficulty, salt, dataLink } = vidurlData;

    // --- Step 4: Solve PoW to derive AES key ---
    const aesKey = await solvePoW(challenge, difficulty, salt);
    if (!aesKey) { console.log("[EntrePeliculas] PoW solving failed"); return []; }

    // --- Step 5: Decrypt all embed links ---
    const streams = [];
    for (const langBlock of dataLink) {
        const rawLang = (langBlock.video_language || "").toUpperCase();
        let lang = "Lat";
        if (rawLang === "ESP" || rawLang === "CAST") lang = "Esp";
        else if (rawLang === "SUB" || rawLang === "VOSE") lang = "Sub";
        else if (rawLang === "LAT") lang = "Lat";

        for (const embed of (langBlock.sortedEmbeds || [])) {
            if (!embed.link || embed.type !== "video") continue;
            // Skip known unsupported servers
            const sn = (embed.servername || "").toLowerCase();
            if (sn.includes("filemoon") || sn.includes("1fichier") || sn.includes("fireload")) continue;

            // Decrypt the embed URL
            const decryptedUrl = aesDecrypt(embed.link, aesKey);
            if (!decryptedUrl || !decryptedUrl.startsWith("http")) {
                console.log(`[EntrePeliculas] Decrypt failed for ${embed.servername}: ${embed.link.substring(0, 40)}`);
                continue;
            }

            console.log(`[EntrePeliculas] Decrypted ${embed.servername} [${lang}]: ${decryptedUrl.substring(0, 80)}`);

            // Resolve the embed URL to a direct stream
            let resolved = await resolveEmbed(decryptedUrl);
            if (!resolved) resolved = await serverNameToResolver(embed.servername, decryptedUrl);

            if (resolved && resolved.url) {
                streams.push({
                    provider: "EntrePeliculasySeries",
                    title: `${resolved.quality || "HD"} · ${lang} · ${resolved.server}`,
                    url: resolved.url,
                    quality: resolved.quality || "HD",
                    isEmbed: false,
                    headers: resolved.headers || { Referer: decryptedUrl }
                });
            } else {
                streams.push({
                    provider: "EntrePeliculasySeries",
                    title: `HD · ${lang} · ${embed.servername}`,
                    url: decryptedUrl,
                    quality: "HD",
                    isEmbed: true,
                    headers: { Referer: HOST + "/" }
                });
            }
        }
    }

    return streams;
}

module.exports = { getStreams };
