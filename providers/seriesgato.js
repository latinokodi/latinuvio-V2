const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://vip.seriesgato.pw";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        console.log(`[SeriesGato] TMDB Error: ${e.message}`);
        return null;
    }
}

async function search(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query).replace(/%20/g, "+")}`;
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const matches = [];
        const regex = /<article.*?<a href="([^"]+)".*?<h3 class="Title">([^<]+)<\/h3>/gs;
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push({
                url: match[1],
                title: match[2].trim()
            });
        }
        return matches;
    } catch (e) {
        console.log(`[SeriesGato] Search Error: ${e.message}`);
        return [];
    }
}

const CryptoJS = require("crypto-js");

const MIRRORS = {
    STREAMWISH: ["hlswish", "streamwish", "hglink", "hglamioz", "audinifer",
                 "embedwish", "awish", "dwish", "strwish", "wishembed", "wishfast", "hanerix", "viewsb", "sfastwish"],
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

async function resolveEmbed(url) {
    if (isMirror(url, "STREAMWISH")) return resolveStreamwish(url);
    if (isMirror(url, "VIDHIDE"))    return resolveVidhide(url);
    if (isMirror(url, "FILEMOON"))   return resolveFilemoon(url);
    if (isMirror(url, "VOE"))        return resolveVoe(url);
    if (isMirror(url, "DOODSTREAM")) return resolveDoodstream(url);
    if (isMirror(url, "STREAMTAPE")) return resolveStreamtape(url);
    const u = url.toLowerCase();
    if (u.includes("waaw.to") || u.includes("netu.tv")) return resolveWaaw(url);
    return null;
}

async function extractStreams(url) {
    try {
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const streams = [];
        
        const langMap = {};
        const langRegex = /data-tplayernv="Opt([^"]+)".*?alt="([^"]+)"/g;
        let lMatch;
        while ((lMatch = langRegex.exec(html)) !== null) {
            langMap[lMatch[1]] = lMatch[2].split("-")[0]?.trim() || "Latino";
        }
        
        const optRegex = /id="Opt(\d+)"[^>]*>[\s\S]*?<iframe[^>]*src="([^"]+)"/gi;
        let optMatch;
        const trembedUrls = [];
        
        while ((optMatch = optRegex.exec(html)) !== null) {
            let src = optMatch[2];
            src = src.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
            if (src.includes("trembed=") && src.includes("trid=")) {
                trembedUrls.push({ optId: optMatch[1], src, lang: langMap[optMatch[1]] || "Latino" });
            }
        }
        
        const encodedRegex = /id="Opt(\d+)"[^>]*>[\s\S]*?&lt;iframe[^&]*src=&quot;([^&]+)&quot;/gi;
        while ((optMatch = encodedRegex.exec(html)) !== null) {
            let src = optMatch[2];
            src = src.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
            if (src.includes("trembed=") && src.includes("trid=")) {
                if (!trembedUrls.find(t => t.optId === optMatch[1])) {
                    trembedUrls.push({ optId: optMatch[1], src, lang: langMap[optMatch[1]] || "Latino" });
                }
            }
        }
        
        console.log(`[SeriesGato] Found ${trembedUrls.length} trembed URLs`);
        
        for (const { optId, src: trembedUrl, lang } of trembedUrls) {
            try {
                if (trembedUrl.includes("viewsb")) {
                    console.log(`[SeriesGato] Skipping viewsb embed (SPA)`);
                    continue;
                }
                
                const trembedResp = await fetch(trembedUrl, { headers: HEADERS });
                if (!trembedResp.ok) continue;
                const trembedHtml = await trembedResp.text();
                
                const iframeMatch = trembedHtml.match(/<iframe[^>]*src="([^"]+)"/i);
                if (!iframeMatch) continue;
                
                let embedUrl = iframeMatch[1];
                if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
                embedUrl = embedUrl.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
                
                let langLabel = "Lat";
                if (lang.includes("Castellano")) langLabel = "Esp";
                if (lang.includes("Subtitulado")) langLabel = "Vose";
                
                const resolved = await resolveEmbed(embedUrl);
                if (resolved && resolved.url) {
                    streams.push({
                        name: "SeriesGato",
                        title: `${resolved.quality || "HD"} \u00b7 ${langLabel} \u00b7 ${resolved.server}`,
                        url: resolved.url,
                        quality: resolved.quality || "HD",
                        headers: resolved.headers || { Referer: embedUrl }
                    });
                }
            } catch (e) {
                console.log(`[SeriesGato] Trembed ${optId} error: ${e.message}`);
            }
        }
        
        return streams;
    } catch (e) {
        console.log(`[SeriesGato] Extract Error: ${e.message}`);
        return [];
    }
}

async function getStreams(id, type, season, episode) {
    if (type !== "tv") return [];

    console.log(`[SeriesGato] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    const results = await search(info.title);
    if (results.length === 0) {
        console.log(`[SeriesGato] No search results for: ${info.title}`);
        return [];
    }

    const target = results[0];
    console.log(`[SeriesGato] Selected: ${target.title} -> ${target.url}`);
    
    let slug = target.url.replace(/https?:\/\/[^/]+\//, "").replace(/\/$/, "");
    slug = slug.replace(/-[a-z]$/, "");
    
    const S = String(season);
    const E = String(episode);
    
    const epUrls = [
        `${BASE_URL}/ver/capitulo/${slug}-${S}x${E}/`,
        `${BASE_URL}/ver/capitulo/${slug}-${S}x${E.padStart(2, '0')}/`,
    ];
    
    for (const epUrl of epUrls) {
        try {
            const resp = await fetch(epUrl, { headers: HEADERS });
            if (resp.ok) {
                console.log(`[SeriesGato] Found episode at: ${epUrl}`);
                return await extractStreams(epUrl);
            }
        } catch (e) {}
    }
    
    console.log(`[SeriesGato] URL guessing failed, searching series page HTML...`);
    try {
        const seriesHtml = await fetch(target.url, { headers: HEADERS }).then(r => r.text());
        const epPattern = new RegExp(`href="([^"]*ver/capitulo/[^"]*-${S}x${E}[^"]*)"`, 'i');
        const m = seriesHtml.match(epPattern);
        if (m) {
            console.log(`[SeriesGato] Found episode via HTML: ${m[1]}`);
            return await extractStreams(m[1]);
        }
    } catch (e) {}
    
    console.log(`[SeriesGato] Episode not found`);
    return [];
}

module.exports = { getStreams };
