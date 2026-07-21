const cheerio = require('cheerio');
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://verpelis.gratis";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

function cleanTitle(title) {
    if (!title) return "";
    return title
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/:\s*.*?$/g, "")
        .replace(/[-_]/g, " ")
        .replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
    const languages = ["es-MX", "es-ES", "en-US"];
    for (const lang of languages) {
        try {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`;
            const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
            const title = type === "movie" ? res.title : res.name;
            const original = type === "movie" ? res.original_title : res.original_name;
            if (title) titles.add(title);
            if (original) titles.add(original);
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        } catch (e) {
            console.log(`[VerPelis] TMDB Error (${lang}): ${e.message}`);
        }
    }
    return titles.size > 0 ? { titles: Array.from(titles), year } : null;
}

async function searchVerPelis(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const cleanHtml = html.replace(/\n|\r|\t|\s{2}/g, '');
        const matches = [];
        const regex = /<article[^>]*>.*?<a href="([^"]+)".*?(?:alt="([^"]+)"|<h2 class="entry-title">([^<]+)<\/h2>)/gs;
        let match;
        while ((match = regex.exec(cleanHtml)) !== null) {
            const url = match[1];
            const title = (match[2] || match[3] || "").trim();
            const isTv = url.includes("/series/");
            
            matches.push({
                url,
                title,
                isTv
            });
        }
        return matches;
    } catch (e) {
        console.log(`[VerPelis] Search Error: ${e.message}`);
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
                 "398fitus", "bysejikuar", "fmoon"],
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
                            const m = dlText.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
                            if (m) m3u8Url = m[0];
                        }
                    }
                    if (!m3u8Url) {
                        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
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
                         || html.match(/["'](https?:\/\/[^\s"']+?\/stream\/[^\s"']+?\.m3u8[^\s"']*)["']/i);
            if (rawMatch) finalUrl = rawMatch[1];
        }
        if (!finalUrl) return null;
        if (!finalUrl.startsWith("http")) finalUrl = origin + finalUrl;
        return {
            url: finalUrl,
            server: "VidHide",
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
        const videoId = urlObj.pathname.split("/").filter(Boolean).pop();
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
                        server: "FileMoon",
                        quality: data?.sources?.[0]?.label || "HD",
                        headers: { "User-Agent": USER_AGENT, "Referer": playbackDomain, "Origin": playbackDomain }
                    };
                }
            }
        }
        const playText = JSON.stringify(playData);
        const m3 = playText.match(/https?:\\?\/\\?\/[^"\\]+\.m3u8[^"\\]*/i);
        if (m3) return { url: m3[0].replace(/\\/g, ""), server: "FileMoon", quality: "HD", headers: { Referer: embedUrl } };
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
            return {
                url: `https:${linkMatch[1]}${linkMatch[2]}`,
                server: "StreamTape",
                quality: "720p",
                headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" }
            };
        }
        const mp4 = html.match(/https?:\/\/(?:cdn|streamtape)\.streamtape\.com\/[^"'<\s]+\.mp4[^"'<\s]*/i);
        if (mp4) return { url: mp4[0], server: "StreamTape", quality: "720p", headers: { "Referer": "https://streamtape.com/" } };
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
        if (m3) return { url: m3[0], server: "Waaw", quality: "720p", headers: { "User-Agent": USER_AGENT, "Referer": eUrl } };
        const file = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (file) return { url: file[1], server: "Waaw", quality: "720p", headers: { "User-Agent": USER_AGENT, "Referer": eUrl } };
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
                                return { url: data.source, server: "VOE", quality: "1080p", headers: { "User-Agent": USER_AGENT, "Referer": embedUrl } };
                            }
                        }
                    }
                }
            } catch (ex) {
            }
        }
        const m3 = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
        if (m3) return { url: m3[1], server: "VOE", quality: "1080p", headers: { "Referer": embedUrl, "User-Agent": USER_AGENT } };
    } catch (e) {
    }
    return null;
}

async function resolveOkRu(embedUrl) {
    try {
      let e = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, Accept: "text/html", Referer: "https://ok.ru/" }, redirect: "follow" }).then((n) => n.text());
      if (e.includes("copyrightsRestricted") || e.includes("COPYRIGHTS_RESTRICTED") || e.includes("LIMITED_ACCESS") || e.includes("notFound") || !e.includes("urls"))
        return null;
      let r = [...e.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "").matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)], s = ["full", "hd", "sd", "low", "lowest"], i = r.map((n) => ({ type: n[1], url: n[2] })).filter((n) => !n.type.toLowerCase().includes("mobile") && n.url.startsWith("http"));
      if (i.length === 0) return null;
      let l = i.sort((n, u) => {
        let f = s.findIndex((p) => n.type.toLowerCase().includes(p)), d = s.findIndex((p) => u.type.toLowerCase().includes(p));
        return (f === -1 ? 99 : f) - (d === -1 ? 99 : d);
      })[0];
      let c = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return { url: l.url, server: "OkRu", quality: c[l.type] || l.type, headers: { "User-Agent": USER_AGENT, Referer: "https://ok.ru/" } };
    } catch (e) {
      return null;
    }
}

async function resolveEmbed(url) {
    if (isMirror(url, "STREAMWISH")) return resolveStreamwish(url);
    if (isMirror(url, "VIDHIDE"))    return resolveVidhide(url);
    if (isMirror(url, "FILEMOON"))   return resolveFilemoon(url);
    if (isMirror(url, "VOE"))        return resolveVoe(url);
    if (isMirror(url, "DOODSTREAM")) return resolveDoodstream(url);
    if (isMirror(url, "STREAMTAPE")) return resolveStreamtape(url);
    const u = url.toLowerCase();
    if (u.includes("waaw.to") || u.includes("netu.tv")) return resolveWaaw(url);
    if (u.includes("ok.ru")) return resolveOkRu(url);
    return null;
}

async function extractStreams(url) {
    try {
        console.log(`[VerPelis] Extracting streams from page: ${url}`);
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const streams = [];

        // Try parsing using Cheerio to find option panels
        const $ = cheerio.load(html);
        const options = [];
        $(".dooplay_player_option").each((i, el) => {
            const dataPost = $(el).attr("data-post");
            const dataNume = $(el).attr("data-nume");
            const dataType = $(el).attr("data-type");
            if (dataPost && dataNume && dataType) {
                let htmlContent = $(el).html().toLowerCase();
                let lang = "Lat";
                if (htmlContent.includes("lat.png") || htmlContent.includes("latino") || htmlContent.includes("mx.png")) {
                    lang = "Lat";
                } else if (htmlContent.includes("es.png") || htmlContent.includes("cas.png") || htmlContent.includes("castellano") || htmlContent.includes("español")) {
                    lang = "Esp";
                } else if (htmlContent.includes("sub.png") || htmlContent.includes("vose") || htmlContent.includes("subtitulado")) {
                    lang = "Sub";
                }
                options.push({ dataPost, dataNume, dataType, lang });
            }
        });

        if (options.length > 0) {
            console.log(`[VerPelis] Found ${options.length} player options via Cheerio`);
            const ajaxUrlBase = "https://verpelis.gratis/wp-json/dooplayer/v2/";
            
            // Fetch player options in parallel
            const promises = options.map(async (opt) => {
                try {
                    const apiUrl = `${ajaxUrlBase}${opt.dataPost}/${opt.dataType}/${opt.dataNume}`;
                    const res = await fetch(apiUrl, {
                        headers: {
                            "User-Agent": USER_AGENT,
                            "Accept": "application/json, text/plain, */*",
                            "Referer": url
                        }
                    });
                    if (!res.ok) return;
                    const data = await res.json();
                    if (data && data.embed_url) {
                        let embedUrl = data.embed_url;
                        if (embedUrl.trim().startsWith("<")) {
                            const srcMatch = embedUrl.match(/src=["']([^"']+)["']/);
                            if (srcMatch) {
                                embedUrl = srcMatch[1];
                            } else {
                                return;
                            }
                        }
                        if (embedUrl && embedUrl.startsWith("http")) {
                            if (embedUrl.startsWith("//")) {
                                embedUrl = "https:" + embedUrl;
                            }
                            console.log(`[VerPelis] Resolving embed option ${opt.dataNume} (${opt.lang}): ${embedUrl}`);
                            const resolved = await resolveEmbed(embedUrl);
                            if (resolved && resolved.url) {
                                streams.push({
                                    provider: "VerPelis",
                                    title: `${resolved.quality || "720p"} · ${opt.lang} · ${resolved.server}`,
                                    url: resolved.url,
                                    quality: resolved.quality || "720p",
                                    headers: resolved.headers || { Referer: embedUrl }
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.log(`[VerPelis] Error fetching AJAX option:`, err.message);
                }
            });
            await Promise.all(promises);
        } else {
            console.log("[VerPelis] No player options found, falling back to static iframe regex");
            // Fallback: search for static iframes
            const cleanHtml = html.replace(/\n|\r|\t|\s{2}/g, '');
            const iframeRegex = /<iframe[^>]*?data-litespeed-src="([^"]+)"|<iframe[^>]*?src="([^"]+)"/g;
            let match;
            while ((match = iframeRegex.exec(cleanHtml)) !== null) {
                let embedUrl = match[1] || match[2];
                if (!embedUrl || embedUrl.includes(".youtube.") || embedUrl.includes("amazon-adsystem")) continue;
                
                if (embedUrl.startsWith("//")) {
                    embedUrl = "https:" + embedUrl;
                }
                
                let lang = "Lat";
                if (cleanHtml.includes("Idioma: Español") || cleanHtml.includes("Español Castellano")) {
                    lang = "Esp";
                }

                const resolved = await resolveEmbed(embedUrl);
                if (resolved && resolved.url) {
                    streams.push({
                        provider: "VerPelis",
                        title: `${resolved.quality || "720p"} · ${lang} · ${resolved.server}`,
                        url: resolved.url,
                        quality: resolved.quality || "720p",
                        headers: resolved.headers || { Referer: embedUrl }
                    });
                }
            }
        }
        
        return streams;
    } catch (e) {
        console.log(`[VerPelis] Extract Error: ${e.message}`);
        return [];
    }
}

async function getStreams(id, type, season, episode) {
    console.log(`[VerPelis] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    let results = [];
    // Try searching for each title variant
    for (const title of info.titles) {
        const cleaned = cleanTitle(title);
        if (!cleaned) continue;
        console.log(`[VerPelis] Searching for: "${cleaned}"`);
        const searchResults = await searchVerPelis(cleaned);
        if (searchResults.length > 0) {
            // Ensure at least one result matches the requested media type
            const hasTypeMatch = searchResults.some(r => (type === "tv" && r.isTv) || (type === "movie" && !r.isTv));
            if (hasTypeMatch) {
                results = searchResults;
                break;
            }
        }
    }

    if (results.length === 0) {
        console.log(`[VerPelis] No matching search results found`);
        return [];
    }

    // Filter results to find the best match
    let target = null;
    for (const r of results) {
        const lowerResTitle = r.title.toLowerCase();
        const matchesType = (type === "tv" && r.isTv) || (type === "movie" && !r.isTv);
        if (matchesType) {
            const isMatch = info.titles.some(t => {
                const lowerT = t.toLowerCase();
                return lowerResTitle.includes(cleanTitle(lowerT).toLowerCase()) || cleanTitle(lowerT).toLowerCase().includes(lowerResTitle);
            });
            if (isMatch) {
                target = r;
                break;
            }
        }
    }
    
    if (!target) {
        target = results.find(r => (type === "tv" && r.isTv) || (type === "movie" && !r.isTv)) || results[0];
    }
    
    let url = target.url;
    console.log(`[VerPelis] Selected page: ${url} (${target.title})`);
    
    if (type === "tv") {
        try {
            const seriesHtml = await fetch(url, { headers: HEADERS }).then(r => r.text());
            const cleanHtml = seriesHtml.replace(/\n|\r|\t|\s{2}/g, '');
            
            // Extract the block for the requested season
            const blockRegex = new RegExp(`class=['"]se-t.*?['"]>${season}</span>(.*?)(?:</ul>|<div class=['"]se-q['"]|$)`, 'i');
            const blockMatch = cleanHtml.match(blockRegex);
            if (blockMatch) {
                const searchBlock = blockMatch[1];
                
                // Match the episode url inside DooPlay layout
                const epRegex = /<div class=['"]numerando['"]>([^<]+)<\/div>.*?<a href=['"]([^'"]+)['"]/g;
                let match;
                let epUrl = null;
                while ((match = epRegex.exec(searchBlock)) !== null) {
                    const numerando = match[1].trim(); // e.g. "1 - 1" or "1x1"
                    const link = match[2];
                    if (numerando.endsWith(`- ${episode}`) || numerando.endsWith(`-${episode}`) || numerando.includes(`x${episode}`)) {
                        epUrl = link;
                        break;
                    }
                }
                if (epUrl) url = epUrl;
            }
        } catch (e) {
            console.log(`[VerPelis] Episode resolution error: ${e.message}`);
        }
    }

    return await extractStreams(url);
}

module.exports = { getStreams };
