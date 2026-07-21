/**
 * MegaDedeOficial provider — ported from plugin.video.balandro (channels/megadedeoficial.py)
 * Source site: https://megadede.mobi/
 *
 * Architecture:
 *  1. TMDB lookup → ES/EN title variants + IMDB ID
 *  2. Search via /search?s=<query>  (HTML scrape of <article> cards)
 *  3. Movie  → /pelicula/<slug>  →  <iframe src="/vidurl/<imdb_id>/">
 *     TV     → /serie/<slug>     →  season list (data-season="N", 1-indexed)
 *                                →  /serie/<slug>/temporada/<S>/capitulo/<E>
 *                                →  <iframe src="/vidurl/<imdb_id>-<S>x<EE>/">
 *  4. /vidurl/ page: extract PoW params (challenge/difficulty/salt) + encrypted dataLink
 *  5. Solve SHA-256 hashcash PoW → derive AES-256-CBC key
 *  6. Decrypt sortedEmbeds[].link → real embed URLs
 *  7. Resolve via StreamWish / VidHide / VOE / Vimeos / GoodStream stack
 *
 * Key differences vs EntrePeliculasySeries:
 *  - Article href is inside a <a class="lnk-blk"> at the END of the article
 *  - Season tabs use data-season="N" with N = actual season number (1-indexed)
 *  - Episode label is "Ep N" (not "Episodio N")
 *  - vidurl path is exposed via onclick="changeServer('/vidurl/.../')" on the page
 */

const nodeCrypto = require("crypto");

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const HOST        = "https://megadede.mobi";
const USER_AGENT  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,*/*",
    "Accept-Language": "es-MX,es;q=0.9",
    "Referer": HOST + "/"
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function cleanTitle(title) {
    if (!title) return "";
    return title
        .toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/:\s*.*$/, "")
        .replace(/[-_]/g, " ")
        .replace(/[^a-z0-9\sáéíóúñ]/g, "")
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

function decodeHtmlEntities(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&nbsp;/g, " ");
}

async function fetchPage(url, extraHeaders = {}) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, ...extraHeaders } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (e) {
        console.log(`[Megadede] Fetch error ${url}: ${e.message}`);
        return "";
    }
}

// ---------------------------------------------------------------------------
// TMDB
// ---------------------------------------------------------------------------

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
    let imdbId = "";

    for (const lang of ["es-MX", "es-ES", "en-US"]) {
        try {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`;
            const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(r => r.json());
            const t = type === "movie" ? res.title : res.name;
            const o = type === "movie" ? res.original_title : res.original_name;
            if (t) titles.add(t);
            if (o) titles.add(o);
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        } catch (e) {}
    }

    try {
        const extRes = await fetch(
            `https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${TMDB_API_KEY}`,
            { headers: { "User-Agent": USER_AGENT } }
        ).then(r => r.json());
        imdbId = extRes.imdb_id || "";
    } catch (e) {}

    return titles.size > 0 ? { titles: Array.from(titles), year, imdbId } : null;
}

// ---------------------------------------------------------------------------
// Search — HTML scrape of /search?s=<query>
// Article structure:
//   <article class="mv v por">
//     <img alt="Ver Title (year)...">
//     <h3 class="fz5 fw6 lh1 mab0">Title</h3>
//     <span class="op6 db fz6">year</span>
//     <a href="/pelicula/slug" class="lnk-blk">...</a>   ← href is LAST element
//   </article>
// ---------------------------------------------------------------------------

async function searchSite(query, type) {
    const url = `${HOST}/search?s=${encodeURIComponent(query)}`;
    console.log(`[Megadede] Searching: ${url}`);
    const html = await fetchPage(url);
    if (!html) return [];

    const clean = html.replace(/\n|\r|\t|\s{2}/g, "");
    const articles = [...clean.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)];

    const results = [];
    for (const art of articles) {
        const content = art[0];

        // The lnk-blk href is the canonical page URL
        const hrefM = content.match(/href="([^"]+\/(?:pelicula|serie)\/[^"]+)"/);
        if (!hrefM) continue;

        let itemUrl = hrefM[1];
        if (itemUrl.startsWith("/")) itemUrl = HOST + itemUrl;

        const isMovie = itemUrl.includes("/pelicula/");
        const isTv    = itemUrl.includes("/serie/");
        if (!isMovie && !isTv) continue;
        if (type === "movie" && !isMovie) continue;
        if (type === "tv"    && !isTv)    continue;

        // Title — prefer alt text (clean), fallback to h3
        const altM = content.match(/alt="([^"]+)"/);
        const h3M  = content.match(/<h3[^>]*>([^<]+)<\/h3>/);
        let title = altM ? altM[1] : (h3M ? h3M[1] : "");
        title = decodeHtmlEntities(title)
            .replace(/Ver\s+/, "")
            .replace(/online en HD/i, "")
            .replace(/- Película completa/i, "")
            .replace(/- Serie completa/i, "")
            .replace(/\(\d{4}\)/g, "")
            .trim();
        if (!title && h3M) title = decodeHtmlEntities(h3M[1]).trim();

        const yearM = content.match(/<span class="op6 db fz6">(\d{4})<\/span>/);
        const year  = yearM ? yearM[1] : "";
        const slug  = itemUrl.split("/").filter(Boolean).pop();

        results.push({ title, url: itemUrl, slug, year, type: isMovie ? "movie" : "tv" });
    }

    return results;
}

// ---------------------------------------------------------------------------
// TV: find episode URL from serie page
// Season container: <div class="season-container" data-season="1">
// Episode links:    <a href="/serie/merlina/temporada/1/capitulo/1" class="episode-card">
//                      <div class="fz5 fw6 mab0">Ep 1</div>
//                   </a>
// ---------------------------------------------------------------------------

async function getEpisodeUrl(serieSlug, season, episode) {
    const serieUrl = `${HOST}/serie/${serieSlug}`;
    console.log(`[Megadede] Fetching serie page: ${serieUrl}`);
    const html = await fetchPage(serieUrl);
    if (!html) return null;

    const clean = html.replace(/\n|\r|\t|\s{2}/g, "");

    // Season block: data-season="N" where N = actual season number (1-indexed)
    const seasonBlockRx = new RegExp(
        'season-container[^>]*data-season="' + season + '"([\\s\\S]*?)</div></div>'
    );
    const seasonBlock = clean.match(seasonBlockRx);
    if (!seasonBlock) {
        console.log(`[Megadede] Season ${season} block not found`);
        return null;
    }

    // Episode links within block
    const epLinks = [...seasonBlock[0].matchAll(/<a href="([^"]+)"[^>]*class="episode-card[^"]*">([\s\S]*?)<\/a>/g)];

    for (const ep of epLinks) {
        const epHref  = ep[1];
        const epInner = ep[2];
        // Episode number is in <div class="fz5 fw6 mab0">Ep N</div>
        const epNumM = epInner.match(/class="fz5 fw6 mab0">Ep\s*(\d+)<\/div>/);
        if (!epNumM) continue;
        if (parseInt(epNumM[1]) === parseInt(episode)) {
            const epUrl = epHref.startsWith("http") ? epHref : HOST + epHref;
            console.log(`[Megadede] Matched S${season}E${episode}: ${epUrl}`);
            return epUrl;
        }
    }

    // Fallback: construct URL directly (pattern is deterministic)
    const directUrl = `${HOST}/serie/${serieSlug}/temporada/${season}/capitulo/${episode}`;
    console.log(`[Megadede] Using direct URL: ${directUrl}`);
    return directUrl;
}

// ---------------------------------------------------------------------------
// Vidurl page — extract PoW params + encrypted dataLink
// ---------------------------------------------------------------------------

async function getVidurlPage(vidurlPath) {
    const url = HOST + vidurlPath;
    console.log(`[Megadede] Fetching vidurl: ${url}`);
    const html = await fetchPage(url, { "Referer": HOST + "/" });
    if (!html) return null;

    const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
    const bigScript = scripts.find(m => m[1].length > 5000);
    if (!bigScript) { console.log("[Megadede] No PoW script found"); return null; }

    const s = bigScript[1];

    const challengeM = s.match(/const POW_CHALLENGE\s*=\s*'([^']+)'/);
    const difficultyM = s.match(/const POW_DIFFICULTY\s*=\s*(\d+)/);
    const saltM       = s.match(/const POW_SALT\s*=\s*'([^']+)'/);

    if (!challengeM || !difficultyM || !saltM) {
        console.log("[Megadede] PoW params not found");
        return null;
    }

    const dataLinkM = s.match(/(?:const|let)\s+dataLink\s*=\s*(\[[\s\S]*?\]);/);
    if (!dataLinkM) { console.log("[Megadede] dataLink not found"); return null; }

    let dataLink;
    try { dataLink = JSON.parse(dataLinkM[1]); }
    catch (e) { console.log("[Megadede] dataLink parse error:", e.message); return null; }

    return {
        challenge:  challengeM[1],
        difficulty: parseInt(difficultyM[1]),
        salt:       saltM[1],
        dataLink
    };
}

// ---------------------------------------------------------------------------
// Proof-of-Work solver (SHA-256 hashcash, same as EntrePeliculasySeries)
// AES key = SHA256(challenge + nonce + salt) [32 raw bytes]
// ---------------------------------------------------------------------------

async function solvePoW(challenge, difficulty, salt) {
    const prefix = "0".repeat(difficulty);
    let nonce = 0;
    console.log(`[Megadede] Solving PoW (difficulty=${difficulty})...`);

    while (nonce < 10_000_000) {
        const hash = nodeCrypto.createHash("sha256").update(challenge + nonce).digest("hex");
        if (hash.startsWith(prefix)) {
            console.log(`[Megadede] PoW solved at nonce=${nonce}, hash=${hash.substring(0, 16)}...`);
            return nodeCrypto.createHash("sha256").update(challenge + nonce + salt).digest();
        }
        nonce++;
    }
    console.log("[Megadede] PoW solving timed out");
    return null;
}

// ---------------------------------------------------------------------------
// AES-CBC decrypt: first 16 bytes = IV, rest = ciphertext
// ---------------------------------------------------------------------------

function aesDecrypt(encryptedBase64, aesKeyBuffer) {
    try {
        const raw        = Buffer.from(encryptedBase64, "base64");
        const iv         = raw.slice(0, 16);
        const ciphertext = raw.slice(16);
        const decipher   = nodeCrypto.createDecipheriv("aes-256-cbc", aesKeyBuffer, iv);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch { return null; }
}

// ---------------------------------------------------------------------------
// Embed resolvers — shared stack
// ---------------------------------------------------------------------------

const MIRRORS = {
    STREAMWISH: ["hlswish","streamwish","hglink","hglamioz","audinifer","embedwish","awish",
                 "dwish","strwish","wishembed","wishfast","hanerix","sfastwish","jodwish","swhoi"],
    VIDHIDE:    ["vidhide","minochinos","vadisov","vaiditv","amusemre","callistanise",
                 "vhaudm","mdfury","dintezuvio","acek-cdn","vedonm","vidhidepro","vidhidevip",
                 "masukestin","filelions","dramiyos"],
    VOE:        ["voe.sx","voe-sx","voex.sx","marissashare","cloudwindow","marissasharecareer"],
    DOODSTREAM: ["doodstream","dood.","d000d","d0000d"],
    STREAMTAPE: ["streamtape"],
};

function isMirror(url, group) {
    const u = (url || "").toLowerCase();
    return (MIRRORS[group] || []).some(m => u.includes(m));
}

function unpackEval(payload, radix, symtab) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unbase = str => { let r = 0; for (const c of str) r = r * radix + chars.indexOf(c); return r; };
    return payload.replace(/\b([0-9a-zA-Z]+)\b/g, m => {
        const idx = unbase(m);
        return (!isNaN(idx) && symtab[idx] && symtab[idx] !== "") ? symtab[idx] : m;
    });
}

function localAtob(input) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    const str = String(input).replace(/=+$/, "").replace(/[\s]/g, "");
    let out = "";
    for (let bc = 0, bs, buf, i = 0; (buf = str.charAt(i++)); ~buf && (bs = bc % 4 ? bs * 64 + buf : buf, bc++ % 4) ? (out += String.fromCharCode(255 & (bs >> (-2 * bc & 6)))) : 0)
        buf = chars.indexOf(buf);
    return out;
}

async function resolveStreamwish(embedUrl) {
    try {
        const rawId = embedUrl.split("/").pop().replace(/\.html$/, "");
        const mirrors = [
            `https://hanerix.com/e/${rawId}`, `https://embedwish.com/e/${rawId}`,
            `https://hglink.to/e/${rawId}`, `https://streamwish.to/e/${rawId}`,
            `https://awish.pro/e/${rawId}`, `https://strwish.com/e/${rawId}`,
            `https://wishfast.top/e/${rawId}`, `https://sfastwish.com/e/${rawId}`,
            embedUrl,
        ];
        const result = await new Promise(resolve => {
            let resolved = false, pending = mirrors.length;
            mirrors.forEach(async mirror => {
                try {
                    const origin = new URL(mirror).origin;
                    const resp = await fetch(mirror, { headers: { Referer: mirror, "User-Agent": USER_AGENT } });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const html = await resp.text();
                    if (html.includes("__vite_is_modern_browser") || html.length < 500) throw new Error("SPA page");
                    let m3u8 = null;
                    const hm = html.match(/[0-9a-f]{32}/i);
                    if (hm) {
                        const dlResp = await fetch(`${origin}/dl?op=view&file_code=${rawId}&hash=${hm[0]}&embed=1&referer=&adb=1&hls4=1`,
                            { headers: { "User-Agent": USER_AGENT, Referer: mirror, "X-Requested-With": "XMLHttpRequest" } });
                        if (dlResp.ok) { const t = await dlResp.text(); const mm = t.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/); if (mm) m3u8 = mm[0]; }
                    }
                    if (!m3u8) { const fm = html.match(/file\s*:\s*["']([^"']+)["']/i); if (fm) m3u8 = fm[1]; }
                    if (!m3u8) { const bm = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/i); if (bm) m3u8 = bm[0]; }
                    if (m3u8 && !resolved) { resolved = true; m3u8 = m3u8.replace(/\\/g, ""); if (m3u8.startsWith("/")) m3u8 = origin + m3u8; resolve({ url: m3u8, mirror }); }
                } catch {} finally { pending--; if (pending === 0 && !resolved) resolve(null); }
            });
            setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 5000);
        });
        if (!result) return null;
        return { url: result.url, server: "StreamWish", quality: "1080p", headers: { Referer: result.mirror, Origin: new URL(result.mirror).origin, "User-Agent": USER_AGENT } };
    } catch { return null; }
}

async function resolveVidhide(embedUrl) {
    try {
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, Referer: `${origin}/` } });
        if (!res.ok) return null;
        const html = await res.text();
        let finalUrl = null;
        const pm = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (pm) {
            const up = unpackEval(pm[0], ...(() => { const m = pm[0].match(/\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split/); return m ? [m[1], parseInt(m[2]), m[4].split("|")] : [pm[0], 10, []]; })());
            const hm = up.match(/"hls[24]"\s*:\s*"([^"]+)"/);
            if (hm) finalUrl = hm[1];
            if (!finalUrl) { const mm = up.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/i); if (mm) finalUrl = mm[0]; }
        }
        if (!finalUrl) { const rm = html.match(/"hls[24]"\s*:\s*"([^"]+)"/) || html.match(/file\s*:\s*["']([^"']+)["']/i); if (rm) finalUrl = rm[1]; }
        if (!finalUrl) return null;
        if (!finalUrl.startsWith("http")) finalUrl = origin + finalUrl;
        return { url: finalUrl, server: "VidHide", quality: "1080p", headers: { "User-Agent": USER_AGENT, Referer: `${origin}/`, Origin: origin } };
    } catch { return null; }
}

async function resolveVoe(embedUrl) {
    try {
        let res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return null;
        let html = await res.text();
        if (html.includes("window.location.href") && html.length < 2000) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm) { const nr = await fetch(rm[1], { headers: { "User-Agent": USER_AGENT } }); if (nr.ok) html = await nr.text(); }
        }
        const jm = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
        if (jm) {
            try {
                let enc = Array.isArray(JSON.parse(jm[1].trim())) ? JSON.parse(jm[1].trim())[0] : JSON.parse(jm[1].trim());
                if (typeof enc === "string") {
                    let d = enc.replace(/[a-zA-Z]/g, c => { const code = c.charCodeAt(0); const lim = c <= "Z" ? 90 : 122; const s = code + 13; return String.fromCharCode(lim >= s ? s : s - 26); });
                    for (const n of ["@$","^^","~@","%?","*~","!!","#&"]) d = d.split(n).join("");
                    const b1 = localAtob(d);
                    if (b1) { let sh = ""; for (let j = 0; j < b1.length; j++) sh += String.fromCharCode(b1.charCodeAt(j) - 3); const rv = sh.split("").reverse().join(""); const dc = localAtob(rv); if (dc) { const data = JSON.parse(dc); if (data?.source) return { url: data.source, server: "VOE", quality: "1080p", headers: { "User-Agent": USER_AGENT, Referer: embedUrl } }; } }
                }
            } catch {}
        }
        const mm = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)['"]/i);
        if (mm) return { url: mm[1], server: "VOE", quality: "1080p", headers: { Referer: embedUrl, "User-Agent": USER_AGENT } };
    } catch {}
    return null;
}

async function resolveVimeos(embedUrl) {
    try {
        const html = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, Referer: "https://vimeos.net/", Accept: "text/html" } }).then(r => r.text());
        let vm = html.match(/vimeo\.com\/video\/(\d+)/i) || embedUrl.match(/\/(\d{7,10})/);
        if (vm) { const cr = await fetch(`https://player.vimeo.com/video/${vm[1]}/config`, { headers: { "User-Agent": USER_AGENT, Referer: embedUrl } }); if (cr.ok) { const cfg = await cr.json(); const u = cfg?.request?.files?.hls?.cdns?.default?.url; if (u) return { url: u, server: "Vimeos", quality: "1080p", headers: { "User-Agent": USER_AGENT, Referer: "https://player.vimeo.com/" } }; } }
        const pm = html.match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
        if (pm) { const sym = pm[4].split("|"); const radix = parseInt(pm[2]); const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; const unbase = s => { let r = 0; for (const c of s) r = r * radix + chars.indexOf(c); return r; }; const up = pm[1].replace(/\b(\w+)\b/g, m => { const i = unbase(m); return sym[i] && sym[i] !== "" ? sym[i] : m; }); const mm = up.match(/["']([^"']+\.m3u8[^"']*)['"]/i); if (mm) return { url: mm[1], server: "Vimeos", quality: "1080p", headers: { "User-Agent": USER_AGENT, Referer: "https://vimeos.net/" } }; }
    } catch {}
    return null;
}

async function resolveGoodstream(embedUrl) {
    try {
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, Referer: "https://goodstream.one/", Accept: "text/html" } });
        if (!res.ok) return null;
        const html = await res.text();
        const m = html.match(/file:\s*"([^"]+)"/);
        if (!m) return null;
        return { url: m[1], server: "GoodStream", quality: "1080p", headers: { Referer: embedUrl, Origin: "https://goodstream.one", "User-Agent": USER_AGENT } };
    } catch { return null; }
}

async function resolveEmbed(url, servername) {
    const u  = (url || "").toLowerCase();
    const sn = (servername || "").toLowerCase();
    if (isMirror(url, "VIDHIDE") || sn.includes("vidhide") || sn.includes("filelions") || sn.includes("minochinos")) return resolveVidhide(url);
    if (isMirror(url, "STREAMWISH") || sn.includes("streamwish") || sn.includes("wish") || sn.includes("hanerix")) return resolveStreamwish(url);
    if (isMirror(url, "VOE") || sn.includes("voe")) return resolveVoe(url);
    if (u.includes("vimeos.net") || u.includes("vimeos.cc") || u.includes("vimeos.zip")) return resolveVimeos(url);
    if (u.includes("goodstream")) return resolveGoodstream(url);
    return null;
}

// ---------------------------------------------------------------------------
// Build vidurl path
// Movies:   /vidurl/<imdb_id>/
// Episodes: /vidurl/<imdb_id>-<S>x<EE>/
// ---------------------------------------------------------------------------

function buildVidurlPath(imdbId, type, season, episode) {
    if (!imdbId) return null;
    if (type === "movie") return `/vidurl/${imdbId}/`;
    return `/vidurl/${imdbId}-${season}x${String(episode).padStart(2, "0")}/`;
}

// ---------------------------------------------------------------------------
// Main entrypoint
// ---------------------------------------------------------------------------

async function getStreams(id, type, season, episode) {
    console.log(`[Megadede] Resolving ID=${id}, Type=${type}, Season=${season}, Episode=${episode}`);

    const info = await getTMDBInfo(id, type);
    if (!info) { console.log("[Megadede] TMDB lookup failed"); return []; }

    // --- Fast path: use IMDB ID directly for vidurl ---
    let vidurlPath = info.imdbId ? buildVidurlPath(info.imdbId, type, season, episode) : null;

    // --- For TV: still need to confirm the episode exists on site ---
    if (type === "tv" && !vidurlPath) {
        for (const title of info.titles) {
            const query = getSearchQuery(title);
            if (!query) continue;
            const results = await searchSite(query, type);
            if (!results.length) continue;
            const cleaned = cleanTitle(title);
            const match = results.find(r => { const rt = cleanTitle(r.title); return rt.includes(cleaned) || cleaned.includes(rt); }) || results[0];
            if (!match) continue;
            console.log(`[Megadede] Matched serie: "${match.title}" (${match.slug})`);
            // Get vidurl from episode page
            const epUrl = await getEpisodeUrl(match.slug, season, episode);
            if (epUrl) {
                const epHtml = await fetchPage(epUrl);
                if (epHtml) {
                    const vm = epHtml.replace(/\n|\r|\t|\s{2}/g, "").match(/src="([^"]*\/vidurl\/[^"]+)"/i);
                    if (vm) { vidurlPath = vm[1].startsWith("http") ? new URL(vm[1]).pathname : vm[1]; }
                }
            }
            break;
        }
        // Fallback: standard IMDB pattern
        if (!vidurlPath && info.imdbId) vidurlPath = buildVidurlPath(info.imdbId, type, season, episode);
    }

    // For movies without IMDB id: search + scrape
    if (!vidurlPath && type === "movie") {
        for (const title of info.titles) {
            const query = getSearchQuery(title);
            if (!query) continue;
            const results = await searchSite(query, type);
            if (!results.length) continue;
            const cleaned = cleanTitle(title);
            const match = results.find(r => { const rt = cleanTitle(r.title); return rt.includes(cleaned) || cleaned.includes(rt); }) || results[0];
            if (!match) continue;
            console.log(`[Megadede] Matched movie: "${match.title}" (${match.url})`);
            const html = await fetchPage(match.url);
            if (html) {
                const vm = html.replace(/\n|\r|\t|\s{2}/g, "").match(/src="([^"]*\/vidurl\/[^"]+)"/i);
                if (vm) vidurlPath = vm[1].startsWith("http") ? new URL(vm[1]).pathname : vm[1];
            }
            break;
        }
    }

    if (!vidurlPath) { console.log("[Megadede] Could not determine vidurl path"); return []; }
    console.log(`[Megadede] Using vidurl: ${vidurlPath}`);

    // --- Fetch vidurl page + extract PoW + dataLink ---
    const vidurlData = await getVidurlPage(vidurlPath);
    if (!vidurlData) { console.log("[Megadede] vidurl extraction failed"); return []; }

    const { challenge, difficulty, salt, dataLink } = vidurlData;

    // --- Solve PoW ---
    const aesKey = await solvePoW(challenge, difficulty, salt);
    if (!aesKey) return [];

    // --- Decrypt embeds + resolve ---
    const streams = [];
    for (const langBlock of dataLink) {
        const raw = (langBlock.video_language || "").toUpperCase();
        const lang = raw === "ESP" || raw === "CAST" ? "Esp" : raw === "SUB" || raw === "VOSE" ? "Sub" : "Lat";

        for (const embed of (langBlock.sortedEmbeds || [])) {
            if (!embed.link || embed.type !== "video") continue;
            const sn = (embed.servername || "").toLowerCase();
            if (sn.includes("filemoon") || sn.includes("1fichier") || sn.includes("fireload")) continue;

            const decryptedUrl = aesDecrypt(embed.link, aesKey);
            if (!decryptedUrl || !decryptedUrl.startsWith("http")) {
                console.log(`[Megadede] Decrypt failed for ${embed.servername}`);
                continue;
            }
            console.log(`[Megadede] Decrypted ${embed.servername} [${lang}]: ${decryptedUrl.substring(0, 80)}`);

            const resolved = await resolveEmbed(decryptedUrl, embed.servername);
            if (resolved?.url) {
                streams.push({
                    provider: "MegaDedeOficial",
                    title: `${resolved.quality || "HD"} · ${lang} · ${resolved.server}`,
                    url: resolved.url,
                    quality: resolved.quality || "HD",
                    isEmbed: false,
                    headers: resolved.headers || { Referer: decryptedUrl }
                });
            } else {
                // Fallback to returning the raw embed if our internal resolver fails
                streams.push({
                    provider: "MegaDedeOficial",
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
