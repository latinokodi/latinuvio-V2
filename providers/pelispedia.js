var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve6, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve6(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var extractor_exports = {};
__export(extractor_exports, {
  extractStreams: () => extractStreams
});
function fetchText(url, referer) {
  return __async(this, null, function* () {
    try {
      const res = yield import_axios.default.get(url, { headers: { "User-Agent": UA, "Referer": referer || "https://pelispedia.mov/" } });
      return yield res.text();
    } catch (e) {
      return "";
    }
  });
}
function extractStreams(url) {
  return __async(this, null, function* () {
    const html = yield fetchText(url);
    if (!html)
      return [];
    const $ = import_cheerio_without_node_native.default.load(html);
    const streams = [];
    const seenUrls = /* @__PURE__ */ new Set();
    $(".player-content iframe").each((i, el) => {
      let iframeUrl = $(el).attr("src");
      if (iframeUrl && !seenUrls.has(iframeUrl)) {
        seenUrls.add(iframeUrl);
        const serverName = $(`#server-option-${i} .title`).text().trim() || "Servidor";
        streams.push({
          servername: serverName,
          url: iframeUrl,
          language: "Latino",
          // Por defecto asumimos Latino por PelisPedia
          quality: "1080p",
          headers: { "User-Agent": UA, "Referer": url }
        });
      }
    });
    if (streams.length === 0) {
      const re = /<iframe[^>]+src="([^"]+)"/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        const iframeUrl = m[1];
        if (iframeUrl.includes("embed69") || iframeUrl.includes("xupalace")) {
          if (!seenUrls.has(iframeUrl)) {
            seenUrls.add(iframeUrl);
            streams.push({
              servername: iframeUrl.includes("embed69") ? "Embed69" : "Servidor",
              url: iframeUrl,
              language: "Latino",
              quality: "1080p"
            });
          }
        }
      }
    }
    console.log(`[Pelispedia Extractor v1.8.0] Found ${streams.length} potential streams.`);
    return streams;
  });
}
var import_axios, import_cheerio_without_node_native, UA;
var init_extractor = __esm({
  "src/pelispedia/extractor.js"() {
    import_axios = __toESM(require("axios"));
    import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  }
});
var import_axios7 = __toESM(require("axios"));
function normalizeTitle(t) {
  if (!t)
    return "";
  return t.toLowerCase().replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
init_extractor();
var import_axios2 = __toESM(require("axios"));
var UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function decodeBase64(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = String(input).replace(/=+$/, "");
  let output = "";
  for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function resolve(url) {
  return __async(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo Directo: ${url}`);
      const res = yield import_axios2.default.get(url, { headers: { "User-Agent": UA2 } });
      let html = yield res.text();
      if (html.includes("Redirecting") || html.length < 1500) {
        const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
        if (rm) {
          const res2 = yield import_axios2.default.get(rm[1], { headers: { "User-Agent": UA2 } });
          html = yield res2.text();
        }
      }
      const jsonMatch = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          let encText = Array.isArray(parsed) ? parsed[0] : parsed;
          if (typeof encText !== "string")
            return null;
          let rot13 = encText.replace(/[a-zA-Z]/g, (c) => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
          const noise = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
          for (const n of noise)
            rot13 = rot13.split(n).join("");
          let b64_1 = decodeBase64(rot13);
          let shifted = "";
          for (let i = 0; i < b64_1.length; i++)
            shifted += String.fromCharCode(b64_1.charCodeAt(i) - 3);
          let reversed = shifted.split("").reverse().join("");
          let data = JSON.parse(decodeBase64(reversed));
          if (data && data.source) {
            console.log(`[VOE] -> m3u8 encontrado: ${data.source.substring(0, 60)}...`);
            return {
              url: data.source,
              quality: "1080p",
              isM3U8: true,
              headers: { "User-Agent": UA2, "Referer": url }
            };
          }
        } catch (ex) {
          console.error("[VOE] Decryption failed:", ex.message);
        }
      }
      const m3u8Match = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
      if (m3u8Match) {
        return {
          url: m3u8Match[1],
          quality: "1080p",
          isM3U8: true,
          headers: { "User-Agent": UA2, "Referer": url }
        };
      }
      return null;
    } catch (e) {
      console.error(`[VOE] Error resolviedo: ${e.message}`);
      return null;
    }
  });
}
var import_axios3 = __toESM(require("axios"));
var import_crypto_js = __toESM(require("crypto-js"));
function decryptGCM(key, iv, ciphertextWithTag) {
  try {
    const tagSize = 16;
    const ciphertext = ciphertextWithTag.slice(0, -tagSize);
    const keyWA = import_crypto_js.default.lib.WordArray.create(key);
    const ivCounter = new Uint8Array(16);
    ivCounter.set(iv, 0);
    ivCounter[15] = 2;
    const ivWA = import_crypto_js.default.lib.WordArray.create(ivCounter);
    const decrypted = import_crypto_js.default.AES.decrypt(
      { ciphertext: import_crypto_js.default.lib.WordArray.create(ciphertext) },
      keyWA,
      {
        iv: ivWA,
        mode: import_crypto_js.default.mode.CTR,
        padding: import_crypto_js.default.pad.NoPadding
      }
    );
    return decrypted.toString(import_crypto_js.default.enc.Utf8);
  } catch (e) {
    console.error("[PureJS-GCM] Error Decrypting:", e.message);
    return null;
  }
}
var UA3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function base64UrlDecode(input) {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4)
    s += "=";
  if (typeof Buffer !== "undefined")
    return Buffer.from(s, "base64");
  const bin = atob(s);
  return new Uint8Array(bin.split("").map((c) => c.charCodeAt(0)));
}
function decryptByse(playback) {
  return __async(this, null, function* () {
    try {
      const keyArr = [];
      for (const p of playback.key_parts)
        base64UrlDecode(p).forEach((b) => keyArr.push(b));
      const key = new Uint8Array(keyArr);
      const iv = base64UrlDecode(playback.iv);
      const ciphertextWithTag = base64UrlDecode(playback.payload);
      if (typeof crypto !== "undefined" && crypto.subtle) {
        try {
          const cryptoKey = yield crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
          const decryptedArr = yield crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertextWithTag);
          return JSON.parse(new TextDecoder().decode(decryptedArr));
        } catch (e) {
        }
      }
      const decryptedStr = decryptGCM(key, iv, ciphertextWithTag);
      return decryptedStr ? JSON.parse(decryptedStr) : null;
    } catch (e) {
      return null;
    }
  });
}
function resolve2(url) {
  return __async(this, null, function* () {
    try {
      const origin = new URL(url).origin;
      const idMatch = url.match(/\/e\/([a-zA-Z0-9]+)/);
      if (!idMatch)
        return null;
      const id = idMatch[1];
      try {
        const apiRes = yield import_axios3.default.get(`https://${new URL(url).hostname}/api/videos/${id}`, {
          headers: { "User-Agent": UA3, "Referer": url }
        });
        const data = yield apiRes.data;
        if (data.playback) {
          const decrypted = yield decryptByse(data.playback);
          if (decrypted && decrypted.sources) {
            const best = decrypted.sources[0];
            return { url: best.url, quality: best.height ? `${best.height}p` : "1080p", isM3U8: true, headers: { "User-Agent": UA3, "Referer": origin + "/", "Origin": origin } };
          }
        }
      } catch (e) {
      }
      const res = yield import_axios3.default.get(url, { headers: { "User-Agent": UA3, "Referer": url } });
      const html = yield res.text();
      const fm = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/);
      if (fm)
        return { url: fm[1], quality: "1080p", isM3U8: true, headers: { "User-Agent": UA3, "Referer": origin + "/", "Origin": origin } };
      return null;
    } catch (e) {
      return null;
    }
  });
}
var import_axios4 = __toESM(require("axios"));
var UA4 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function unpack(p, a, c, k, e, d) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const decode = (r) => {
    let res = 0;
    for (let l = 0; l < r.length; l++) {
      let s = chars.indexOf(r[l]);
      if (s === -1)
        return NaN;
      res = res * a + s;
    }
    return res;
  };
  return p.replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
    let val = decode(match);
    return isNaN(val) || val >= k.length ? match : k[val] || match;
  });
}
var DOMAIN_MAP = { "hglink.to": "vibuxer.com" };
function resolve3(url) {
  return __async(this, null, function* () {
    try {
      let targetUrl = url;
      for (const [old, replacement] of Object.entries(DOMAIN_MAP)) {
        if (targetUrl.includes(old)) {
          targetUrl = targetUrl.replace(old, replacement);
          break;
        }
      }
      const origin = new URL(targetUrl).origin;
      const res = yield import_axios4.default.get(targetUrl, {
        headers: { "User-Agent": UA4, "Referer": origin + "/", "Origin": origin }
      });
      const html = yield res.text();
      let finalUrl = null;
      const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
      if (fileMatch) {
        finalUrl = fileMatch[1];
        if (finalUrl.startsWith("/"))
          finalUrl = origin + finalUrl;
      }
      if (!finalUrl) {
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
        if (packedMatch) {
          const unpacked = unpack(packedMatch[1], parseInt(packedMatch[2]), parseInt(packedMatch[3]), packedMatch[4].split("|"));
          const m3u8Match = unpacked.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
          if (m3u8Match) {
            finalUrl = m3u8Match[1];
            if (finalUrl.startsWith("/"))
              finalUrl = origin + finalUrl;
          }
        }
      }
      if (finalUrl) {
        return { url: finalUrl, quality: "1080p", headers: { "User-Agent": UA4, "Referer": origin + "/" } };
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
var import_axios5 = __toESM(require("axios"));
var UA5 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function unpackVidHide(script) {
  try {
    const match = script.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
    if (!match)
      return null;
    let [full, p, a, c, k] = match;
    a = parseInt(a);
    c = parseInt(c);
    k = k.split("|");
    const decode = (l, s) => {
      const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
      let res = "";
      for (; l > 0; ) {
        res = chars[l % s] + res;
        l = Math.floor(l / s);
      }
      return res || "0";
    };
    const unpacked = p.replace(/\b\w+\b/g, (l) => {
      const s = parseInt(l, 36);
      return s < k.length && k[s] ? k[s] : decode(s, a);
    });
    return unpacked;
  } catch (e) {
    return null;
  }
}
function resolve4(url) {
  return __async(this, null, function* () {
    try {
      const origin = new URL(url).origin;
      const res = yield import_axios5.default.get(url, {
        headers: { "User-Agent": UA5, "Referer": origin + "/" }
      });
      const html = yield res.text();
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!packedMatch)
        return null;
      const unpacked = unpackVidHide(packedMatch[0]);
      if (!unpacked)
        return null;
      const hlsMatch = unpacked.match(/"hls[24]"\s*:\s*"([^"]+)"/);
      if (!hlsMatch)
        return null;
      let finalUrl = hlsMatch[1];
      if (!finalUrl.startsWith("http"))
        finalUrl = origin + finalUrl;
      return {
        url: finalUrl,
        quality: "1080p",
        headers: { "User-Agent": UA5, "Referer": origin + "/", "Origin": origin }
      };
    } catch (e) {
      return null;
    }
  });
}
var import_axios6 = __toESM(require("axios"));
var UA6 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function resolve5(url) {
  return __async(this, null, function* () {
    try {
      console.log(`[Uqload] Fetching: ${url}`);
      const res = yield import_axios6.default.get(url, {
        headers: {
          "User-Agent": UA6,
          "Referer": "https://xupalace.org/"
          // CABECERA CRÍTICA
        }
      });
      const html = yield res.text();
      console.log(`[Uqload] HTML Length: ${html.length}`);
      if (html.length < 100 && (html.includes("restricted") || html.includes("domain"))) {
        console.log(`[Uqload] Error de restricci\xF3n de dominio detectado.`);
        const res2 = yield import_axios6.default.get(url, {
          headers: { "User-Agent": UA6, "Referer": "https://pelispedia.mov/" }
        });
        const html2 = yield res2.text();
        if (html2.length > 500)
          return parseHtml(html2, url);
        return null;
      }
      return parseHtml(html, url);
    } catch (e) {
      console.error("[Uqload Resolver] Error:", e.message);
    }
    return null;
  });
}
function parseHtml(html, url) {
  const videoMatch = html.match(/sources:\s*\[\s*["']([^"']+)["']/i) || html.match(/sources:\s*\[\s*\{\s*src:\s*["']([^"']+)["']/i) || html.match(/src:\s*["']([^"']+)["']/i) || html.match(/["'](https?:\/\/[^"']+\.(mp4|m3u8)[^"']*)["']/i);
  if (videoMatch) {
    const videoUrl = videoMatch[1].startsWith("//") ? "https:" + videoMatch[1] : videoMatch[1];
    console.log(`[Uqload] Enlace encontrado: ${videoUrl}`);
    return {
      url: videoUrl,
      quality: "HD",
      name: "Uqload",
      headers: {
        "User-Agent": UA6,
        "Referer": url
      }
    };
  }
  return null;
}
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
var BASE = "https://pelispedia.mov";
var UA7 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var RESOLVER_MAP = {
  "voe.sx": resolve,
  "voe.un": resolve,
  "hglink.to": resolve3,
  "streamwish.com": resolve3,
  "streamwish.to": resolve3,
  "wishembed.online": resolve3,
  "filelions.com": resolve3,
  "bysedikamoum.com": resolve2,
  "filemoon.sx": resolve2,
  "filemoon.to": resolve2,
  "moonembed.pro": resolve2,
  "dintezuvio.com": resolve4,
  "vidhide.com": resolve4,
  "vidhide.pro": resolve4,
  "vidhide.bz": resolve4,
  "vidhide.stream": resolve4,
  "vidhide.vip": resolve4,
  "vidhide.to": resolve4,
  "uqload.to": resolve5,
  "uqload.com": resolve5,
  "uqload.io": resolve5,
  "uqload.is": resolve5,
  "uqload.cc": resolve5,
  "minochinos.com": resolve4,
  "audinifer.com": resolve3,
  "pstream.org": resolve3,
  "embed69.org": resolveEmbed69
};
var SERVER_LABELS = {
  "voe": "VOE",
  "hglink": "StreamWish",
  "streamwish": "StreamWish",
  "hanerix": "StreamWish",
  "wishembed": "StreamWish",
  "filelions": "StreamWish",
  "bysedikamoum": "Filemoon",
  "filemoon": "Filemoon",
  "moonembed": "Filemoon",
  "minochinos": "VidHide",
  "dintezuvio": "VidHide",
  "vidhide": "VidHide",
  "uqload": "Uqload"
};
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2)
      return null;
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    payload += "=".repeat((4 - payload.length % 4) % 4);
    const decoded = typeof atob !== "undefined" ? atob(payload) : Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}
function fetchText2(url) {
  return __async(this, null, function* () {
    try {
      const res = yield import_axios7.default.get(url, { headers: { "User-Agent": UA7, "Referer": "https://pelispedia.mov/" } });
      return yield res.text();
    } catch (e) {
      return "";
    }
  });
}
function resolveEmbed69(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText2(embedUrl);
      const jwtRegex = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
      const matches = html.match(jwtRegex) || [];
      const uniqueTokens = [...new Set(matches)];
      const results = [];
      for (const token of uniqueTokens) {
        if (token.length < 50)
          continue;
        const payload = decodeJwtPayload(token);
        if (payload && payload.link) {
          for (const [pattern, resolver] of Object.entries(RESOLVER_MAP)) {
            if (payload.link.includes(pattern) && pattern !== "embed69.org") {
              const r = yield resolver(payload.link);
              if (r && r.url) {
                const rawName = pattern.split(".")[0];
                results.push(__spreadProps(__spreadValues({}, r), {
                  servername: SERVER_LABELS[rawName] || rawName
                }));
                break;
              }
            }
          }
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode, title) {
  return __async(this, null, function* () {
    try {
      const url = `https://pelispedia.mov/search?s=${normalizeTitle(title).replace(/\s+/g, "+")}`;
      const html = yield fetchText2(url);
      const re = /href="(https:\/\/pelispedia\.mov\/(pelicula|serie)\/([^"]+))"/gi;
      const matches = [];
      let m;
      while ((m = re.exec(html)) !== null)
        matches.push({ url: m[1], type: m[2], slug: m[3] });
      if (matches.length === 0)
        return [];
      const best = matches[0];
      let targetUrl = best.url;
      if (best.type === "serie")
        targetUrl = `${BASE}/serie/${best.slug}/temporada/${season || 1}/capitulo/${episode || 1}`;
      const { extractStreams: extractStreams2 } = yield Promise.resolve().then(() => (init_extractor(), extractor_exports));
      const rawEmbeds = yield extractStreams2(targetUrl);
      const streams = [];
      for (const embed of rawEmbeds) {
        let currentUrl = embed.url;
        let resolved = null;
        for (const [pattern, resolver] of Object.entries(RESOLVER_MAP)) {
          if (currentUrl.includes(pattern)) {
            resolved = yield pattern === "embed69.org" ? resolveEmbed69(currentUrl) : resolver(currentUrl);
            break;
          }
        }
        if (resolved) {
          const results = Array.isArray(resolved) ? resolved : [resolved];
          results.forEach((r) => {
            if (r.url) {
              streams.push({
                name: "Pelispedia",
                title: `${r.quality || "1080p"} \xC2\xB7 Latino \xC2\xB7 ${r.servername || embed.servername || "Server"}`,
                url: r.url,
                headers: r.headers || { "User-Agent": UA7, "Referer": currentUrl }
              });
            }
          });
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
