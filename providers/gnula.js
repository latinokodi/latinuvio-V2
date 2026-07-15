const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://ww3.gnulahd.nu";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

/**
 * TMDB lookup to get title and year
 */
async function getTMDBInfo(id, type) {
    const langs = [{ lang: "es-MX", name: "Latino" }, { lang: "es-ES", name: "España" }, { lang: "en-US", name: "Inglés" }];
    for (const { lang } of langs) {
        try {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`;
            const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
            const title = type === "movie" ? res.title : res.name;
            const originalTitle = type === "movie" ? res.original_title : res.original_name;
            if (!title) continue;
            return {
                title,
                originalTitle,
                year: (res.release_date || res.first_air_date || "").substring(0, 4)
            };
        } catch (e) {
            console.log(`[Gnula] TMDB Error: ${e.message}`);
        }
    }
    return null;
}

/**
 * Search on Gnula by title
 */
function cleanTitle(title) {
    if (!title) return "";
    return title
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/:\s*.*?$/g, "")
        .replace(/[-_]/g, " ")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function searchGnula(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const matches = [];
        // New theme (dramastream): search results use gnrd-card links
        const regex = /<a[^>]*class="gnrd-card"[^>]*href="([^"]+)"[^>]*title="([^"]+)"/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            const href = match[1];
            const title = match[2];
            const isMovie = !href.includes('/serie/') && !href.includes('/series/') && !href.includes('/anime/');
            matches.push({ url: href, title: title, isMovie: isMovie });
        }
        return matches;
    } catch (e) {
        console.log(`[Gnula] Search Error: ${e.message}`);
        return [];
    }
}

/**
 * Extract embeds from a page
 */
async function extractEmbeds(url) {
    try {
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const embeds = [];
        
        // Parse the _gd or _gnpv_ep_langs JSON array from the page HTML
        const gdMatch = html.match(/_gd\s*=\s*(\[[\s\S]*?\])\s*;/);
        const epMatch = html.match(/_gnpv_ep_langs\s*=\s*(\[[\s\S]*?\])\s*;/);
        const matchData = gdMatch || epMatch;
        if (matchData) {
            try {
                const parsed = JSON.parse(matchData[1]);
                for (const group of parsed) {
                    if (group.servers) {
                        for (const srv of group.servers) {
                            if (srv.src) {
                                embeds.push(srv.src);
                            }
                        }
                    }
                }
            } catch (e) {
                console.log("[Gnula] JSON Parse Error for players:", e.message);
            }
        }

        // Option 1: Direct iframes in players (fallback)
        const iframeRegex = /<div class="player-embed".*?<iframe.*?src="([^"]+)"/g;
        let match;
        while ((match = iframeRegex.exec(html)) !== null) {
            embeds.push(match[1]);
        }

        // Option 2: Embed links in tabs/list (fallback)
        const listRegex = /<li data-index="[^"]+".*?<a href="([^"]+)"/g;
        while ((match = listRegex.exec(html)) !== null) {
            const optionHtml = await fetch(match[1], { headers: HEADERS }).then(r => r.text());
            const optIframe = optionHtml.match(/<div class="player-embed".*?<iframe.*?src="([^"]+)"/);
            if (optIframe) embeds.push(optIframe[1]);
        }

        return [...new Set(embeds)];
    } catch (e) {
        console.log(`[Gnula] Extract Error: ${e.message}`);
        return [];
    }
}

const CryptoJS = require("crypto-js");

const MIRRORS = {
    STREAMWISH: ["hlswish", "streamwish", "hglink", "hglamioz", "audinifer",
                 "embedwish", "awish", "dwish", "strwish", "wishembed", "wishfast", "hanerix"],
    VIDHIDE:    ["vidhide", "minochinos", "vadisov", "vaiditv", "amusemre",
                 "callistanise", "vhaudm", "mdfury", "dintezuvio", "acek-cdn",
                 "vedonm", "vidhidepro", "vidhidevip", "masukestin", "filelions"],
    FILEMOON:   ["filemoon", "moonalu", "moonembed", "bysedikamoum", "r66nv9ed",
                 "398fitus", "bysejikuar", "bysevepoin", "fmoon"],
    VOE:        ["voe.sx", "voe-sx", "voex.sx", "marissashare", "cloudwindow",
                 "marissasharecareer"],
    DOODSTREAM:  ["doodstream", "dood.", "d000d", "d0000d", "doodapi", "d0o0d",
                  "do0od", "dooodster", "do7go", "ds2play", "ds2video"],
    STREAMTAPE:  ["streamtape"],
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
                    const resp = await fetch(mirror, {
                        headers: { "Referer": mirror, "User-Agent": USER_AGENT }
                    });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const html = await resp.text();
                    if (html.includes("__vite_is_modern_browser") || html.length < 500) {
                        throw new Error("SPA page");
                    }
                    let m3u8Url = null;
                    const hashMatch = html.match(/[0-9a-f]{32}/i);
                    if (hashMatch) {
                        const dlUrl = `${mirrorOrigin}/dl?op=view&file_code=${rawId}&hash=${hashMatch[0]}&embed=1&referer=&adb=1&hls4=1`;
                        const dlResp = await fetch(dlUrl, {
                            headers: { "User-Agent": USER_AGENT, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" }
                        });
                        if (dlResp.ok) {
                            const dlText = await dlResp.text();
                            const m = dlText.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
                            if (m) m3u8Url = m[0];
                        }
                    }
                    if (!m3u8Url) {
                        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
                        if (evalStr) {
                            const unpacked = evalUnpack(evalStr[0]);
                            if (unpacked) {
                                const m = unpacked.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
                                if (m) m3u8Url = m[0];
                            }
                        }
                    }
                    if (!m3u8Url) {
                        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
                        if (fileMatch) m3u8Url = fileMatch[1];
                    }
                    if (!m3u8Url) {
                        const bare = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
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
                    const m3 = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                    if (m3) finalUrl = m3[0];
                }
            }
        }
        if (!finalUrl) {
            const rawMatch = html.match(/"hls[24]"\s*:\s*"([^"]+)"/)
                         || html.match(/file\s*:\s*["']([^"']+)["']/i)
                         || html.match(/["'](https?:\/\/[^"']+?\/stream\/[^"']+?\.m3u8[^"']*?)["']/i);
            if (rawMatch) finalUrl = rawMatch[1];
        }
        if (!finalUrl) return null;
        if (!finalUrl.startsWith("http")) finalUrl = origin + finalUrl;
        return {
            url: finalUrl,
            quality: "1080p",
            headers: { "User-Agent": USER_AGENT, "Referer": `${origin}/`, "Origin": origin, "X-Requested-With": "XMLHttpRequest" }
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
    } catch (e) {
    }
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
        if (!detailsRes.ok) throw new Error(`details HTTP ${detailsRes.status}`);
        const details = await detailsRes.json();
        const frameUrl = details.embed_frame_url;
        if (!frameUrl) throw new Error("No embed_frame_url");
        const playbackDomain = new URL(frameUrl).origin;
        const challengeRes = await fetch(`${playbackDomain}/api/videos/access/challenge`, {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": USER_AGENT }
        });
        const challenge = await challengeRes.json();
        if (!challenge.challenge_id) throw new Error("No challenge_id");
        const deviceId = Math.random().toString(36).substring(2, 15);
        const viewerId = Math.random().toString(36).substring(2, 15);
        const attestPayload = {
            viewer_id: viewerId, device_id: deviceId,
            challenge_id: challenge.challenge_id, nonce: challenge.nonce,
            signature: "MEUCIQDYi5fX9gG8_5t_4v8p_Q8o8l5v8v8v8v8v8v8v8v8v",
            public_key: {
                kty: "EC", crv: "P-256",
                x: "thRcTF9d89tZ704lTYciJq48dtIaoqf9L0Is1gK29II",
                y: "v8Oo5z9N9406uE4RnU3dlmpbAaMQtt61uynn6kgz4_Q"
            },
            client: { user_agent: USER_AGENT, platform: "Windows", languages: ["es-ES"] },
            storage: { cookie: viewerId, local_storage: viewerId },
            attributes: { entropy: "high" }
        };
        const attestRes = await fetch(`${playbackDomain}/api/videos/access/attest`, {
            method: "POST",
            body: JSON.stringify(attestPayload),
            headers: {
                "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest",
                "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": USER_AGENT
            }
        });
        const attestData = await attestRes.json();
        if (!attestData.token) return null;
        const playbackPayload = {
            fingerprint: {
                token: attestData.token,
                viewer_id: attestData.viewer_id || viewerId,
                device_id: attestData.device_id || deviceId,
                confidence: attestData.confidence
            }
        };
        const playRes = await fetch(`${playbackDomain}/api/videos/${videoId}/embed/playback`, {
            method: "POST",
            body: JSON.stringify(playbackPayload),
            headers: {
                "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest",
                "Referer": frameUrl, "Origin": playbackDomain,
                "X-Embed-Parent": embedUrl, "User-Agent": USER_AGENT
            }
        });
        const playData = await playRes.json();
        if (playData.playback) {
            const decrypted = aesGcmDecrypt(playData.playback);
            if (decrypted) {
                const data = JSON.parse(decrypted);
                const directUrl = data?.sources?.[0]?.url || data?.url;
                if (directUrl) {
                    return {
                        url: directUrl,
                        quality: data?.sources?.[0]?.label || "HD",
                        headers: { "User-Agent": USER_AGENT, "Referer": playbackDomain, "Origin": playbackDomain }
                    };
                }
            }
        }
        const playText = JSON.stringify(playData);
        const m3 = playText.match(/https?:\\?\/\\?\/[^"\\]+\.m3u8[^"\\]*/i);
        if (m3) return { url: m3[0].replace(/\\/g, ""), quality: "HD", headers: { Referer: embedUrl } };
    } catch (e) {
    }
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
        const token   = match[2] || passPath.split("/").pop();
        const domain  = new URL(url).origin;
        const passRes = await fetch(`${domain}${passPath}/${token}`, {
            headers: { "User-Agent": USER_AGENT, "Referer": url }
        });
        if (!passRes.ok) throw new Error(`pass_md5 HTTP ${passRes.status}`);
        const base = (await passRes.text()).trim();
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let rand = "";
        for (let i = 0; i < 10; i++) rand += chars[Math.floor(Math.random() * chars.length)];
        return {
            url: `${base}${rand}?token=${token}&expiry=${Date.now()}`,
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
            return {
                url: `https:${linkMatch[1]}${linkMatch[2]}`,
                quality: "720p",
                headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" }
            };
        }
        const mp4 = html.match(/https?:\/\/(?:cdn|streamtape)\.streamtape\.com\/[^"'<\s]+\.mp4[^"'<\s]*/i);
        if (mp4) return { url: mp4[0], quality: "720p", headers: { "Referer": "https://streamtape.com/" } };
    } catch (e) {
    }
    return null;
}

async function resolveWaaw(embedUrl) {
    try {
        const eUrl = embedUrl.replace(/\/f\//, "/e/");
        const res = await fetch(eUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": BASE_URL + "/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const m3 = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
        if (m3) return { url: m3[0], quality: "720p", headers: { "User-Agent": USER_AGENT, "Referer": eUrl } };
        const file = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (file) return { url: file[1], quality: "720p", headers: { "User-Agent": USER_AGENT, "Referer": eUrl } };
    } catch (e) {
    }
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
                        for (let j = 0; j < b64_1.length; j++) {
                            shifted += String.fromCharCode(b64_1.charCodeAt(j) - 3);
                        }
                        const reversed = shifted.split("").reverse().join("");
                        const decrypted = localAtob(reversed);
                        if (decrypted) {
                            const data = JSON.parse(decrypted);
                            if (data?.source) {
                                return { url: data.source, quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": embedUrl } };
                            }
                        }
                    }
                }
            } catch (ex) {
            }
        }
        const m3 = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
        if (m3) return { url: m3[1], quality: "1080p", headers: { "Referer": embedUrl, "User-Agent": USER_AGENT } };
    } catch (e) {
    }
    return null;
}

/**
 * Resolve an embed URL to a stream
 */
async function resolveEmbed(url) {
    if (isMirror(url, "STREAMWISH")) {
        const res = await resolveStreamwish(url);
        if (res) return [{ name: "Gnula", title: `StreamWish`, url: res.url, quality: res.quality, headers: res.headers }];
    }
    if (isMirror(url, "VIDHIDE")) {
        const res = await resolveVidhide(url);
        if (res) return [{ name: "Gnula", title: `VidHide`, url: res.url, quality: res.quality, headers: res.headers }];
    }
    if (isMirror(url, "FILEMOON")) {
        const res = await resolveFilemoon(url);
        if (res) return [{ name: "Gnula", title: `FileMoon`, url: res.url, quality: res.quality, headers: res.headers }];
    }
    if (isMirror(url, "VOE")) {
        const res = await resolveVoe(url);
        if (res) return [{ name: "Gnula", title: `VOE`, url: res.url, quality: res.quality, headers: res.headers }];
    }
    if (isMirror(url, "DOODSTREAM")) {
        const res = await resolveDoodstream(url);
        if (res) return [{ name: "Gnula", title: `DoodStream`, url: res.url, quality: res.quality, headers: res.headers }];
    }
    if (isMirror(url, "STREAMTAPE")) {
        const res = await resolveStreamtape(url);
        if (res) return [{ name: "Gnula", title: `StreamTape`, url: res.url, quality: res.quality, headers: res.headers }];
    }
    const u = url.toLowerCase();
    if (u.includes("ok.ru") || u.includes("okru")) {
        return [{ name: "Gnula", title: `Ok.ru`, url: url, quality: "HD", headers: { "User-Agent": USER_AGENT, "Referer": "https://ww3.gnulahd.nu/" }}];
    }
    if (u.includes("waaw.to") || u.includes("netu.tv")) {
        const res = await resolveWaaw(url);
        if (res) return [{ name: "Gnula", title: `Waaw`, url: res.url, quality: res.quality, headers: res.headers }];
    }

    if (url.includes("embed.php?id=")) {
        try {
            const html = await fetch(url, { headers: { ...HEADERS, Referer: "https://ww3.gnulahd.nu/" } }).then(r => r.text());
            const videoRegex = /var videos\s*=\s*(\[\[[\s\S]*?\]\])/;
            const videoMatch = html.match(videoRegex);
            if (videoMatch) {
                const items = JSON.parse(videoMatch[1]);
                const resolvedUrls = [];
                for (const item of items) {
                    const embedUrl = item[1];
                    let decodedUrl = embedUrl;
                    if (embedUrl.includes("player.php?id=")) {
                        const urlObj = new URL(embedUrl);
                        const idParam = urlObj.searchParams.get("id");
                        if (idParam) {
                            try {
                                decodedUrl = Buffer.from(idParam, "base64").toString("utf8");
                            } catch (e) {}
                        }
                    }
                    resolvedUrls.push(decodedUrl);
                }
                
                const streams = [];
                for (const rUrl of resolvedUrls) {
                    if (rUrl.includes("embed.php?id=")) continue;
                    const res = await resolveEmbed(rUrl);
                    if (res) streams.push(...res);
                }
                return streams;
            }
        } catch (e) {
            console.log("[Gnula] Error resolving embed.php:", e.message);
        }
    }
    return null;
}

/**
 * Main export for Luvio
 */
async function getStreams(id, type, season, episode) {
    console.log(`[Gnula] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    let results = [];
    const q1 = cleanTitle(info.title);
    if (q1) {
        results = await searchGnula(q1);
    }
    if (results.length === 0) {
        const q2 = cleanTitle(info.originalTitle);
        if (q2 && q2 !== q1) {
            results = await searchGnula(q2);
        }
    }
    if (results.length === 0 && info.title) {
        results = await searchGnula(info.title);
    }
    if (results.length === 0 && info.originalTitle && info.originalTitle !== info.title) {
        results = await searchGnula(info.originalTitle);
    }

    let target = results.find(r => {
        const cleanSearch = cleanTitle(r.title).toLowerCase();
        const cleanT = cleanTitle(info.title).toLowerCase();
        const cleanO = cleanTitle(info.originalTitle).toLowerCase();
        return cleanSearch === cleanT || cleanSearch === cleanO;
    });

    if (!target) {
        target = results.find(r => {
            const cleanSearch = cleanTitle(r.title).toLowerCase();
            const cleanT = cleanTitle(info.title).toLowerCase();
            const cleanO = cleanTitle(info.originalTitle).toLowerCase();
            return cleanSearch.includes(cleanT) || cleanT.includes(cleanSearch) ||
                   cleanSearch.includes(cleanO) || cleanO.includes(cleanSearch);
        });
    }

    if (!target) return [];

    let url = target.url;
    if (type === "tv") {
        // Find specific episode using cheerio
        const episodesHtml = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const cheerio = require("cheerio");
        const $ = cheerio.load(episodesHtml);
        let epUrl = null;
        
        $(".gnrd-epc").each((i, el) => {
            const s = parseInt($(el).attr("data-s"));
            const e = parseInt($(el).attr("data-e"));
            if (s === season && e === episode) {
                epUrl = $(el).attr("href");
                return false;
            }
        });

        if (!epUrl) {
            $(".eplister a, .epcheck a, .gnpv-eplist a").each((i, el) => {
                const numText = $(el).find(".epl-num").text().trim();
                const match = numText.match(/^0*(\d+)x0*(\d+)$/i);
                if (match) {
                    const s = parseInt(match[1]);
                    const e = parseInt(match[2]);
                    if (s === season && e === episode) {
                        epUrl = $(el).attr("href");
                        return false;
                    }
                }
            });
        }
        
        if (!epUrl) return [];
        url = epUrl;
    }

    const embeds = await extractEmbeds(url);
    const streams = [];
    for (const embed of embeds) {
        const resolved = await resolveEmbed(embed);
        if (resolved) streams.push(...resolved);
    }

    return streams;
}

module.exports = { getStreams };
