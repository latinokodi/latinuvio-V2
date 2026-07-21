/**
 * EliFilms provider — ported from plugin.video.balandro (channels/elifilms.py)
 * Source site: https://allcalidad.re/
 * API base: https://allcalidad.re/api/rest/
 *
 * Supports: movies, TV shows (TMDB-based lookup via title search)
 */

const CryptoJS = require("crypto-js");

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const HOST = "https://allcalidad.re";
const API = `${HOST}/api/rest/`;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Connection": "keep-alive",
    "Referer": HOST + "/"
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
        .replace(/[-_:]/g, " ")
        .replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getSearchQuery(title) {
    if (!title) return "";
    // Strip subtitle after colon, parenthetical clauses, special chars
    let q = title.split(":")[0];
    q = q.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
    q = q.replace(/[^a-zA-Z0-9\s\-áéíóúÁÉÍÓÚñÑ]/g, "");
    q = q.replace(/\s+/g, " ").trim();
    // EliFilms search breaks with long queries — keep only the first meaningful words
    const words = q.split(" ").filter(w => w.length > 1);
    return words.slice(0, 2).join(" ");
}

// ---------------------------------------------------------------------------
// TMDB — collect multiple language titles + year
// ---------------------------------------------------------------------------

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
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
            console.log(`[EliFilms] TMDB Error (${lang}): ${e.message}`);
        }
    }
    return titles.size > 0 ? { titles: Array.from(titles), year } : null;
}

// ---------------------------------------------------------------------------
// EliFilms / AllCalidad REST API
// ---------------------------------------------------------------------------

async function searchEliFilms(query, type) {
    try {
        const postType = type === "tv" ? "tvshows" : "movies";
        const url = `${API}search?post_type=${postType}&query=${encodeURIComponent(query)}&posts_per_page=20`;
        console.log(`[EliFilms] Searching: ${url}`);
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const json = await res.json();
        // API shape: { error, message, data: { posts: [...], pagination: {...} } }
        const posts = json?.data?.posts;
        if (Array.isArray(posts)) {
            // Guard: the site returns latest posts when search finds nothing —
            // reject the batch if none of the titles contain at least one query word.
            const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const hasRelevant = posts.some(p =>
                queryWords.some(w => p.title.toLowerCase().includes(w))
            );
            if (!hasRelevant) {
                console.log(`[EliFilms] Search for "${query}" returned irrelevant results — skipping.`);
                return [];
            }
            return posts.map(p => ({
                id: p._id,
                title: p.title,
                originalTitle: p.original_title || "",
                type: p.type || postType   // field is 'movies' or 'tvshows'
            }));
        }
    } catch (e) {
        console.log(`[EliFilms] Search Error: ${e.message}`);
    }
    return [];
}

async function getEpisodes(postId) {
    try {
        const url = `${API}episodes?post_id=${postId}`;
        console.log(`[EliFilms] Fetching episodes: ${url}`);
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data?.data || [];
    } catch (e) {
        console.log(`[EliFilms] Episodes Error: ${e.message}`);
        return [];
    }
}

async function getPlayerEmbeds(postId) {
    try {
        const url = `${API}player?post_id=${postId}&_any=1`;
        console.log(`[EliFilms] Fetching player: ${url}`);
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // embeds are under data.embeds — array of { url, server, lang }
        return data?.data?.embeds || [];
    } catch (e) {
        console.log(`[EliFilms] Player Error: ${e.message}`);
        return [];
    }
}

// ---------------------------------------------------------------------------
// Embed resolver utilities
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

// Dean Edwards eval() packer decoder
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

// Pure-JS base64 decode (no Buffer, works in Node without btoa issues)
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

// ---------------------------------------------------------------------------
// Individual embed resolvers
// ---------------------------------------------------------------------------

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
                    const resp = await fetch(mirror, {
                        headers: { "Referer": mirror, "User-Agent": USER_AGENT }
                    });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const html = await resp.text();
                    if (html.includes("__vite_is_modern_browser") || html.length < 500) throw new Error("SPA page");
                    let m3u8Url = null;
                    const hashMatch = html.match(/[0-9a-f]{32}/i);
                    if (hashMatch) {
                        const dlUrl = `${mirrorOrigin}/dl?op=view&file_code=${rawId}&hash=${hashMatch[0]}&embed=1&referer=&adb=1&hls4=1`;
                        const dlResp = await fetch(dlUrl, {
                            headers: { "User-Agent": USER_AGENT, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" }
                        });
                        if (dlResp.ok) {
                            const dlText = await dlResp.text();
                            const m = dlText.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
                            if (m) m3u8Url = m[0];
                        }
                    }
                    if (!m3u8Url) {
                        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
                        if (evalStr) {
                            const unpacked = evalUnpack(evalStr[0]);
                            if (unpacked) {
                                const m = unpacked.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
                                if (m) m3u8Url = m[0];
                            }
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
    } catch (e) {
        return null;
    }
}

async function resolveVidhide(embedUrl) {
    try {
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": `${origin}/` }
        });
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
            const rawMatch = html.match(/"hls[24]"\s*:\s*"([^"]+)"/)
                         || html.match(/file\s*:\s*["']([^"']+)["']/i)
                         || html.match(/["'](https?:\/\/[^\s"']+?\/stream\/[^\s"']+?\.m3u8[^\s"']*)['"]/i);
            if (rawMatch) finalUrl = rawMatch[1];
        }
        if (!finalUrl) return null;
        if (!finalUrl.startsWith("http")) finalUrl = origin + finalUrl;
        return {
            url: finalUrl,
            server: "VidHide",
            quality: "1080p",
            headers: { "User-Agent": USER_AGENT, "Referer": `${origin}/`, "Origin": origin }
        };
    } catch (e) {
        return null;
    }
}

function aesGcmDecrypt(playback) {
    try {
        if (typeof CryptoJS !== "undefined") {
            const parseB64 = (b64) => {
                const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
                return CryptoJS.enc.Base64.parse(norm);
            };
            let keyWA = parseB64(playback.key_parts[0]);
            for (let i = 1; i < playback.key_parts.length; i++) {
                const part = parseB64(playback.key_parts[i]);
                if (part) keyWA.concat(part);
            }
            const ivWA = parseB64(playback.iv);
            const ctWA = parseB64(playback.payload);
            const tagSizeWords = 4;
            const ctWords = ctWA.words.slice(0, ctWA.words.length - tagSizeWords);
            const ctNoTag = CryptoJS.lib.WordArray.create(ctWords, ctWA.sigBytes - 16);
            let counter = ivWA.clone();
            counter.concat(CryptoJS.lib.WordArray.create([2], 4));
            const dec = CryptoJS.AES.decrypt(
                { ciphertext: ctNoTag }, keyWA,
                { iv: counter, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding }
            );
            return dec.toString(CryptoJS.enc.Utf8);
        }
    } catch (e) {}
    return null;
}

async function resolveFilemoon(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const hostname = urlObj.hostname;
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        let videoId = null;
        if (pathParts[0] === "e" || pathParts[0] === "d") {
            videoId = pathParts[1];
        } else {
            videoId = pathParts.pop();
        }
        if (!videoId) return null;
        const detailsRes = await fetch(`https://${hostname}/api/videos/${videoId}/embed/details`, {
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": embedUrl, "User-Agent": USER_AGENT }
        });
        if (!detailsRes.ok) return null;
        const details = await detailsRes.json();
        const frameUrl = details.embed_frame_url;
        if (!frameUrl) return null;
        const playbackDomain = new URL(frameUrl).origin;
        const challengeRes = await fetch(`${playbackDomain}/api/videos/access/challenge`, {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": USER_AGENT }
        });
        const challenge = await challengeRes.json();
        if (!challenge.challenge_id) return null;
        const deviceId = Math.random().toString(36).substring(2, 15);
        const viewerId = Math.random().toString(36).substring(2, 15);
        const attestPayload = {
            viewer_id: viewerId, device_id: deviceId,
            challenge_id: challenge.challenge_id, nonce: challenge.nonce,
            signature: "MEUCIQDYi5fX9gG8_5t_4v8p_Q8o8l5v8v8v8v8v8v8v8v8v",
            public_key: { kty: "EC", crv: "P-256", x: "thRcTF9d89tZ704lTYciJq48dtIaoqf9L0Is1gK29II", y: "v8Oo5z9N9406uE4RnU3dlmpbAaMQtt61uynn6kgz4_Q" },
            client: { user_agent: USER_AGENT, platform: "Windows", languages: ["es-ES"] },
            storage: { cookie: viewerId, local_storage: viewerId },
            attributes: { entropy: "high" }
        };
        const attestRes = await fetch(`${playbackDomain}/api/videos/access/attest`, {
            method: "POST", body: JSON.stringify(attestPayload),
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": USER_AGENT }
        });
        const attestData = await attestRes.json();
        if (!attestData.token) return null;
        const playRes = await fetch(`${playbackDomain}/api/videos/${videoId}/embed/playback`, {
            method: "POST",
            body: JSON.stringify({ fingerprint: { token: attestData.token, viewer_id: attestData.viewer_id || viewerId, device_id: attestData.device_id || deviceId, confidence: attestData.confidence } }),
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "X-Embed-Parent": embedUrl, "User-Agent": USER_AGENT }
        });
        const playData = await playRes.json();
        if (playData.playback) {
            const decrypted = aesGcmDecrypt(playData.playback);
            if (decrypted) {
                const data = JSON.parse(decrypted);
                const directUrl = data?.sources?.[0]?.url || data?.url;
                if (directUrl) return { url: directUrl, server: "FileMoon", quality: data?.sources?.[0]?.label || "HD", headers: { "User-Agent": USER_AGENT, "Referer": playbackDomain, "Origin": playbackDomain } };
            }
        }
        const playText = JSON.stringify(playData);
        const m3 = playText.match(/https?:\\?\/\\?\/[^"\\]+\.m3u8[^"\\]*/i);
        if (m3) return { url: m3[0].replace(/\\/g, ""), server: "FileMoon", quality: "HD", headers: { Referer: embedUrl } };
    } catch (e) {}
    return null;
}

async function resolveVoe(embedUrl) {
    try {
        let res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let html = await res.text();
        if (html.includes("window.location.href") && html.length < 2000) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm) {
                const next = await fetch(rm[1], { headers: { "User-Agent": USER_AGENT } });
                if (next.ok) html = await next.text();
            }
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
                    for (const n of ["@$", "^^", "~@", "%?", "*~", "!!", "#&"]) {
                        decoded = decoded.split(n).join("");
                    }
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

async function resolveDoodstream(embedUrl) {
    try {
        let url = embedUrl.replace(/\/(d|f)\//, "/e/");
        const res = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://lamovie.cc/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const match = html.match(/\$\.get\(['"]\/pass_md5\/([\w-]+)\/([\w-]+)['"]/i)
                   || html.match(/pass_md5\/([\w\/-]+)/i);
        if (!match) return null;
        const passPath = match[1];
        const token = match[2] || passPath.split("/").pop();
        const domain = new URL(url).origin;
        const passRes = await fetch(`${domain}${passPath}/${token}`, {
            headers: { "User-Agent": USER_AGENT, "Referer": url }
        });
        if (!passRes.ok) return null;
        const base = (await passRes.text()).trim();
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let rand = "";
        for (let i = 0; i < 10; i++) rand += chars[Math.floor(Math.random() * chars.length)];
        return {
            url: `${base}${rand}?token=${token}&expiry=${Date.now()}`,
            server: "DoodStream",
            quality: "720p",
            headers: { "User-Agent": USER_AGENT, "Referer": `${domain}/` }
        };
    } catch (e) {
        return null;
    }
}

async function resolveStreamtape(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const linkMatch = html.match(/innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*(?:["'][^"']*["']\s*\+\s*)?["']([^"']+)["']/i);
        if (linkMatch) {
            return { url: `https:${linkMatch[1]}${linkMatch[2]}`, server: "StreamTape", quality: "720p", headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" } };
        }
        const mp4 = html.match(/https?:\/\/(?:cdn|streamtape)\.streamtape\.com\/[^"'<\s]+\.mp4[^"'<\s]*/i);
        if (mp4) return { url: mp4[0], server: "StreamTape", quality: "720p", headers: { "Referer": "https://streamtape.com/" } };
    } catch (e) {}
    return null;
}

async function resolveVimeos(embedUrl) {
    try {
        console.log("[Vimeos] Resolviendo: " + embedUrl);
        const html = await fetch(embedUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://vimeos.net/",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8"
            }
        }).then(r => r.text());
        let vimeoIdMatch = html.match(/vimeo\.com\/video\/(\d+)/i);
        if (!vimeoIdMatch) vimeoIdMatch = embedUrl.match(/\/(\d{7,10})/);
        if (vimeoIdMatch) {
            const vimeoId = vimeoIdMatch[1];
            try {
                const configRes = await fetch("https://player.vimeo.com/video/" + vimeoId + "/config", {
                    headers: { "User-Agent": USER_AGENT, "Referer": embedUrl }
                });
                if (configRes.ok) {
                    const config = await configRes.json();
                    const hlsUrl = config?.request?.files?.hls?.cdns?.default?.url;
                    if (hlsUrl) return { url: hlsUrl, server: "Vimeos", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": "https://player.vimeo.com/" } };
                    const progressive = config?.request?.files?.progressive;
                    if (progressive && progressive.length > 0) {
                        const best = progressive.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0))[0];
                        return { url: best.url, server: "Vimeos", quality: best.quality ? best.quality + "p" : "1080p", headers: { "User-Agent": USER_AGENT, "Referer": "https://player.vimeo.com/" } };
                    }
                }
            } catch (e) {}
        }
        const packMatch = html.match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
        if (packMatch) {
            console.log("[Vimeos] Usando Unpacker...");
            const payload = packMatch[1];
            const radix = parseInt(packMatch[2]);
            const symtab = packMatch[4].split("|");
            const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const unbase = (str) => { let result = 0; for (let i = 0; i < str.length; i++) result = result * radix + chars.indexOf(str[i]); return result; };
            const unpacked = payload.replace(/\b(\w+)\b/g, (match) => { const idx = unbase(match); return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match; });
            const m3u8Match = unpacked.match(/["']([^"']+\.m3u8[^"']*)['"]/i);
            if (m3u8Match) return { url: m3u8Match[1], server: "Vimeos", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": "https://vimeos.net/" } };
        }
    } catch (err) {
        console.log("[Vimeos] Error: " + err.message);
    }
    return null;
}

async function resolveGoodstream(embedUrl) {
    try {
        console.log(`[GoodStream] Resolviendo: ${embedUrl}`);
        const response = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://goodstream.one/", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }
        });
        if (!response.ok) return null;
        const html = await response.text();
        const match = html.match(/file:\s*"([^"]+)"/);
        if (!match) return null;
        const videoUrl = match[1];
        let quality = "1080p";
        const qm = videoUrl.match(/[_-](\d{3,4})p/i);
        if (qm) quality = `${qm[1]}p`;
        return { url: videoUrl, server: "GoodStream", quality, headers: { "Referer": embedUrl, "Origin": "https://goodstream.one", "User-Agent": USER_AGENT } };
    } catch (err) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Embed router
// ---------------------------------------------------------------------------

async function resolveEmbed(url) {
    if (isMirror(url, "STREAMWISH")) return resolveStreamwish(url);
    if (isMirror(url, "VIDHIDE"))    return resolveVidhide(url);
    if (isMirror(url, "FILEMOON"))   return resolveFilemoon(url);
    if (isMirror(url, "VOE"))        return resolveVoe(url);
    if (isMirror(url, "DOODSTREAM")) return resolveDoodstream(url);
    if (isMirror(url, "STREAMTAPE")) return resolveStreamtape(url);
    const u = url.toLowerCase();
    if (u.includes("vimeos.net") || u.includes("vimeos.cc") || u.includes("vimeos.zip")) return resolveVimeos(url);
    if (u.includes("goodstream.one") || u.includes("goodstream.co")) return resolveGoodstream(url);
    return null;
}

// ---------------------------------------------------------------------------
// getStreams — public entrypoint
// ---------------------------------------------------------------------------

async function getStreams(id, type, season, episode) {
    console.log(`[EliFilms] Resolving stream for ID ${id}, Type ${type}, Season: ${season}, Episode: ${episode}`);

    const info = await getTMDBInfo(id, type);
    if (!info) {
        console.log("[EliFilms] Failed to retrieve TMDB info.");
        return [];
    }

    // Search EliFilms API for a matching post
    let matchedPost = null;
    for (const title of info.titles) {
        const query = getSearchQuery(title);
        if (!query) continue;
        const cleaned = cleanTitle(title);
        const posts = await searchEliFilms(query, type);
        if (posts && posts.length > 0) {
            // Find a post matching the title and year
            matchedPost = posts.find(p => {
                const pt = cleanTitle(p.title);
                const po = cleanTitle(p.originalTitle || "");
                const titleMatch = pt.includes(cleaned) || cleaned.includes(pt) ||
                                   (po && (po.includes(cleaned) || cleaned.includes(po)));
                
                let yearMatch = true;
                if (info.year) {
                    const postYearMatch = p.title.match(/\((\d{4})\)/);
                    if (postYearMatch) {
                        const postYear = parseInt(postYearMatch[1], 10);
                        const tmdbYear = parseInt(info.year, 10);
                        yearMatch = Math.abs(postYear - tmdbYear) <= 1;
                    }
                }
                return titleMatch && yearMatch;
            });
            if (matchedPost) break;
            
            // Fallback to first result only if we have a loose title match
            const fallbackPost = posts[0];
            const pt = cleanTitle(fallbackPost.title);
            const po = cleanTitle(fallbackPost.originalTitle || "");
            const fallbackTitleMatch = pt.includes(cleaned) || cleaned.includes(pt) ||
                                       (po && (po.includes(cleaned) || cleaned.includes(po)));
            if (fallbackTitleMatch) {
                matchedPost = fallbackPost;
                break;
            }
        }
    }

    if (!matchedPost) {
        console.log("[EliFilms] No matching post found.");
        return [];
    }

    console.log(`[EliFilms] Matched: "${matchedPost.title}" (ID: ${matchedPost.id})`);

    let targetPostId = matchedPost.id;

    // For TV shows: resolve specific episode post ID
    if (type === "tv") {
        const episodes = await getEpisodes(matchedPost.id);
        if (!episodes || episodes.length === 0) {
            console.log("[EliFilms] No episodes returned.");
            return [];
        }
        const epMatch = episodes.find(ep =>
            parseInt(ep.season_number) === parseInt(season) &&
            parseInt(ep.episode_number) === parseInt(episode)
        );
        if (!epMatch) {
            console.log(`[EliFilms] Episode S${season}E${episode} not found.`);
            return [];
        }
        targetPostId = epMatch._id || epMatch.id;
        console.log(`[EliFilms] Matched Episode: S${season}E${episode} (Post ID: ${targetPostId})`);
    }

    // Fetch player embeds
    const embeds = await getPlayerEmbeds(targetPostId);
    if (!embeds || embeds.length === 0) {
        console.log("[EliFilms] No embeds found in player response.");
        return [];
    }

    const streams = [];
    for (const embed of embeds) {
        let url = (embed.url || "").replace(/\\\//g, "/");

        // Skip unsupported or torrent links (matches balandro's filter list)
        if (!url || !url.startsWith("http")) continue;
        const uLow = url.toLowerCase();
        if (uLow.includes("sbcom") || uLow.includes("lvturbo") || uLow.includes("vanfem") ||
            uLow.includes("fembed") || uLow.includes("1fichier") || uLow.includes("fireload")) continue;
        if (url.startsWith("magnet:") || uLow.includes(".torrent")) continue;

        const resolved = await resolveEmbed(url);
        if (resolved && resolved.url) {
            // Determine language label from embed metadata
            const embedLang = (embed.lang || embed.language || "").toLowerCase();
            let lang = "Lat";
            if (embedLang.includes("castellano") || embedLang.includes("español")) lang = "Esp";
            else if (embedLang.includes("subtitulado") || embedLang.includes("vose")) lang = "Sub";
            else if (embedLang.includes("ingles") || embedLang.includes("inglés") || embedLang.includes("vos")) lang = "Ing";

            streams.push({
                name: "EliFilms",
                title: `${resolved.quality || "1080p"} · ${lang} · ${resolved.server}`,
                url: resolved.url,
                quality: resolved.quality || "1080p",
                headers: resolved.headers || { Referer: url }
            });
        }
    }

    return streams;
}

module.exports = { getStreams };
