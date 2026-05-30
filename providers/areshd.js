/**
 * AresHD Provider for Luvio
 * Resolves embed URLs from player.areshd.com into direct HLS/MP4 streams.
 *
 * Resolver implementations adapted from nuvio-providers-latino-v2.
 */

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://areshd.com";

// Chrome UA pool — matches reference providers
const UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];
const UA = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

// ─── Mirror domain lists (from reference nuvio-providers-latino-v2) ───────────

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

// ─── AresHD scraping ──────────────────────────────────────────────────────────

async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        console.log(`[AresHD] TMDB Error: ${e.message}`);
        return null;
    }
}

async function searchAres(query) {
    try {
        const url = `${BASE_URL}/search/${encodeURIComponent(query).replace(/%20/g, "+")}`;
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const matches = [];
        const regex = /<a class="Posters-link".*?href="([^"]+)".*?<img alt="([^"]+)"/gs;
        let m;
        while ((m = regex.exec(html)) !== null) {
            matches.push({
                url: m[1].startsWith("http") ? m[1] : `${BASE_URL}${m[1]}`,
                title: m[2].trim()
            });
        }
        return matches;
    } catch (e) {
        console.log(`[AresHD] Search Error: ${e.message}`);
        return [];
    }
}

/**
 * Extract and fully resolve all streams from an AresHD page.
 * Each data-tr points to player.areshd.com/player.php?h=... which contains
 * `var url = 'EMBED_URL'` — we resolve that embed to a direct m3u8/mp4.
 */
async function extractStreams(pageUrl) {
    try {
        const html = await fetch(pageUrl, { headers: HEADERS }).then(r => r.text());

        // Parse language tab headers
        const langMatches = [...html.matchAll(/<li class="pres"><a class="playr">([^<]+)<\/a><\/li>/g)];
        const languages = langMatches.map(m => {
            const l = m[1].toLowerCase();
            if (l.includes("latino")) return "Lat";
            if (l.includes("castellano") || l.includes("español")) return "Esp";
            if (l.includes("subtitulado") || l.includes("vose")) return "Vose";
            return "?";
        });

        // Parse server blocks per language
        const blockMatches = [...html.matchAll(/<ul class="TbVideoNv nav nav-tabs hide" role="tablist">(.*?)<\/ul>/gs)];
        const promises = [];

        blockMatches.forEach((block, index) => {
            const lang = languages[index] || "?";
            const serverMatches = [...block[1].matchAll(/<li class="pres" data-tr="([^"]+)".*?a class="playr">([^<]+)<\/a>/g)];

            serverMatches.forEach(m => {
                const aresPlayerUrl = m[1];
                const serverName    = m[2].trim();
                if (serverName.toLowerCase().includes("youtube")) return;

                const p = (async () => {
                    try {
                        // Step 1: fetch AresHD player page → extract real embed URL
                        const playerRes = await fetch(aresPlayerUrl, {
                            headers: { ...HEADERS, Referer: pageUrl }
                        });
                        const playerHtml = await playerRes.text();
                        const urlMatch = playerHtml.match(/var\s+url\s*=\s*'([^']+)'/i)
                                      || playerHtml.match(/var\s+url\s*=\s*"([^"]+)"/i);
                        if (!urlMatch) return null;

                        const embedUrl = urlMatch[1];

                        // Step 2: resolve embed → direct stream
                        const resolved = await resolveEmbed(embedUrl);
                        if (resolved?.url) {
                            return {
                                name: "AresHD",
                                title: `${serverName} (${lang})`,
                                url: resolved.url,
                                quality: resolved.quality || "HD",
                                headers: resolved.headers || { Referer: embedUrl }
                            };
                        }
                        console.log(`[AresHD] Unresolved: ${serverName} (${lang}) — ${embedUrl}`);
                    } catch (e) {
                        console.log(`[AresHD] Failed ${aresPlayerUrl}: ${e.message}`);
                    }
                    return null;
                })();

                promises.push(p);
            });
        });

        const settled = await Promise.all(promises);
        return settled.filter(Boolean);

    } catch (e) {
        console.log(`[AresHD] Extract Error: ${e.message}`);
        return [];
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function getStreams(id, type, season, episode) {
    console.log(`[AresHD] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    const results = await searchAres(info.title);
    if (results.length === 0) return [];

    const target = results[0];
    let url = target.url;

    if (type === "tv") {
        const name = url.match(/\/serie\/([^/]+)/)?.[1];
        if (name) {
            url = `${BASE_URL}/episodio/${name}-temporada-${season}-episodio-${episode}`;
        } else {
            const seriesHtml = await fetch(url, { headers: HEADERS }).then(r => r.text());
            const epRegex = new RegExp(`"slug":"([^"]*${season}-episodio-${episode}[^"]*)"`, "i");
            const epMatch = seriesHtml.match(epRegex);
            if (!epMatch) return [];
            url = `${BASE_URL}/episodio/${epMatch[1]}`;
        }
    }

    return await extractStreams(url);
}

module.exports = { getStreams };
