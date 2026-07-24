/**
 * vimeus - Built from src/vimeus/
 * Generated: 2026-05-15T01:21:31.380Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
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
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/vimeus/index.js
var vimeus_exports = {};
__export(vimeus_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(vimeus_exports);
var { resolveVoe: _resolveVoe, resolveStreamwish: _resolveStreamwish, resolveVidhide: _resolveVidhide, resolveFilemoon: _resolveFilemoon, resolveOkru: _resolveOkru } = require("./resolvers");

// src/vimeus/http.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var DEFAULT_HEADERS = {
  "User-Agent": UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Connection": "keep-alive"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, extraHeaders = {}, options = {}) {
    console.log(`[Vimeus/HTTP] GET ${url}`);
    const resp = yield fetch(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues(__spreadValues({}, DEFAULT_HEADERS), extraHeaders), options.headers || {})
    }));
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} for ${url}`);
    }
    return resp.text();
  });
}

// src/vimeus/resolvers.js
function b64toString(str) {
  try {
    if (typeof atob !== "undefined")
      return atob(str);
    return Buffer.from(str, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}
function unpackEval(packed, radix, symtab) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const unbase = (str) => {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
      const pos = chars.indexOf(str[i]);
      if (pos === -1)
        return NaN;
      result = result * radix + pos;
    }
    return result;
  };
  return packed.replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
    const idx = unbase(match);
    if (isNaN(idx) || idx >= symtab.length)
      return match;
    return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
  });
}
function resolveGoodstream(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[GoodStream] Resolving: ${embedUrl}`);
      const data = yield fetchText(embedUrl, { Referer: "https://vimeus.com/" });
      const evalMatch = data.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (evalMatch) {
        const unpacked = unpackEval(evalMatch[1], 36, ((_a = evalMatch[4]) == null ? void 0 : _a.split("|")) || []);
        const fileMatch2 = unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || unpacked.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
        if (fileMatch2) {
          const origin = new URL(embedUrl).origin;
          return { url: fileMatch2[1], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
        const m3u8InPacked = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8InPacked) {
          const origin = new URL(embedUrl).origin;
          return { url: m3u8InPacked[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
      }
      const fileMatch = data.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || data.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (fileMatch) {
        const origin = new URL(embedUrl).origin;
        return { url: fileMatch[1], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      const m3u8Match = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      if (m3u8Match) {
        const origin = new URL(embedUrl).origin;
        return { url: m3u8Match[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      return null;
    } catch (err) { return null; }
  });
}
function resolveVimeos(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[Vimeos] Resolving: ${embedUrl}`);
      const embedHost = ((_a = embedUrl.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : _a[1]) || "https://vimeos.net";
      const data = yield fetchText(embedUrl, { Referer: "https://vimeus.com/" });
      const evalRe = /eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\('([\s\S]+?)',\s*(\d+),\s*\d+,\s*'([\s\S]+?)'\.split\('\|'\)\)\)/;
      const evalMatch = data.match(evalRe);
      if (evalMatch) {
        const packed = evalMatch[1];
        const radix = parseInt(evalMatch[2], 10);
        const symbols = evalMatch[3].split("|");
        const unpacked = unpackEval(packed, radix, symbols);
        const sourceMatch = unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || unpacked.match(/["']file["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || unpacked.match(/sources\s*:\s*\[\s*\{[^}]*url\s*:\s*["']([^"']+)["']/i);
        if (sourceMatch) {
          const url = sourceMatch[1].startsWith("/") ? embedHost + sourceMatch[1] : sourceMatch[1];
          const origin = new URL(embedUrl).origin;
          return { url, quality: "1080p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
        const m3u8 = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8) {
          const origin = new URL(embedUrl).origin;
          return { url: m3u8[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
      }
      const fileMatch = data.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || data.match(/["']file["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || data.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (fileMatch) {
        const url = fileMatch[1].startsWith("/") ? embedHost + fileMatch[1] : fileMatch[1];
        const origin = new URL(embedUrl).origin;
        return { url, quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      const m3u8Match = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      if (m3u8Match) {
        const origin = new URL(embedUrl).origin;
        return { url: m3u8Match[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      return null;
    } catch (err) { return null; }
  });
}
function resolveVideo(embedUrl, serverName) {
  return __async(this, null, function* () {
    console.log(`[Resolver] Dispatching for ${serverName}: ${embedUrl}`);
    const u = embedUrl.toLowerCase();
    const s = serverName.toLowerCase();
    if (u.includes("voe.sx") || u.includes("voe") || s.includes("voe")) {
      return _resolveVoe(embedUrl);
    }
    if (u.includes("do7go.com") || u.includes("ds2play.com") || u.includes("vidhide") || s.includes("do7go") || s.includes("ds2play") || s.includes("vidhide")) {
      return _resolveVidhide(embedUrl);
    }
    if (u.includes("hlswish.com") || u.includes("flaswish.com") || u.includes("streamwish") || u.includes("sfastwish") || s.includes("streamwish") || s.includes("hlswish") || s.includes("flaswish") || s.includes("wish")) {
      return _resolveStreamwish(embedUrl);
    }
    if (u.includes("ok.ru") || s.includes("okru")) {
      return _resolveOkru(embedUrl);
    }
    if (u.includes("filemoon") || s.includes("filemoon")) {
      return _resolveFilemoon(embedUrl);
    }
    if (u.includes("goodstream.one") || s.includes("goodstream")) {
      return resolveGoodstream(embedUrl);
    }
    if (u.includes("vimeos.net") || s.includes("vimeos")) {
      return resolveVimeos(embedUrl);
    }
    console.log(`[Resolver] Sin resolver para ${serverName}`);
    return null;
  });
}

// src/vimeus/extractor.js
var VIEW_KEY = "ttapaNFkp2YbIFMawxmnqCPcs0pRVzbjrI5r1-da5M4";
function extractServerName(url) {
  if (!url)
    return "Unknown";
  if (url.includes("ok.ru"))
    return "Ok.ru";
  if (url.includes("filemoon.sx") || url.includes("filemoon"))
    return "FileMoon";
  if (url.includes("voe.sx") || url.includes("voe"))
    return "VOE";
  if (url.includes("streamtape.com"))
    return "StreamTape";
  if (url.includes("streamwish") || url.includes("sfastwish") || url.includes("hlswish"))
    return "StreamWish";
  if (url.includes("vidhide") || url.includes("vidhidepre"))
    return "VidHide";
  if (url.includes("mixdrop") || url.includes("mxdrop"))
    return "MixDrop";
  if (url.includes("ds2play.com") || url.includes("ds2play"))
    return "DS2Play";
  if (url.includes("do7go.com") || url.includes("do7go"))
    return "Do7Go";
  if (url.includes("flaswish.com") || url.includes("flaswish"))
    return "FlasWish";
  if (url.includes("vimeos.net"))
    return "Vimeos";
  if (url.includes("goodstream.one"))
    return "GoodStream";
  return "Unknown";
}
function extractStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    let embedUrl;
    if (mediaType === "movie") {
      embedUrl = `https://vimeus.com/e/movie?tmdb=${tmdbId}&view_key=${VIEW_KEY}`;
    } else {
      embedUrl = `https://vimeus.com/e/serie?tmdb=${tmdbId}&se=${season}&ep=${episode}&view_key=${VIEW_KEY}`;
    }
    console.log(`[Vimeus] Fetching embed URL: ${embedUrl}`);
    try {
      const resp = yield fetch(embedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://vimeus.com/"
        }
      });
      if (!resp.ok) {
        console.log(`[Vimeus] HTTP Error: ${resp.status}`);
        return [];
      }
      const html = yield resp.text();
      const match = html.match(/<script\s+type=["']text\/json["']\s+id=["']data["']>\s*(\{[\s\S]*?\})\s*<\/script>/i);
      if (!match) {
        console.log("[Vimeus] No data script found in HTML. Response starts with:", html.substring(0, 100));
        if (mediaType !== "movie") {
          const animeUrl = `https://vimeus.com/e/anime?tmdb=${tmdbId}&se=${season}&ep=${episode}&view_key=${VIEW_KEY}`;
          console.log(`[Vimeus] Retry with anime URL: ${animeUrl}`);
          const respAnime = yield fetch(animeUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://vimeus.com/"
            }
          });
          if (respAnime.ok) {
            const htmlAnime = yield respAnime.text();
            const matchAnime = htmlAnime.match(/<script\s+type=["']text\/json["']\s+id=["']data["']>\s*(\{[\s\S]*?\})\s*<\/script>/i);
            if (matchAnime) {
              return processJsonData(matchAnime[1]);
            }
          }
        }
        return [];
      }
      return yield processJsonData(match[1]);
    } catch (e) {
      console.error(`[Vimeus] Extraction error: ${e.message}`);
      return [];
    }
  });
}
function processJsonData(dataStr) {
  return __async(this, null, function* () {
    try {
      const data = JSON.parse(dataStr);
      const embeds = data.embeds || [];
      console.log(`[Vimeus] Found ${embeds.length} embeds`);
      const streams = [];
      for (const embed of embeds) {
        let serverUrl = embed.url;
        if (!serverUrl)
          continue;
        if (!serverUrl.startsWith("http")) {
          serverUrl = serverUrl.startsWith("//") ? "https:" + serverUrl : "https://" + serverUrl;
        }
        const internalServerName = embed.server || "Unknown";
        const guessedServerName = extractServerName(serverUrl);
        const serverName = guessedServerName !== "Unknown" ? guessedServerName : internalServerName;
        console.log(`[Vimeus] Resolving ${serverName}: ${serverUrl}`);
        try {
          const resolved = yield resolveVideo(serverUrl, serverName);
          if (resolved && resolved.url) {
            const langLabel = embed.lang ? `[${embed.lang}] ` : "";
            const qualityLabel = resolved.quality || embed.quality || "720p";
            streams.push({
              provider: "Vimeus",
              title: `${langLabel}[${serverName}] ${qualityLabel}`,
              url: resolved.url,
              quality: qualityLabel,
              headers: __spreadValues({
                "User-Agent": UA,
                "Referer": serverUrl
              }, resolved.headers)
            });
            console.log(`[Vimeus] \u2705 Resolved: ${serverName} -> ${resolved.url.substring(0, 60)}...`);
          } else {
            console.log(`[Vimeus] \u274C Could not resolve: ${serverName}`);
          }
        } catch (err) {
          console.log(`[Vimeus] \u274C Error resolving ${serverName}: ${err.message}`);
        }
      }
      console.log(`[Vimeus] Final streams: ${streams.length}`);
      return streams;
    } catch (e) {
      console.error(`[Vimeus] Error processing JSON data: ${e.message}`);
      return [];
    }
  });
}

// src/vimeus/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[Vimeus] Request: ${mediaType} ${tmdbId} S${season || 0}E${episode || 0}`);
      const streams = yield extractStreams(tmdbId, mediaType, season, episode);
      return streams;
    } catch (error) {
      console.error(`[Vimeus] Error: ${error.message}`);
      return [];
    }
  });
}
