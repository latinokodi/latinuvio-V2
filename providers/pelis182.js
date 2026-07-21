const CryptoJS = require("crypto-js");
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://pelis182.net";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

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

// ─── Packer / crypto helpers ──────────────────────────────────────────────────
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

// ─── StreamWish resolver ──────────────────────────────────────────────────────
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

// ─── VidHide resolver ─────────────────────────────────────────────────────────
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

// ─── Filemoon resolver ─────────────────────────────────────────────────────────
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
    } catch (e) {}
    return null;
}

// ─── VOE resolver ─────────────────────────────────────────────────────────────
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
            } catch (ex) {}
        }
        const m3 = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
        if (m3) return { url: m3[1], server: "VOE", quality: "1080p", headers: { "Referer": embedUrl, "User-Agent": USER_AGENT } };
    } catch (e) {}
    return null;
}

// ─── Doodstream resolver ──────────────────────────────────────────────────────
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
        const finalUrl = `${base}${rand}?token=${token}&expiry=${Date.now()}`;
        return {
            url: finalUrl,
            server: "DoodStream",
            quality: "720p",
            headers: { "User-Agent": USER_AGENT, "Referer": `${domain}/` }
        };
    } catch (e) {
        return null;
    }
}

// ─── StreamTape resolver ─────────────────────────────────────────────────────
async function resolveStreamtape(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const linkMatch = html.match(/innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*(?:["'][^"']*["']\s*\+\s*)?["']([^"']+)["']/i);
        if (linkMatch) {
            const url = `https:${linkMatch[1]}${linkMatch[2]}`;
            return {
                url,
                server: "StreamTape",
                quality: "720p",
                headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" }
            };
        }
        const mp4 = html.match(/https?:\/\/(?:cdn|streamtape)\.streamtape\.com\/[^"'<\s]+\.mp4[^"'<\s]*/i);
        if (mp4) return { url: mp4[0], server: "StreamTape", quality: "720p", headers: { "Referer": "https://streamtape.com/" } };
    } catch (e) {}
    return null;
}

// ─── Waaw / Netu resolver ─────────────────────────────────────────────────────
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
    } catch (e) {}
    return null;
}

// ─── Embed URL router ─────────────────────────────────────────────────────────

// ─── Fastream resolver (Custom for SeriesMetro) ───────────────────────────────
async function resolveFastream(embedUrl) {
    try {
        const referer = typeof BASE_URL !== "undefined" ? BASE_URL + "/" : embedUrl;
        const html = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": referer }
        }).then(r => r.text());
        
        const unpacked = evalUnpack(html);
        if (!unpacked) return null;
        
        const fileMatch = unpacked.match(/files*:s*"([^"]+.m3u8[^"]*)"/i) || unpacked.match(/files*:s*'([^']+.m3u8[^']*)'/i);
        if (!fileMatch) return null;
        
        return {
            url: fileMatch[1],
            server: "Fastream",
            quality: "1080p",
            headers: { "User-Agent": USER_AGENT, "Referer": "https://fastream.to/" }
        };
    } catch (e) {}
    return null;
}

async function resolveEmbed(embedUrl) {
    if (isMirror(embedUrl, "STREAMWISH")) return resolveStreamwish(embedUrl);
    if (isMirror(embedUrl, "VIDHIDE"))    return resolveVidhide(embedUrl);
    if (isMirror(embedUrl, "FILEMOON"))   return resolveFilemoon(embedUrl);
    if (isMirror(embedUrl, "VOE"))        return resolveVoe(embedUrl);
    if (isMirror(embedUrl, "DOODSTREAM")) return resolveDoodstream(embedUrl);
    if (isMirror(embedUrl, "STREAMTAPE")) return resolveStreamtape(embedUrl);
    const u = embedUrl.toLowerCase();
    if (u.includes("waaw.to") || u.includes("netu.tv")) return resolveWaaw(embedUrl);
    if (u.includes("fastream.to") || u.includes("fastream.co")) return resolveFastream(embedUrl);
    return null;
}

// ─── Title Matching Utilities ─────────────────────────────────────────────────
function cleanTitle(title) {
    if (!title) return "";
    let t = title.toLowerCase();
    const authorPrefixes = [
        /de tom clancy/gi,
        /tom clancy's/gi,
        /de stephen king/gi,
        /stephen king's/gi,
        /de guillermo del toro/gi,
        /guillermo del toro's/gi
    ];
    for (const pattern of authorPrefixes) {
        t = t.replace(pattern, "");
    }
    return t
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/:\s*.*?$/g, "")
        .replace(/[-_]/g, " ")
        .replace(/[^a-z0-9\sáéíóúÁÉÍÓÚñÑ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getSearchCandidates(titles) {
    const candidates = new Set();
    const authorPrefixes = [
        /de tom clancy/gi,
        /tom clancy's/gi,
        /de stephen king/gi,
        /stephen king's/gi,
        /de guillermo del toro/gi,
        /guillermo del toro's/gi
    ];

    for (const title of titles) {
        candidates.add(title);
        
        let cleaned = title;
        for (const pattern of authorPrefixes) {
            cleaned = cleaned.replace(pattern, "");
        }
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        if (cleaned && cleaned !== title) {
            candidates.add(cleaned);
        }

        if (title.includes(":")) {
            const parts = title.split(":");
            parts.forEach(p => {
                const pt = p.trim();
                if (pt) candidates.add(pt);
                
                let cpt = pt;
                for (const pattern of authorPrefixes) {
                    cpt = cpt.replace(pattern, "");
                }
                cpt = cpt.replace(/\s+/g, " ").trim();
                if (cpt && cpt !== pt) {
                    candidates.add(cpt);
                }
            });
        }
    }
    return Array.from(candidates);
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
        } catch (e) {}
    }
    return titles.size > 0 ? { titles: Array.from(titles), year } : null;
}

async function getDirectVideoUrl(url) {
    try {
        const resp = await fetch(url, { headers: { "Referer": BASE_URL, "User-Agent": USER_AGENT } });
        if (!resp.ok) return null;
        const data = await resp.text();
        const videoMatch = data.match(/sources:\s*\[\{"file":"([^"]+)/);
        if (videoMatch) {
            let m3u8Url = videoMatch[1];
            if (m3u8Url.endsWith(".m3u8")) {
                return m3u8Url;
            }
        }
    } catch (e) {}
    return null;
}

// ─── Scraper Logic ────────────────────────────────────────────────────────────
async function getStreams(id, type, season, episode) {
    console.log(`[Pelis182] Resolving: ${id} (${type})`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    try {
        let searchHtml = "";
        const candidates = getSearchCandidates(info.titles);
        for (const query of candidates) {
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query).replace(/%20/g, "+")}`;
            try {
                const html = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());
                if (html.includes("<article")) {
                    searchHtml = html;
                    break;
                }
            } catch (e) {}
        }

        if (!searchHtml) return [];

        // Parse search results
        const articles = [];
        const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
        let artMatch;
        while ((artMatch = articleRegex.exec(searchHtml)) !== null) {
            const block = artMatch[1];
            const hrefM = block.match(/href="([^"]+)"/);
            const titleM = block.match(/title="([^"]+)"/) || block.match(/alt="([^"]+)"/);
            
            if (hrefM && titleM) {
                const url = hrefM[1];
                const isTv = url.includes("-temporada-") || url.includes("-temporadas");
                articles.push({
                    url,
                    title: titleM[1].replace(/Temporada \d+/gi, "").replace(/Todas las Temporadas/gi, "").trim(),
                    isMovie: !isTv,
                    seasonNum: isTv ? (url.match(/-temporada-(\d+)/) || [])[1] : null
                });
            }
        }

        // Fuzzy match
        let bestMatch = null;
        let bestScore = -999;
        const cleanedQueries = info.titles.map(t => cleanTitle(t));

        for (const item of articles) {
            if (type === "movie" && !item.isMovie) continue;
            if (type === "tv" && item.isMovie) continue;

            if (type === "tv" && season && item.seasonNum && parseInt(item.seasonNum) !== parseInt(season)) continue;

            const cleanedTitleStr = cleanTitle(item.title);
            
            // Score against all TMDB titles and pick the highest score
            let maxScore = -999;
            for (const cleanedQuery of cleanedQueries) {
                let score = 0;
                if (cleanedTitleStr === cleanedQuery) {
                    score += 100;
                } else if (cleanedTitleStr.includes(cleanedQuery) || cleanedQuery.includes(cleanedTitleStr)) {
                    score += 40;
                }

                const lengthDiff = Math.abs(cleanedTitleStr.length - cleanedQuery.length);
                score -= lengthDiff * 0.05;
                
                if (score > maxScore) {
                    maxScore = score;
                }
            }

            if (maxScore > bestScore) {
                bestScore = maxScore;
                bestMatch = item;
            }
        }

        if (!bestMatch || bestScore < 10) return [];

        const streams = [];

        if (type === "movie") {
            const movieHtml = await fetch(bestMatch.url, { headers: HEADERS }).then(r => r.text());
            const iframeRegex = /<iframe[^>]*src="([^"]+)"/gi;
            let iframeM;
            while ((iframeM = iframeRegex.exec(movieHtml)) !== null) {
                let embedUrl = iframeM[1];
                if (embedUrl.includes("youtube.com")) continue;
                if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;

                const resolved = await resolveEmbed(embedUrl);
                if (resolved && resolved.url) {
                    streams.push({
                        name: "Pelis182",
                        title: `Mirror (Lat) · ${resolved.server}`,
                        url: resolved.url,
                        quality: resolved.quality || "720p",
                        headers: resolved.headers || { Referer: embedUrl }
                    });
                } else {
                    // Try to resolve direct barmonrey video source if applicable
                    if (embedUrl.includes("pelis182") || embedUrl.includes("barmonrey")) {
                        const directUrl = await getDirectVideoUrl(embedUrl);
                        if (directUrl) {
                            streams.push({
                                name: "Pelis182",
                                title: `Direct (Lat) · M3u8`,
                                url: directUrl,
                                quality: "720p",
                                headers: {
                                    "Referer": "https://barmonrey.com/",
                                    "User-Agent": USER_AGENT
                                }
                            });
                        }
                    }
                }
            }
        } else if (type === "tv") {
            const seriesHtml = await fetch(bestMatch.url, { headers: HEADERS }).then(r => r.text());
            
            // Try to find specific tab iframe format first
            const tabRegex = new RegExp(`id="tab-[^"]+-t${season}x${episode}"[^>]*>\\s*<iframe[^>]*src="([^"]+)"`, 'i');
            const tabMatch = seriesHtml.match(tabRegex);
            let epUrl = null;
            if (tabMatch) {
                epUrl = tabMatch[1];
                if (epUrl.startsWith("//")) epUrl = "https:" + epUrl;
            }

            if (!epUrl) {
                const iframes = [];
                const iframeRegex = /<iframe[^>]*src="([^"]+)"/gi;
                let iframeM;
                while ((iframeM = iframeRegex.exec(seriesHtml)) !== null) {
                    let embedUrl = iframeM[1];
                    if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
                    iframes.push(embedUrl);
                }

                const targetIdx = parseInt(episode) - 1;
                if (targetIdx >= 0 && targetIdx < iframes.length) {
                    epUrl = iframes[targetIdx];
                }
            }

            if (epUrl) {
                const resolved = await resolveEmbed(epUrl);
                if (resolved && resolved.url) {
                    streams.push({
                        name: "Pelis182",
                        title: `Mirror (Lat) · ${resolved.server}`,
                        url: resolved.url,
                        quality: resolved.quality || "720p",
                        headers: resolved.headers || { Referer: epUrl }
                    });
                } else {
                    if (epUrl.includes("pelis182") || epUrl.includes("barmonrey")) {
                        const directUrl = await getDirectVideoUrl(epUrl);
                        if (directUrl) {
                            streams.push({
                                name: "Pelis182",
                                title: `Direct (Lat) · M3u8`,
                                url: directUrl,
                                quality: "720p",
                                headers: {
                                    "Referer": "https://barmonrey.com/",
                                    "User-Agent": USER_AGENT
                                }
                            });
                        }
                    }
                }
            }
        }

        return streams;
    } catch (e) {
        console.log(`[Pelis182] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
