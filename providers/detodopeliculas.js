var V = Object.create;
var v = Object.defineProperty;
var F = Object.getOwnPropertyDescriptor;
var G = Object.getOwnPropertyNames, T = Object.getOwnPropertySymbols, H = Object.getPrototypeOf, b = Object.prototype.hasOwnProperty, q = Object.prototype.propertyIsEnumerable;
var L = (t, e, o) => e in t ? v(t, e, { enumerable: true, configurable: true, writable: true, value: o }) : t[e] = o, y = (t, e) => {
  for (var o in e || (e = {}))
    b.call(e, o) && L(t, o, e[o]);
  if (T)
    for (var o of T(e))
      q.call(e, o) && L(t, o, e[o]);
  return t;
};
var z = (t, e) => {
  for (var o in e)
    v(t, o, { get: e[o], enumerable: true });
}, k = (t, e, o, r) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let s of G(e))
      !b.call(t, s) && s !== o && v(t, s, { get: () => e[s], enumerable: !(r = F(e, s)) || r.enumerable });
  return t;
};
var j = (t, e, o) => (o = t != null ? V(H(t)) : {}, k(e || !t || !t.__esModule ? v(o, "default", { value: t, enumerable: true }) : o, t)), K = (t) => k(v({}, "__esModule", { value: true }), t);
var g = (t, e, o) => new Promise((r, s) => {
  var i = (c) => {
    try {
      l(o.next(c));
    } catch (n) {
      s(n);
    }
  }, a = (c) => {
    try {
      l(o.throw(c));
    } catch (n) {
      s(n);
    }
  }, l = (c) => c.done ? r(c.value) : Promise.resolve(c.value).then(i, a);
  l((o = o.apply(t, e)).next());
});
var pe = {};
z(pe, { getStreams: () => de });
module.exports = K(pe);
const cheerio = require("cheerio");
var Y = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function J(t, e) {
  return t >= 3840 || e >= 2160 ? "4K" : t >= 1920 || e >= 1080 ? "1080p" : t >= 1280 || e >= 720 ? "720p" : t >= 854 || e >= 480 ? "480p" : "360p";
}
function E(o) {
  return g(this, arguments, function* (t, e = {}) {
    try {
      let s = yield (yield fetch(t, { headers: y({ "User-Agent": Y }, e), redirect: "follow" })).text();
      if (!s.includes("#EXT-X-STREAM-INF")) {
        let c = t.match(/[_-](\d{3,4})p/);
        return c ? `${c[1]}p` : "1080p";
      }
      let i = 0, a = 0, l = s.split(`
`);
      for (let c of l) {
        let n = c.match(/RESOLUTION=(\d+)x(\d+)/);
        if (n) {
          let u = parseInt(n[1]), f = parseInt(n[2]);
          f > a && (a = f, i = u);
        }
      }
      return a > 0 ? J(i, a) : "1080p";
    } catch (r) {
      return "1080p";
    }
  });
}
var Q = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function U(t) {
  try {
    return typeof atob != "undefined" ? atob(t) : Buffer.from(t, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}
function X(t, e) {
  try {
    let r = e.replace(/^\[|\]$/g, "").split("','").map((n) => n.replace(/^'+|'+$/g, "")).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s = "";
    for (let n of t) {
      let u = n.charCodeAt(0);
      u > 64 && u < 91 ? u = (u - 52) % 26 + 65 : u > 96 && u < 123 && (u = (u - 84) % 26 + 97), s += String.fromCharCode(u);
    }
    for (let n of r)
      s = s.replace(new RegExp(n, "g"), "_");
    s = s.split("_").join("");
    let i = U(s);
    if (!i)
      return null;
    let a = "";
    for (let n = 0; n < i.length; n++)
      a += String.fromCharCode((i.charCodeAt(n) - 3 + 256) % 256);
    let l = a.split("").reverse().join(""), c = U(l);
    return c ? JSON.parse(c) : null;
  } catch (o) {
    return console.log("[VOE] voeDecode error:", o.message), null;
  }
}
function S(o) {
  return g(this, arguments, function* (t, e = {}) {
    return yield fetch(t, { method: "GET", headers: y({ "User-Agent": Q, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, e), redirect: "follow" });
  });
}
function P(t) {
  return g(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${t}`);
      let e = yield S(t, { Referer: t });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let o = yield e.text();
      if (/permanentToken/i.test(o)) {
        let c = o.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (c) {
          console.log(`[VOE] Permanent token redirect -> ${c[1]}`);
          let n = yield S(c[1], { Referer: t });
          n.ok && (o = yield n.text());
        }
      }
      let r = o.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (r) {
        let c = r[1], n = r[2].startsWith("http") ? r[2] : new URL(r[2], t).href;
        console.log(`[VOE] Found encoded array + loader: ${n}`);
        let u = yield S(n, { Referer: t }), f = u.ok ? yield u.text() : "", d = f.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || f.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (d) {
          let p = X(c, d[1]);
          if (p && (p.source || p.direct_access_url)) {
            let h = p.source || p.direct_access_url, $ = yield E(h, { Referer: t });
            return console.log(`[VOE] URL encontrada: ${h.substring(0, 80)}...`), { url: h, quality: $, headers: { Referer: t } };
          }
        }
      }
      let s = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, i = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, a = [], l;
      for (; (l = s.exec(o)) !== null; )
        a.push(l);
      for (; (l = i.exec(o)) !== null; )
        a.push(l);
      for (let c of a) {
        let n = c[1];
        if (!n)
          continue;
        let u = n;
        if (u.startsWith("aHR0"))
          try {
            u = atob(u);
          } catch (f) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${u.substring(0, 80)}...`), { url: u, quality: yield E(u, { Referer: t }), headers: { Referer: t } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (e) {
      return console.log(`[VOE] Error: ${e.message}`), null;
    }
  });
}
var C = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function O(t) {
  return g(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": C, Accept: "text/html", Referer: "https://ok.ru/" }, redirect: "follow" }).then((n) => n.text());
      if (e.includes("copyrightsRestricted") || e.includes("COPYRIGHTS_RESTRICTED") || e.includes("LIMITED_ACCESS") || e.includes("notFound") || !e.includes("urls"))
        return console.log("[OkRu] Video no disponible o eliminado"), null;
      let r = [...e.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "").matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)], s = ["full", "hd", "sd", "low", "lowest"], i = r.map((n) => ({ type: n[1], url: n[2] })).filter((n) => !n.type.toLowerCase().includes("mobile") && n.url.startsWith("http"));
      if (i.length === 0)
        return console.log("[OkRu] No se encontraron URLs"), null;
      let l = i.sort((n, u) => {
        let f = s.findIndex((p) => n.type.toLowerCase().includes(p)), d = s.findIndex((p) => u.type.toLowerCase().includes(p));
        return (f === -1 ? 99 : f) - (d === -1 ? 99 : d);
      })[0];
      console.log(`[OkRu] URL encontrada (${l.type}): ${l.url.substring(0, 80)}...`);
      let c = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return { url: l.url, quality: c[l.type] || l.type, headers: { "User-Agent": C, Referer: "https://ok.ru/" } };
    } catch (e) {
      return console.log(`[OkRu] Error: ${e.message}`), null;
    }
  });
}
var m = j(require("crypto-js"));
var R = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36", D = m.default.enc.Hex.parse("6b69656d7469656e6d75613931316361"), _ = m.default.enc.Hex.parse("313233343536373839306f6975797472");
function Z(t) {
  return m.default.AES.encrypt(JSON.stringify(t), D, { iv: _, mode: m.default.mode.CBC, padding: m.default.pad.Pkcs7 }).ciphertext.toString(m.default.enc.Hex);
}
function ee(t) {
  let e = m.default.lib.CipherParams.create({ ciphertext: m.default.enc.Hex.parse(t) }), o = m.default.AES.decrypt(e, D, { iv: _, mode: m.default.mode.CBC, padding: m.default.pad.Pkcs7 });
  return JSON.parse(o.toString(m.default.enc.Utf8));
}
function I(t) {
  return g(this, null, function* () {
    try {
      let e = t.includes("/") ? t.split("/").pop().replace("#", "") : t, o = "https://gdtvid.p2pplay.pro";
      console.log(`[Gdtvid] Resolviendo: ${e}`);
      let s = (yield fetch(`${o}/api/v1/info?id=${e}`, { headers: { "User-Agent": R, Referer: "https://gdtvid.p2pplay.pro/" } })).headers.get("set-cookie"), i = { sessionId: "p2pplay_test_session", userId: "null", playerId: "jw8", videoId: e, country: "US", platform: "web", browser: "chrome", os: "windows", timestamp: Date.now() }, a = Z(i);
      yield fetch(`${o}/api/v1/player?t=${a}`, { headers: { "User-Agent": R, Referer: "https://gdtvid.p2pplay.pro/", Cookie: s || "" } });
      let c = yield (yield fetch(`${o}/api/v1/video?id=${e}&w=1536&h=864&r=null`, { headers: { "User-Agent": R, Referer: "https://gdtvid.p2pplay.pro/", Cookie: s || "" } })).text(), n = ee(c.trim());
      if (!n.source)
        throw new Error("No se encontr\xF3 el campo source en la respuesta");
      return console.log(`[Gdtvid] URL encontrada: ${n.source.substring(0, 80)}...`), { url: n.source, headers: { "User-Agent": R, Referer: "https://gdtvid.p2pplay.pro/" } };
    } catch (e) {
      return console.log(`[Gdtvid] Error: ${e.message}`), null;
    }
  });
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
                        headers: { "Referer": mirror, "User-Agent": B }
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
                            headers: { "User-Agent": B, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" }
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
            headers: { "Referer": result.mirror, "Origin": new URL(result.mirror).origin, "User-Agent": B }
        };
    } catch (e) {
        return null;
    }
}

async function resolveVidhide(embedUrl) {
    try {
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": B, "Referer": `${origin}/` }
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
            headers: { "User-Agent": B, "Referer": `${origin}/`, "Origin": origin, "X-Requested-With": "XMLHttpRequest" }
        };
    } catch (e) {
        return null;
    }
}

function aesGcmDecrypt(playback) {
    try {
        const CryptoJS = m.default;
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
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": embedUrl, "User-Agent": B }
        });
        if (!detailsRes.ok) throw new Error(`details HTTP ${detailsRes.status}`);
        const details = await detailsRes.json();
        const frameUrl = details.embed_frame_url;
        if (!frameUrl) throw new Error("No embed_frame_url");
        const playbackDomain = new URL(frameUrl).origin;
        const challengeRes = await fetch(`${playbackDomain}/api/videos/access/challenge`, {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": B }
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
            client: { user_agent: B, platform: "Windows", languages: ["es-ES"] },
            storage: { cookie: viewerId, local_storage: viewerId },
            attributes: { entropy: "high" }
        };
        const attestRes = await fetch(`${playbackDomain}/api/videos/access/attest`, {
            method: "POST",
            body: JSON.stringify(attestPayload),
            headers: {
                "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest",
                "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": B
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
                "X-Embed-Parent": embedUrl, "User-Agent": B
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
                        headers: { "User-Agent": B, "Referer": playbackDomain, "Origin": playbackDomain }
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
            headers: { "User-Agent": B, "Referer": "https://lamovie.cc/" }
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
            headers: { "User-Agent": B, "Referer": url }
        });
        if (!passRes.ok) throw new Error(`pass_md5 HTTP ${passRes.status}`);
        const base = (await passRes.text()).trim();
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let rand = "";
        for (let i = 0; i < 10; i++) rand += chars[Math.floor(Math.random() * chars.length)];
        return {
            url: `${base}${rand}?token=${token}&expiry=${Date.now()}`,
            quality: "720p",
            headers: { "User-Agent": B, "Referer": `${domain}/` }
        };
    } catch (e) {
        return null;
    }
}

async function resolveStreamtape(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": B, "Referer": "https://streamtape.com/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const linkMatch = html.match(/innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*(?:["'][^"']*["']\s*\+\s*)?["']([^"']+)["']/i);
        if (linkMatch) {
            return {
                url: `https:${linkMatch[1]}${linkMatch[2]}`,
                quality: "720p",
                headers: { "User-Agent": B, "Referer": "https://streamtape.com/" }
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
            headers: { "User-Agent": B, "Referer": "https://detodopeliculas.nu/" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const m3 = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
        if (m3) return { url: m3[0], quality: "720p", headers: { "User-Agent": B, "Referer": eUrl } };
        const file = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (file) return { url: file[1], quality: "720p", headers: { "User-Agent": B, "Referer": eUrl } };
    } catch (e) {
    }
    return null;
}

var te = "439c478a771f35c05022f9feabcca01c", B = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", W = { "User-Agent": B, Accept: "text/html,application/json" }, oe = "https://detodopeliculas.nu", re = ["LAT", "ESP", "SUB"], A = { LAT: "Latino", ESP: "Castellano", SUB: "Subtitulado" };

function x(o) {
  return g(this, arguments, function* (t, e = {}) {
    let r = yield fetch(t, { headers: y(y({}, W), e.headers), method: e.method || "GET", redirect: "follow" });
    if (!r.ok)
      throw new Error(`HTTP ${r.status}`);
    return (r.headers.get("content-type") || "").includes("json") ? r.json() : r.text();
  });
}
function M(t, e = null) {
  let o = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return e ? `${o}-${e}` : o;
}
function ce(t) {
  if (isMirror(t, "STREAMWISH")) return { resolver: resolveStreamwish, serverName: "StreamWish" };
  if (isMirror(t, "VIDHIDE")) return { resolver: resolveVidhide, serverName: "VidHide" };
  if (isMirror(t, "FILEMOON")) return { resolver: resolveFilemoon, serverName: "FileMoon" };
  if (isMirror(t, "VOE")) return { resolver: P, serverName: "VOE" };
  if (isMirror(t, "DOODSTREAM")) return { resolver: resolveDoodstream, serverName: "DoodStream" };
  if (isMirror(t, "STREAMTAPE")) return { resolver: resolveStreamtape, serverName: "StreamTape" };
  const u = t.toLowerCase();
  if (u.includes("waaw.to") || u.includes("netu.tv")) return { resolver: resolveWaaw, serverName: "Waaw" };
  if (u.includes("ok.ru")) return { resolver: O, serverName: "OkRu" };
  if (u.includes("gdtvid")) return { resolver: I, serverName: "GDTvid" };
  return { resolver: null, serverName: "Desconocido" };
}
function le(t, e) {
  return g(this, null, function* () {
    let o = [{ lang: "es-MX" }, { lang: "es-ES" }, { lang: "en-US" }], r = /* @__PURE__ */ new Set(), s = "";
    for (let { lang: i } of o)
      try {
        let a = yield x(`https://api.themoviedb.org/3/${e}/${t}?api_key=${te}&language=${i}`), l = e === "movie" ? a.title : a.name, c = e === "movie" ? a.original_title : a.original_name;
        s || (s = (a.release_date || a.first_air_date || "").substring(0, 4)), l && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(l) && r.add(l), c && r.add(c);
      } catch (a) {
      }
    return r.size > 0 ? { titles: Array.from(r), year: s } : null;
  });
}
function ae(t, e) {
  return g(this, null, function* () {
    let o = e === "movie" ? "pelicula" : "serie", r = /* @__PURE__ */ new Set();
    for (let s of t.titles)
      r.add(M(s, t.year)), r.add(M(s));
    for (let s of r) {
      let i = `${oe}/${o}/${s}/`;
      try {
        if ((yield fetch(i, { headers: W, redirect: "follow" })).ok)
          return console.log(`[DeTodoPeliculas] \u2713 P\xE1gina encontrada: ${i}`), i;
      } catch (a) {
        continue;
      }
    }
    return null;
  });
}
function ie(t, e, o) {
  return g(this, null, function* () {
    try {
      let s = (yield x(`${t}?ep_season=${e}`)).split(/<article|<li|<div class=["']episodios/i);
      for (let i of s)
        if (i.includes(`>${e} - ${o}<`) || i.includes(`>${e}x${o}<`)) {
          let a = i.match(/href=["'](https:\/\/detodopeliculas\.nu\/episodio\/[^"']+)["']/i);
          if (a)
            return a[1];
        }
    } catch (r) {
      return null;
    }
    return null;
  });
}
function ue(t) {
  return g(this, null, function* () {
    let e = yield x(t);
    const $ = cheerio.load(e);
    const options = [];
    $(".dooplay_player_option").each((i, el) => {
      const dataPost = $(el).attr("data-post");
      const dataNume = $(el).attr("data-nume");
      const dataType = $(el).attr("data-type");
      if (dataPost && dataNume && dataType) {
        let htmlContent = $(el).html().toLowerCase();
        let lang = "LAT";
        if (htmlContent.includes("lat.png") || htmlContent.includes("latino") || htmlContent.includes("mx.png")) {
          lang = "LAT";
        } else if (htmlContent.includes("es.png") || htmlContent.includes("cas.png") || htmlContent.includes("castellano") || htmlContent.includes("español")) {
          lang = "ESP";
        } else if (htmlContent.includes("sub.png") || htmlContent.includes("vose") || htmlContent.includes("subtitulado")) {
          lang = "SUB";
        }
        options.push({ dataPost, dataNume, dataType, lang });
      }
    });

    const s = { LAT: [], ESP: [], SUB: [] };
    const ajaxUrl = `${oe}/wp-admin/admin-ajax.php`;
    
    const promises = options.map(opt => g(this, null, function* () {
      try {
        const payload = new URLSearchParams({
          action: "doo_player_ajax",
          post: opt.dataPost,
          nume: opt.dataNume,
          type: opt.dataType
        }).toString();
        
        const res = yield fetch(ajaxUrl, {
          method: "POST",
          headers: {
            "User-Agent": B,
            "Referer": t,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: payload
        });
        
        if (!res.ok) return;
        const data = yield res.json();
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
            s[opt.lang].push(embedUrl);
          }
        }
      } catch (err) {
        console.log(`[DeTodoPeliculas] Error fetching AJAX option:`, err.message);
      }
    }));
    
    yield Promise.all(promises);
    return s;
  });
}
function de(t, e, o, r) {
  return g(this, null, function* () {
    if (!t || !e)
      return [];
    let s = Date.now();
    console.log(`[DeTodoPeliculas] Buscando: TMDB ${t} (${e})${o ? ` S${o}E${r}` : ""}`);
    try {
      let i = yield le(t, e);
      if (!i)
        return [];
      let a = yield ae(i, e);
      if (!a)
        return [];
      let l = a;
      if (e === "tv" && o && r && (l = yield ie(a, o, r), !l))
        return [];
      let c = yield ue(l);
      for (let n of re) {
        let u = c[n];
        if (!u || u.length === 0)
          continue;
        console.log(`[DeTodoPeliculas] Resolviendo ${u.length} embeds en ${A[n]}...`);
        let f = u.map((h) => g(this, null, function* () {
          let { resolver: $, serverName: N } = ce(h);
          if (!$)
            return console.log(`[DeTodoPeliculas] \u26A0\uFE0F Falta resolver para: ${h}`), null;
          try {
            let w = yield $(h);
            return w ? { name: "DeTodoPeliculas", title: `${w.quality || "1080p"} \xB7 ${A[n]} \xB7 ${N}`, url: w.url, quality: w.quality || "1080p", headers: w.headers || { "User-Agent": B, Referer: l } } : null;
          } catch (w) {
            return null;
          }
        })), p = (yield Promise.allSettled(f)).filter((h) => h.status === "fulfilled" && h.value !== null).map((h) => h.value);
        if (p.length > 0) {
          let h = ((Date.now() - s) / 1e3).toFixed(2);
          return console.log(`[DeTodoPeliculas] \u2713 ${p.length} streams encontrados en ${A[n]} (${h}s), omitiendo otros idiomas.`), p;
        } else
          console.log(`[DeTodoPeliculas] Sin streams exitosos en ${A[n]}, intentando siguiente idioma...`);
      }
      return console.log("[DeTodoPeliculas] Agotada la b\xFAsqueda en todos los idiomas sin \xE9xito."), [];
    } catch (i) {
      return console.log(`[DeTodoPeliculas] Error Cr\xEDtico: ${i.message}`), [];
    }
  });
}
