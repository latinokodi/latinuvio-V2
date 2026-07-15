const CryptoJS = require('crypto-js');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const AES_KEY = CryptoJS.enc.Utf8.parse('kiemtienmua911ca');
const AES_IV = CryptoJS.enc.Utf8.parse('1234567890oiuytr');

// Known hosts and their series URL path segment
const HOST_SERIES_PATH = {
    "vitaminagg.vip":       "serie",
    "anime.vitaminagg.vip": "anime",
    "hentai.vitaminagg.vip":"serie",
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

/** Dean Edwards packer decoder (used by StreamWish, VidHide, FileMoon) */
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

function b64decode(s) {
    try { return typeof atob !== "undefined" ? atob(s) : Buffer.from(s, "base64").toString("utf8"); }
    catch { return null; }
}

// ─── StreamWish resolver ──────────────────────────────────────────────────────
// Strategy: race across known mirrors, use /dl?op=view&hash= API or unpack eval()
// Reference: fuegocine.js hlswish.js (lines 766-899)

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
        console.log(`[AresHD:StreamWish] Race-resolving: ${rawId} (${mirrors.length} mirrors)`);

        const result = await new Promise((resolve) => {
            let resolved = false;
            let pending = mirrors.length;

            mirrors.forEach(async (mirror) => {
                try {
                    const mirrorOrigin = new URL(mirror).origin;
                    const resp = await fetch(mirror, {
                        headers: { "Referer": mirror, "User-Agent": UA }
                    });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const html = await resp.text();

                    // Skip Vite SPA — requires browser JS
                    if (html.includes("__vite_is_modern_browser") || html.length < 500) {
                        throw new Error("SPA/skeleton page");
                    }

                    let m3u8Url = null;

                    // Method 1: extract hash → call /dl?op=view API
                    const hashMatch = html.match(/[0-9a-f]{32}/i);
                    if (hashMatch) {
                        const dlUrl = `${mirrorOrigin}/dl?op=view&file_code=${rawId}&hash=${hashMatch[0]}&embed=1&referer=&adb=1&hls4=1`;
                        const dlResp = await fetch(dlUrl, {
                            headers: { "User-Agent": UA, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" }
                        });
                        if (dlResp.ok) {
                            const dlText = await dlResp.text();
                            const m = dlText.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
                            if (m) m3u8Url = m[0];
                        }
                    }

                    // Method 2: unpack eval()
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

                    // Method 3: direct file: key
                    if (!m3u8Url) {
                        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
                        if (fileMatch) m3u8Url = fileMatch[1];
                    }

                    // Method 4: bare m3u8
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
                    // silent — try next mirror
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
            headers: { "Referer": result.mirror, "Origin": new URL(result.mirror).origin, "User-Agent": UA }
        };
    } catch (e) {
        console.log(`[AresHD:StreamWish] Error: ${e.message}`);
        return null;
    }
}

// ─── VidHide resolver ─────────────────────────────────────────────────────────
// Reference: fuegocine.js vidhide.js (lines 1078-1178)

async function resolveVidhide(embedUrl) {
    try {
        console.log(`[AresHD:VidHide] Resolving: ${embedUrl}`);
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": UA, "Referer": `${origin}/` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        let finalUrl = null;

        // Unpack eval() packer → find hls4/hls2 key
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

        // Fallback: raw hls4/file/stream patterns
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
            headers: { "User-Agent": UA, "Referer": `${origin}/`, "Origin": origin, "X-Requested-With": "XMLHttpRequest" }
        };
    } catch (e) {
        console.log(`[AresHD:VidHide] Error: ${e.message}`);
        return null;
    }
}

// ─── Filemoon / Byse resolver ─────────────────────────────────────────────────
// Reference: fuegocine.js filemoon.js (lines 964-1076) + aes_gcm.js (lines 901-962)
// Filemoon now uses an ECDSA challenge API with AES-GCM encrypted playback response.
// CryptoJS is required for decryption; if unavailable we fall back to old eval() method.

function aesGcmDecrypt(playback) {
    try {
        // Attempt Node.js native crypto (available in Luvio's QuickJS? Unlikely.)
        // Fall through to CryptoJS if available
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
        console.log("[AresHD:Filemoon] AES-GCM decrypt failed:", e.message);
    }
    return null;
}

async function resolveFilemoon(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const hostname = urlObj.hostname;
        const videoId = urlObj.pathname.split("/").filter(Boolean).pop();
        if (!videoId) return null;

        console.log(`[AresHD:FileMoon] ECDSA-resolving: ${videoId} @ ${hostname}`);

        // Step 1: get embed details (frame URL)
        const detailsRes = await fetch(`https://${hostname}/api/videos/${videoId}/embed/details`, {
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": embedUrl, "User-Agent": UA }
        });
        if (!detailsRes.ok) throw new Error(`details HTTP ${detailsRes.status}`);
        const details = await detailsRes.json();
        const frameUrl = details.embed_frame_url;
        if (!frameUrl) throw new Error("No embed_frame_url");

        const playbackDomain = new URL(frameUrl).origin;

        // Step 2: get challenge
        const challengeRes = await fetch(`${playbackDomain}/api/videos/access/challenge`, {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": UA }
        });
        const challenge = await challengeRes.json();
        if (!challenge.challenge_id) throw new Error("No challenge_id");

        const deviceId = Math.random().toString(36).substring(2, 15);
        const viewerId = Math.random().toString(36).substring(2, 15);

        // Step 3: attest (structurally valid EC key to pass curve check)
        const attestPayload = {
            viewer_id: viewerId, device_id: deviceId,
            challenge_id: challenge.challenge_id, nonce: challenge.nonce,
            signature: "MEUCIQDYi5fX9gG8_5t_4v8p_Q8o8l5v8v8v8v8v8v8v8v8v",
            public_key: {
                kty: "EC", crv: "P-256",
                x: "thRcTF9d89tZ704lTYciJq48dtIaoqf9L0Is1gK29II",
                y: "v8Oo5z9N9406uE4RnU3dlmpbAaMQtt61uynn6kgz4_Q"
            },
            client: { user_agent: UA, platform: "Windows", languages: ["es-ES"] },
            storage: { cookie: viewerId, local_storage: viewerId },
            attributes: { entropy: "high" }
        };
        const attestRes = await fetch(`${playbackDomain}/api/videos/access/attest`, {
            method: "POST",
            body: JSON.stringify(attestPayload),
            headers: {
                "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest",
                "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": UA
            }
        });
        const attestData = await attestRes.json();
        if (!attestData.token) {
            console.log(`[AresHD:FileMoon] Attest failed: ${JSON.stringify(attestData)}`);
            return null;
        }

        // Step 4: request playback
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
                "X-Embed-Parent": embedUrl, "User-Agent": UA
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
                        headers: { "User-Agent": UA, "Referer": playbackDomain, "Origin": playbackDomain }
                    };
                }
            }
        }

        // Fallback: look for bare m3u8 in the response
        const playText = JSON.stringify(playData);
        const m3 = playText.match(/https?:\\?\/\\?\/[^"\\]+\.m3u8[^"\\]*/i);
        if (m3) return { url: m3[0].replace(/\\/g, ""), server: "FileMoon", quality: "HD", headers: { Referer: embedUrl } };

    } catch (e) {
        console.log(`[AresHD:FileMoon] Error: ${e.message}`);
    }
    return null;
}

// ─── VOE resolver ─────────────────────────────────────────────────────────────
// Reference: fuegocine.js voe.js (lines 648-764)
// Strategy: follow redirect → parse <script type="application/json"> → ROT13+base64 decode

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

async function resolveVoe(embedUrl) {
    try {
        console.log(`[AresHD:VOE] Resolving: ${embedUrl}`);
        let res = await fetch(embedUrl, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let html = await res.text();

        // Handle JS redirect page (permanentToken)
        if (html.includes("window.location.href") && html.length < 2000) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm) {
                const next = await fetch(rm[1], { headers: { "User-Agent": UA } });
                if (next.ok) html = await next.text();
            }
        }

        // New VOE format: <script type="application/json"> with multi-stage encoded payload
        const jsonMatch = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                let encText = Array.isArray(parsed) ? parsed[0] : parsed;
                if (typeof encText === "string") {
                    // ROT13
                    let decoded = encText.replace(/[a-zA-Z]/g, (c) => {
                        const code = c.charCodeAt(0);
                        const limit = c <= "Z" ? 90 : 122;
                        const shifted = code + 13;
                        return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
                    });
                    // Strip noise characters
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
                                return { url: data.source, server: "VOE", quality: "1080p", headers: { "User-Agent": UA, "Referer": embedUrl } };
                            }
                        }
                    }
                }
            } catch (ex) {
                console.log(`[AresHD:VOE] JSON decode failed: ${ex.message}`);
            }
        }

        // Fallback: bare m3u8
        const m3 = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
        if (m3) return { url: m3[1], server: "VOE", quality: "1080p", headers: { "Referer": embedUrl, "User-Agent": UA } };

    } catch (e) {
        console.log(`[AresHD:VOE] Error: ${e.message}`);
    }
    return null;
}

// ─── Doodstream resolver ──────────────────────────────────────────────────────
// Reference: fuegocine.js doodstream.js (lines 2167-2249)
// Key insight from reference: use /e/ endpoint with a trusted Referer to bypass 403

async function resolveDoodstream(embedUrl) {
    try {
        // Normalize to /e/ endpoint
        let url = embedUrl.replace(/\/(d|f)\//, "/e/");
        console.log(`[AresHD:Dood] Resolving: ${url}`);

        // Use a known trusted referer (lamovie.cc per reference provider)
        const res = await fetch(url, {
            headers: { "User-Agent": UA, "Referer": "https://lamovie.cc/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        const match = html.match(/\$\.get\(['"]\/pass_md5\/([\w-]+)\/([\w-]+)['"]/i)
                   || html.match(/pass_md5\/([\w\/-]+)/i);
        if (!match) { console.log("[AresHD:Dood] No pass_md5 token"); return null; }

        const passPath = match[1];
        const token   = match[2] || passPath.split("/").pop();
        const domain  = new URL(url).origin;
        const passRes = await fetch(`${domain}${passPath}/${token}`, {
            headers: { "User-Agent": UA, "Referer": url }
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
            headers: { "User-Agent": UA, "Referer": `${domain}/` }
        };
    } catch (e) {
        console.log(`[AresHD:Dood] Error: ${e.message}`);
        return null;
    }
}

// ─── StreamTape resolver ─────────────────────────────────────────────────────
// StreamTape builds the video URL by concatenating two JS string fragments

async function resolveStreamtape(embedUrl) {
    try {
        console.log(`[AresHD:StreamTape] Resolving: ${embedUrl}`);
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": UA, "Referer": "https://streamtape.com/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // StreamTape's anti-scrape trick: two consecutive JS assignments that concat
        // document.getElementById('ideoooolink').innerHTML = "/..." + "...mp4?..."
        const linkMatch = html.match(/innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*(?:["'][^"']*["']\s*\+\s*)?["']([^"']+)["']/i);
        if (linkMatch) {
            const url = `https:${linkMatch[1]}${linkMatch[2]}`;
            return {
                url,
                server: "StreamTape",
                quality: "720p",
                headers: { "User-Agent": UA, "Referer": "https://streamtape.com/" }
            };
        }

        // Fallback: direct mp4 CDN link
        const mp4 = html.match(/https?:\/\/(?:cdn|streamtape)\.streamtape\.com\/[^"'<\s]+\.mp4[^"'<\s]*/i);
        if (mp4) return { url: mp4[0], server: "StreamTape", quality: "720p", headers: { "Referer": "https://streamtape.com/" } };

    } catch (e) {
        console.log(`[AresHD:StreamTape] Error: ${e.message}`);
    }
    return null;
}

// ─── Waaw / Netu resolver ─────────────────────────────────────────────────────
// waaw.to redirects /f/ → /e/ when in a frame context; /e/ returns a JWPlayer page

async function resolveWaaw(embedUrl) {
    try {
        // waaw.to/f/ID self-redirects to /e/ in iframe context; fetch /e/ directly
        const eUrl = embedUrl.replace(/\/f\//, "/e/");
        console.log(`[AresHD:Waaw] Resolving: ${eUrl}`);

        const res = await fetch(eUrl, {
            headers: { "User-Agent": UA, "Referer": BASE_URL + "/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // Look for m3u8
        const m3 = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
        if (m3) return { url: m3[0], server: "Waaw", quality: "720p", headers: { "User-Agent": UA, "Referer": eUrl } };

        // JWPlayer file key
        const file = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (file) return { url: file[1], server: "Waaw", quality: "720p", headers: { "User-Agent": UA, "Referer": eUrl } };

    } catch (e) {
        console.log(`[AresHD:Waaw] Error: ${e.message}`);
    }
    return null;
}

// ─── Embed URL router ─────────────────────────────────────────────────────────

async function resolveEmbed(embedUrl) {
    if (isMirror(embedUrl, "STREAMWISH")) return resolveStreamwish(embedUrl);
    if (isMirror(embedUrl, "VIDHIDE"))    return resolveVidhide(embedUrl);
    if (isMirror(embedUrl, "FILEMOON"))   return resolveFilemoon(embedUrl);
    if (isMirror(embedUrl, "VOE"))        return resolveVoe(embedUrl);
    if (isMirror(embedUrl, "DOODSTREAM")) return resolveDoodstream(embedUrl);
    if (isMirror(embedUrl, "STREAMTAPE")) return resolveStreamtape(embedUrl);
    const u = embedUrl.toLowerCase();
    if (u.includes("waaw.to") || u.includes("netu.tv")) return resolveWaaw(embedUrl);
    console.log(`[AresHD] No resolver for: ${embedUrl}`);
    return null;
}


function decrypt(hexCiphertext) {
    try {
        const cleaned = (hexCiphertext.match(/[\da-f]{2}/gi) || []).join('');
        const ciphertextWords = CryptoJS.enc.Hex.parse(cleaned);
        const ciphertextBase64 = CryptoJS.enc.Base64.stringify(ciphertextWords);
        const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, AES_KEY, {
            iv: AES_IV,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("[VitaminagG] Decryption failed:", e.message);
        return null;
    }
}

function slugify(title) {
    return title.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, "y")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * @param {string} tmdbId
 * @param {"movie"|"tv"} mediaType
 * @param {number|null} season
 * @param {number|null} episode
 * @param {string} title
 * @param {string} [host] - optional subdomain: vitaminagg.vip (default), anime.vitaminagg.vip, hentai.vitaminagg.vip
 */
async function getStreams(tmdbId, mediaType, season, episode, title, host) {
    let targetTitle = title;
    if (!targetTitle) {
        try {
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`).then(r => r.json());
            targetTitle = mediaType === "movie" ? tmdbRes.title : tmdbRes.name;
        } catch (e) {
            console.error("[VitaminagG] TMDB lookup failed:", e.message);
        }
    }
    
    if (!targetTitle) {
        console.error("[VitaminagG] Missing title");
        return [];
    }
    title = targetTitle;

    // If host is provided, only try that one. Otherwise try main then anime.
    const hostsToTry = host ? [host] : ["vitaminagg.vip", "anime.vitaminagg.vip"];
    
    for (const siteHost of hostsToTry) {
        const siteBase = `https://${siteHost}`;
        const seriesPath = HOST_SERIES_PATH[siteHost] || "serie";

        console.log(`[VitaminagG] Resolving: ${title} (${mediaType})${mediaType === 'tv' ? ` S${season}E${episode}` : ''} [host: ${siteHost}]`);

        try {
            const targetSlug = slugify(title);
            let pageUrl = "";

            // Step 1: Search the site for the title
            const searchUrl = `${siteBase}/?s=${encodeURIComponent(title)}`;
            console.log(`[VitaminagG] Searching: ${searchUrl}`);

            let searchHtml = "";
            try {
                const searchRes = await fetch(searchUrl, { headers: { "User-Agent": UA } });
                if (searchRes.ok) searchHtml = await searchRes.text();
            } catch (err) {
                console.warn(`[VitaminagG] Search failed on ${siteHost}:`, err.message);
            }

            // Build regex to match the correct content-type path on this host
            const escapedHost = siteHost.replace(/\./g, "\\.");
            const linkPattern = mediaType === "movie"
                ? new RegExp(`href="(https?:\\/\\/${escapedHost}\\/movie\\/([^/"]+)\\/?)"`, "g")
                : new RegExp(`href="(https?:\\/\\/${escapedHost}\\/${seriesPath}\\/([^/"]+)\\/?)"`, "g");

            let match;
            let matchedUrl = null;
            if (searchHtml) {
                while ((match = linkPattern.exec(searchHtml)) !== null) {
                    const url = match[1];
                    const slug = match[2];
                    if (slug.includes(targetSlug) || targetSlug.includes(slug)) {
                        matchedUrl = url;
                        break;
                    }
                }
            }

            if (matchedUrl) {
                console.log(`[VitaminagG] Found matched page via search: ${matchedUrl}`);
                pageUrl = matchedUrl;
            } else {
                // Fallback to predicted URL
                pageUrl = mediaType === "movie"
                    ? `${siteBase}/movie/${targetSlug}/`
                    : `${siteBase}/${seriesPath}/${targetSlug}/`;
                console.log(`[VitaminagG] Fallback to predicted page: ${pageUrl}`);
            }

            // Step 2: For TV shows, resolve the episode page URL
            if (mediaType === "tv") {
                const seasonPadded = String(season).padStart(2, "0");
                const episodePadded = String(episode).padStart(2, "0");
                // Extract series slug from the matched page URL (handles /serie/ and /anime/)
                const seriesSlugMatch = pageUrl.match(new RegExp(`\\/${seriesPath}\\/([^/]+)\\/?`));
                const seriesSlug = seriesSlugMatch ? seriesSlugMatch[1] : targetSlug;
                pageUrl = `${siteBase}/episodes/${seriesSlug}-s${seasonPadded}x${episodePadded}/`;
                console.log(`[VitaminagG] Resolved episode page: ${pageUrl}`);
            }

            // Step 3: Fetch the content page
            console.log(`[VitaminagG] Fetching content page: ${pageUrl}`);
            const pageRes = await fetch(pageUrl, { headers: { "User-Agent": UA } });
            if (!pageRes.ok) {
                console.log(`[VitaminagG] Page request failed with status: ${pageRes.status} on ${siteHost}`);
                continue; // Try next host
            }
            const pageHtml = await pageRes.text();

            // Extract post ID
            const playerViewMatch = pageHtml.match(/class=["'][^"']*plyer__view[^"']*["']\s+data-post-id=["'](\d+)["']/i);
            if (!playerViewMatch) {
                console.log("[VitaminagG] Player view post ID not found in page HTML.");
                continue;
            }
            const postId = playerViewMatch[1];
            console.log(`[VitaminagG] Found player post ID: ${postId}`);

            // Use the page's own host for the wstrm-player request
            const pageHost = new URL(pageUrl).origin;
            const options = [...new Set(pageHtml.match(/opcion-\d+/g) || ['opcion-1'])];
            const streams = [];

            for (const opt of options) {
                const playerUrl = `${pageHost}/wstrm-player?id=${postId}&plyer-id=${opt}`;
                console.log(`[VitaminagG] Fetching player template page: ${playerUrl}`);
                const playerHtml = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": pageUrl } }).then(r => r.text());

                // Extract the video URL from data-src attribute (supports all backends: uns.bio, strp2p.site, rpmhub.site, upns.online, etc.)
                const srcMatch = playerHtml.match(/data-src=["']([^"']+)["']/);
                if (!srcMatch) {
                    console.log(`[VitaminagG] Could not find video source (data-src) in player template HTML for ${opt}.`);
                    continue;
                }

                const [videoBackendUrlRaw, videoHash] = srcMatch[1].split('#');
                if (!videoHash) {
                    console.log(`[VitaminagG] No video hash in data-src for ${opt}, treating as direct embed: ${videoBackendUrlRaw}`);
                    if (videoBackendUrlRaw.startsWith("http")) {
                        streams.push({
                            name: "VitaminagG",
                            title: `${title} \xB7 ${opt.replace('opcion', 'Opción')}`,
                            url: videoBackendUrlRaw,
                            quality: "1080p",
                            headers: {
                                "User-Agent": UA,
                                "Referer": pageUrl
                            }
                        });
                    }
                    continue;
                }

                const videoBackendUrl = videoBackendUrlRaw.replace(/\/$/, '');
                console.log(`[VitaminagG] Found video hash: ${videoHash} (backend: ${videoBackendUrl}) for ${opt}`);

                // Query the backend API
                const videoApiUrl = `${videoBackendUrl}/api/v1/video?id=${videoHash}&w=1920&h=1080&r=vitaminagg.vip`;
                console.log(`[VitaminagG] Querying API: ${videoApiUrl}`);
                const videoRes = await fetch(videoApiUrl, {
                    headers: {
                        "User-Agent": UA,
                        "Referer": `${videoBackendUrl}/`
                    }
                });
                if (!videoRes.ok) {
                    console.log(`[VitaminagG] API returned status: ${videoRes.status} for ${opt}`);
                    continue;
                }
                const encryptedText = await videoRes.text();
                const decryptedText = decrypt(encryptedText);
                if (!decryptedText) {
                    console.log(`[VitaminagG] Failed to decrypt API response for ${opt}.`);
                    continue;
                }

                try {
                    const videoData = JSON.parse(decryptedText);

                    // Extract direct source m3u8 stream
                    if (videoData.source) {
                        streams.push({
                            name: "VitaminagG",
                            title: `${videoData.title || title} \xB7 Directo`,
                            url: videoData.source,
                            quality: "1080p",
                            headers: {
                                "User-Agent": UA,
                                "Referer": `${videoBackendUrl}/`,
                                "Origin": videoBackendUrl
                            }
                        });
                    }

                    // Extract proxy cloudflare stream (cf)
                    if (videoData.cf) {
                        streams.push({
                            name: "VitaminagG",
                            title: `${videoData.title || title} \xB7 Cloudflare`,
                            url: videoData.cf,
                            quality: "1080p",
                            headers: {
                                "User-Agent": UA,
                                "Referer": `${videoBackendUrl}/`,
                                "Origin": videoBackendUrl
                            }
                        });
                    }
                } catch (e) {
                    console.log(`[VitaminagG] JSON parse error for ${opt}:`, e.message);
                }
            }

            if (streams.length > 0) {
                console.log(`[VitaminagG] Resolved ${streams.length} stream(s) on ${siteHost}`);
                return streams;
            }

        } catch (e) {
            console.error(`[VitaminagG] Error resolving on ${siteHost}:`, e.message);
        }
    }

    return [];
}

module.exports = { getStreams };
