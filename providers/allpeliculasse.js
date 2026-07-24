const CryptoJS = require("crypto-js");
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://allpeliculas.la";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Connection": "keep-alive"
};

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
            console.log(`[AllpeliculasSE] TMDB Error (${lang}): ${e.message}`);
        }
    }
    return titles.size > 0 ? { titles: Array.from(titles), year } : null;
}

async function searchAllPeliculas(query, type) {
    try {
        const postType = type === "tv" ? "tvshows" : "movies";
        const url = `${BASE_URL}/wp-api/v1/search?filter=[]&q=${encodeURIComponent(query)}&orderBy=latest&order=desc&postType=${postType}&postsPerPage=20&page=1`;
        console.log(`[AllpeliculasSE] Searching API: ${url}`);
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        if (data && data.data && data.data.posts) {
            return data.data.posts.map(p => ({
                id: p._id,
                title: p.title,
                slug: p.slug,
                type: p.type
            }));
        }
    } catch (e) {
        console.log(`[AllpeliculasSE] Search Error: ${e.message}`);
    }
    return [];
}

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
                    let hlsUrl = null;
                    if (config && config.request && config.request.files && config.request.files.hls && config.request.files.hls.cdns && config.request.files.hls.cdns.default) {
                        hlsUrl = config.request.files.hls.cdns.default.url;
                    }
                    if (hlsUrl) {
                        return {
                            url: hlsUrl,
                            server: "Vimeos",
                            quality: "1080p",
                            headers: { "User-Agent": USER_AGENT, "Referer": "https://player.vimeo.com/", "Accept-Language": "es-MX,es;q=0.9" }
                        };
                    }
                    const progressive = config && config.request && config.request.files ? config.request.files.progressive : null;
                    if (progressive && progressive.length > 0) {
                        const best = progressive.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0))[0];
                        return {
                            url: best.url,
                            server: "Vimeos",
                            quality: best.quality ? best.quality + "p" : "1080p",
                            headers: { "User-Agent": USER_AGENT, "Referer": "https://player.vimeo.com/", "Accept-Language": "es-MX,es;q=0.9" }
                        };
                    }
                }
            } catch (e) {
                console.log(`[Vimeos] Vimeo Config Error: ${e.message}`);
            }
        }

        const packMatch = html.match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
        if (packMatch) {
            console.log("[Vimeos] Usando Unpacker...");
            const payload = packMatch[1];
            const radix = parseInt(packMatch[2]);
            const symtab = packMatch[4].split("|");
            const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const unbase = (str) => {
                let result = 0;
                for (let i = 0; i < str.length; i++)
                    result = result * radix + chars.indexOf(str[i]);
                return result;
            };
            const unpacked = payload.replace(/\b(\w+)\b/g, (match) => {
                const idx = unbase(match);
                return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
            });
            const m3u8Match = unpacked.match(/["']([^"']+\.m3u8[^"']*)['"]/i);
            if (m3u8Match) {
                return {
                    url: m3u8Match[1],
                    server: "Vimeos",
                    quality: "1080p",
                    headers: { "User-Agent": USER_AGENT, "Referer": "https://vimeos.net/", "Accept-Language": "es-MX,es;q=0.9" }
                };
            }
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
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://goodstream.one/",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-MX,es;q=0.9",
                "Connection": "keep-alive"
            }
        });
        if (!response.ok) return null;
        const html = await response.text();
        const match = html.match(/file:\s*"([^"]+)"/);
        if (!match) {
            console.log('[GoodStream] No se encontró patrón file:"..."');
            return null;
        }
        const videoUrl = match[1];
        const refererHeaders = {
            "Referer": embedUrl,
            "Origin": "https://goodstream.one",
            "User-Agent": USER_AGENT,
            "Accept-Language": "es-MX,es;q=0.9"
        };
        let quality = "1080p";
        if (videoUrl.includes(".m3u8")) {
            const m = videoUrl.match(/[_-](\d{3,4})p/i);
            if (m) quality = `${m[1]}p`;
        }
        return {
            url: videoUrl,
            server: "GoodStream",
            quality: quality,
            headers: refererHeaders
        };
    } catch (err) {
        console.log(`[GoodStream] Error: ${err.message}`);
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
    if (u.includes("vimeos.net") || u.includes("vimeos.cc")) return resolveVimeos(url);
    if (u.includes("goodstream.one") || u.includes("goodstream.co")) return resolveGoodstream(url);
    
    return null;
}

async function getStreams(id, type, season, episode) {
    console.log(`[AllpeliculasSE] Resolving stream for ID ${id}, Type ${type}, Season: ${season}, Episode: ${episode}`);
    
    const info = await getTMDBInfo(id, type);
    if (!info) {
        console.log("[AllpeliculasSE] Failed to retrieve TMDB information.");
        return [];
    }

    let matchedPost = null;
    for (const title of info.titles) {
        const query = getSearchQuery(title);
        if (!query) continue;
        const cleaned = cleanTitle(title);
        const posts = await searchAllPeliculas(query, type);
        if (posts && posts.length > 0) {
            // Find best matches by cleaned title and correct type
            const matchesType = type === "tv" ? "tvshows" : "movies";
            matchedPost = posts.find(p => {
                if (p.type !== matchesType) return false;
                const pTitle = cleanTitle(p.title);
                return pTitle.includes(cleaned) || cleaned.includes(pTitle);
            });
            if (matchedPost) break;
            
            // Fallback to first matching type post
            matchedPost = posts.find(p => p.type === matchesType);
            if (matchedPost) break;
        }
    }

    if (!matchedPost) {
        console.log("[AllpeliculasSE] No matching titles found on AllPeliculas search.");
        return [];
    }

    console.log(`[AllpeliculasSE] Matched: "${matchedPost.title}" (ID: ${matchedPost.id}, Type: ${matchedPost.type})`);
    
    let targetPostId = matchedPost.id;

    if (type === "tv") {
        const seasonUrl = `${BASE_URL}/wp-api/v1/single/episodes/list?_id=${matchedPost.id}&season=${season}&postsPerPage=100&page=1`;
        console.log(`[AllpeliculasSE] Fetching episode list: ${seasonUrl}`);
        try {
            const epRes = await fetch(seasonUrl, { headers: HEADERS });
            if (!epRes.ok) throw new Error(`HTTP ${epRes.status}`);
            const epData = await epRes.json();
            if (epData && epData.data && epData.data.posts) {
                const epMatched = epData.data.posts.find(ep => parseInt(ep.season_number) === parseInt(season) && parseInt(ep.episode_number) === parseInt(episode));
                if (epMatched) {
                    targetPostId = epMatched._id;
                    console.log(`[AllpeliculasSE] Matched Episode: S${season}E${episode} (Post ID: ${targetPostId})`);
                } else {
                    console.log(`[AllpeliculasSE] Episode S${season}E${episode} not found in the list.`);
                    return [];
                }
            } else {
                console.log("[AllpeliculasSE] No episodes posts array found in JSON.");
                return [];
            }
        } catch (e) {
            console.log(`[AllpeliculasSE] TV Episodes Listing Error: ${e.message}`);
            return [];
        }
    }

    const playerUrl = `${BASE_URL}/wp-api/v1/player?postId=${targetPostId}&demo=0`;
    console.log(`[AllpeliculasSE] Fetching players from: ${playerUrl}`);
    
    try {
        const pRes = await fetch(playerUrl, { headers: HEADERS });
        if (!pRes.ok) throw new Error(`HTTP ${pRes.status}`);
        const pData = await pRes.json();
        
        if (!pData || !pData.data || !pData.data.embeds) {
            console.log("[AllpeliculasSE] Player API response contains no embeds.");
            return [];
        }

        const streams = [];
        const embeds = pData.data.embeds;
        
        for (const embed of embeds) {
            const url = embed.url;
            const server = embed.server;
            
            // Do not resolve torrent sources
            if (server === "Torrent" || (url && (url.startsWith("magnet:") || url.toLowerCase().includes(".torrent")))) {
                console.log(`[AllpeliculasSE] Skipping torrent source: ${url}`);
                continue;
            }

            if (!url || !url.startsWith("http")) continue;

            const resolved = await resolveEmbed(url);
            if (resolved && resolved.url) {
                let lang = "Lat";
                const embedLang = embed.lang || "";
                if (embedLang.includes("Latino")) {
                    lang = "Lat";
                } else if (embedLang.includes("Castellano")) {
                    lang = "Esp";
                } else if (embedLang.includes("Subtitulado")) {
                    lang = "Sub";
                } else if (embedLang.toLowerCase().includes("ingles") || embedLang.toLowerCase().includes("inglés")) {
                    lang = "Ing";
                }

                streams.push({
                    name: "AllpeliculasSE",
                    title: `${resolved.quality || "1080p"} · ${lang} · ${resolved.server}`,
                    url: resolved.url,
                    quality: resolved.quality || "1080p",
                    headers: resolved.headers || { Referer: url }
                });
            }
        }
        
        return streams;
    } catch (e) {
        console.log(`[AllpeliculasSE] Get Player embeds error: ${e.message}`);
    }

    return [];
}

module.exports = { getStreams };
