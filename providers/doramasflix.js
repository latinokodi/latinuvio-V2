/**
 * doramasflix - Built from src/doramasflix/
 * Generated: 2026-05-15T01:21:31.358Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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

// src/doramasflix/http.js
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1"
};
var API_HEADERS = {
  "content-type": "application/json",
  "user-agent": HEADERS["User-Agent"]
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    console.log(`[DoramasFlix] Fetching: ${url}`);
    const response = yield fetch(url, __spreadValues({
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers)
    }, options));
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} for ${url}`);
    }
    return yield response.text();
  });
}

// src/doramasflix/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/doramasflix/resolvers.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function b64toString(str) {
  try {
    if (typeof atob !== "undefined")
      return atob(str);
    return Buffer.from(str, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}
function voeDecode(ct, luts) {
  try {
    const rawLuts = luts.replace(/^\[|\]$/g, "").split("','").map((s) => s.replace(/^'+|'+$/g, ""));
    const escapedLuts = rawLuts.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    let txt = "";
    for (let ch of ct) {
      let x = ch.charCodeAt(0);
      if (x > 64 && x < 91)
        x = (x - 52) % 26 + 65;
      else if (x > 96 && x < 123)
        x = (x - 84) % 26 + 97;
      txt += String.fromCharCode(x);
    }
    for (const pat of escapedLuts)
      txt = txt.replace(new RegExp(pat, "g"), "_");
    txt = txt.split("_").join("");
    const decoded1 = b64toString(txt);
    if (!decoded1)
      return null;
    let step4 = "";
    for (let i = 0; i < decoded1.length; i++) {
      step4 += String.fromCharCode((decoded1.charCodeAt(i) - 3 + 256) % 256);
    }
    const revBase64 = step4.split("").reverse().join("");
    const finalStr = b64toString(revBase64);
    if (!finalStr)
      return null;
    return JSON.parse(finalStr);
  } catch (e) {
    console.log("[VOE] voeDecode error:", e.message);
    return null;
  }
}
function resolveVoe(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${embedUrl}`);
      const resp = yield fetch(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": embedUrl,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (!resp.ok) {
        console.log(`[VOE] HTTP error: ${resp.status}`);
        return null;
      }
      let data = yield resp.text();
      if (/permanentToken/i.test(data)) {
        const m2 = data.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (m2) {
          console.log(`[VOE] Permanent token redirect -> ${m2[1]}`);
          const r2 = yield fetch(m2[1], {
            headers: { "User-Agent": UA, "Referer": embedUrl }
          });
          if (r2 && r2.ok)
            data = yield r2.text();
        }
      }
      const rMain = data.match(
        /json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i
      );
      if (rMain) {
        const encodedArray = rMain[1];
        const loaderUrl = rMain[2].startsWith("http") ? rMain[2] : new URL(rMain[2], embedUrl).href;
        console.log(`[VOE] Found encoded array + loader: ${loaderUrl}`);
        const jsResp = yield fetch(loaderUrl, {
          headers: { "User-Agent": UA, "Referer": embedUrl }
        });
        if (!jsResp.ok) {
          console.log(`[VOE] Loader error: ${jsResp.status}`);
          return null;
        }
        const jsData = yield jsResp.text();
        const replMatch = jsData.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || jsData.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (replMatch) {
          const decoded = voeDecode(encodedArray, replMatch[1]);
          if (decoded && (decoded.source || decoded.direct_access_url)) {
            const url = decoded.source || decoded.direct_access_url;
            console.log(`[VOE] URL encontrada: ${url.substring(0, 80)}...`);
            return { url, quality: "1080p", headers: { "User-Agent": UA, "Referer": embedUrl, "Origin": new URL(embedUrl).origin } };
          }
        }
      }
      const re1 = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi;
      const re2 = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi;
      const matches = [];
      let m;
      while ((m = re1.exec(data)) !== null)
        matches.push(m);
      while ((m = re2.exec(data)) !== null)
        matches.push(m);
      for (const match of matches) {
        const candidate = match[1];
        if (!candidate)
          continue;
        let url = candidate;
        if (url.startsWith("aHR0")) {
          try {
            url = atob(url);
          } catch (e) {
          }
        }
        console.log(`[VOE] URL encontrada (fallback): ${url.substring(0, 80)}...`);
        return { url, quality: "720p", headers: { "User-Agent": UA, "Referer": embedUrl, "Origin": new URL(embedUrl).origin } };
      }
      console.log("[VOE] No se encontr\xF3 URL");
      return null;
    } catch (err) {
      console.log(`[VOE] Error: ${err.message}`);
      return null;
    }
  });
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
function resolveVidhide(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[VidHide] Resolviendo: ${embedUrl}`);
      const resp = yield fetch(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Referer": "https://doramasflix.in/"
        }
      });
      if (!resp.ok) {
        console.log(`[VidHide] HTTP error: ${resp.status}`);
        return null;
      }
      const html = yield resp.text();
      const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!evalMatch) {
        console.log("[VidHide] No se encontr\xF3 bloque eval, intentando patrones directos...");
        const directM3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (directM3u8) {
          console.log(`[VidHide] URL directa encontrada: ${directM3u8[0].substring(0, 80)}...`);
          return { url: directM3u8[0], quality: "720p", headers: { "Referer": embedUrl } };
        }
        const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
        if (sourcesMatch) {
          console.log(`[VidHide] URL en sources: ${sourcesMatch[1].substring(0, 80)}...`);
          return { url: sourcesMatch[1], quality: "720p", headers: { "Referer": embedUrl } };
        }
        return null;
      }
      const unpacked = unpackEval(evalMatch[1], 36, evalMatch[4].split("|"));
      if (!unpacked) {
        console.log("[VidHide] No se pudo desempacar");
        return null;
      }
      const hls4Match = unpacked.match(/"hls4"\s*:\s*"([^"]+)"/);
      const hls2Match = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
      const hlsMatch = unpacked.match(/"hls"\s*:\s*"([^"]+)"/);
      const m3u8Relative = (_a = hls4Match || hls2Match || hlsMatch) == null ? void 0 : _a[1];
      if (!m3u8Relative) {
        console.log("[VidHide] No se encontr\xF3 hls4/hls2/hls");
        return null;
      }
      let m3u8Url = m3u8Relative;
      if (!m3u8Relative.startsWith("http")) {
        const origin2 = new URL(embedUrl).origin;
        m3u8Url = `${origin2}${m3u8Relative}`;
      }
      console.log(`[VidHide] URL encontrada: ${m3u8Url.substring(0, 80)}...`);
      const origin = new URL(embedUrl).origin;
      return {
        url: m3u8Url,
        quality: "720p",
        headers: {
          "User-Agent": UA,
          "Referer": `${origin}/`,
          "Origin": origin
        }
      };
    } catch (e) {
      console.log(`[VidHide] Error: ${e.message}`);
      return null;
    }
  });
}
function resolveStreamwish(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[StreamWish] Resolviendo: ${embedUrl}`);
      const embedHost = ((_a = embedUrl.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : _a[1]) || "https://flaswish.com";
      const resp = yield fetch(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": "https://doramasflix.in/",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (!resp.ok) {
        console.log(`[StreamWish] HTTP error: ${resp.status}`);
        return null;
      }
      const data = yield resp.text();
      const fileMatch = data.match(/file\s*:\s*["']([^"']+)["']/i);
      if (fileMatch) {
        let url = fileMatch[1];
        if (url.startsWith("/"))
          url = embedHost + url;
        console.log(`[StreamWish] URL encontrada: ${url.substring(0, 80)}...`);
        return { url, quality: "720p", headers: { "User-Agent": UA, "Referer": embedHost + "/", "Origin": embedHost } };
      }
      const packMatch = data.match(
        /eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/
      );
      if (packMatch) {
        const unpacked = unpackEval(packMatch[1], parseInt(packMatch[2]), packMatch[4].split("|"));
        const objMatch = unpacked.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
        if (objMatch) {
          try {
            const normalized = objMatch[0].replace(/(\w+)\s*:/g, '"$1":');
            const obj = JSON.parse(normalized);
            const url = obj.hls4 || obj.hls3 || obj.hls2;
            if (url) {
              const fullUrl = url.startsWith("/") ? embedHost + url : url;
              console.log(`[StreamWish] URL encontrada: ${fullUrl.substring(0, 80)}...`);
              return { url: fullUrl, quality: "720p", headers: { "User-Agent": UA, "Referer": embedHost + "/", "Origin": embedHost } };
            }
          } catch (e) {
          }
        }
      }
      const rawM3u8 = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      if (rawM3u8) {
        console.log(`[StreamWish] URL encontrada: ${rawM3u8[0].substring(0, 80)}...`);
        return { url: rawM3u8[0], quality: "720p", headers: { "User-Agent": UA, "Referer": embedHost + "/", "Origin": embedHost } };
      }
      console.log("[StreamWish] No se encontr\xF3 URL");
      return null;
    } catch (err) {
      console.log(`[StreamWish] Error: ${err.message}`);
      return null;
    }
  });
}
function resolveOkru(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${embedUrl}`);
      const resp = yield fetch(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html",
          "Referer": "https://ok.ru/"
        }
      });
      if (!resp.ok) {
        console.log(`[OkRu] HTTP error: ${resp.status}`);
        return null;
      }
      const raw = yield resp.text();
      if (raw.includes("copyrightsRestricted") || raw.includes("COPYRIGHTS_RESTRICTED") || raw.includes("LIMITED_ACCESS") || raw.includes("notFound") || !raw.includes("urls")) {
        console.log("[OkRu] Video no disponible o eliminado");
        return null;
      }
      const data = raw.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "");
      const matches = [...data.matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)];
      const QUALITY_ORDER = ["full", "hd", "sd", "low", "lowest"];
      const videos = matches.map((m) => ({ type: m[1], url: m[2] })).filter((v) => !v.type.toLowerCase().includes("mobile") && v.url.startsWith("http"));
      if (videos.length === 0) {
        console.log("[OkRu] No se encontraron URLs");
        return null;
      }
      const sorted = videos.sort((a, b) => {
        const ai = QUALITY_ORDER.findIndex((q) => a.type.toLowerCase().includes(q));
        const bi = QUALITY_ORDER.findIndex((q) => b.type.toLowerCase().includes(q));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      const best = sorted[0];
      console.log(`[OkRu] URL encontrada (${best.type}): ${best.url.substring(0, 80)}...`);
      const QUALITY_MAP = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return {
        url: best.url,
        quality: QUALITY_MAP[best.type] || best.type,
        headers: { "User-Agent": UA, "Referer": "https://ok.ru/" }
      };
    } catch (e) {
      console.log(`[OkRu] Error: ${e.message}`);
      return null;
    }
  });
}
function resolveFilemoon(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[Filemoon] Resolviendo: ${embedUrl}`);
      const resp = yield fetch(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": "https://doramasflix.in/"
        }
      });
      if (!resp.ok) {
        console.log(`[Filemoon] HTTP error: ${resp.status}`);
        return null;
      }
      const data = yield resp.text();
      const m3u8Match = data.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
      if (m3u8Match) {
        console.log(`[Filemoon] URL encontrada: ${m3u8Match[0].substring(0, 80)}...`);
        return {
          url: m3u8Match[0],
          quality: "720p",
          headers: {
            "User-Agent": UA,
            "Referer": embedUrl,
            "Origin": "https://filemoon.sx"
          }
        };
      }
      console.log("[Filemoon] No se encontr\xF3 URL");
      return null;
    } catch (err) {
      console.log(`[Filemoon] Error: ${err.message}`);
      return null;
    }
  });
}
function resolveVideo(embedUrl, serverName) {
  return __async(this, null, function* () {
    console.log(`[Resolver] Dispatching for ${serverName}: ${embedUrl}`);
    const lowerUrl = embedUrl.toLowerCase();
    const lowerServer = serverName.toLowerCase();
    if (lowerUrl.includes("voe.sx") || lowerServer.includes("voe")) {
      return resolveVoe(embedUrl);
    }
    if (lowerUrl.includes("do7go.com") || lowerUrl.includes("ds2play.com") || lowerUrl.includes("vidhide") || lowerServer.includes("do7go") || lowerServer.includes("ds2play") || lowerServer.includes("vidhide")) {
      return resolveVidhide(embedUrl);
    }
    if (lowerUrl.includes("flaswish.com") || lowerUrl.includes("streamwish") || lowerUrl.includes("sfastwish") || lowerServer.includes("flaswish") || lowerServer.includes("streamwish") || lowerServer.includes("wish")) {
      return resolveStreamwish(embedUrl);
    }
    if (lowerUrl.includes("ok.ru") || lowerServer.includes("okru")) {
      return resolveOkru(embedUrl);
    }
    if (lowerUrl.includes("filemoon") || lowerServer.includes("filemoon")) {
      return resolveFilemoon(embedUrl);
    }
    console.log(`[Resolver] No resolver found for ${serverName}`);
    return null;
  });
}

// src/doramasflix/extractor.js
var BASE_URL = "https://doramasflix.in";
var TMDB_API_KEY = "925ef0627fa092898f02c1b62e78fa1b";
function getContentNameFromTMDB(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const endpoint = mediaType === "movie" ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
      console.log(`[DoramasFlix] Fetching TMDB info: ${endpoint}`);
      const response = yield fetch(endpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        console.log(`[DoramasFlix] TMDB API error: ${response.status}`);
        return null;
      }
      const data = yield response.json();
      const name = data.title || data.name;
      console.log(`[DoramasFlix] TMDB name: ${name}`);
      return name;
    } catch (e) {
      console.log(`[DoramasFlix] TMDB fetch error: ${e.message}`);
      return null;
    }
  });
}
function extractServerName(url) {
  if (url.includes("ok.ru"))
    return "Ok.ru";
  if (url.includes("filemoon.sx"))
    return "FileMoon";
  if (url.includes("voe.sx"))
    return "VOE";
  if (url.includes("streamtape.com"))
    return "StreamTape";
  if (url.includes("streamwish") || url.includes("sfastwish"))
    return "StreamWish";
  if (url.includes("vidhide") || url.includes("vidhidepre"))
    return "VidHide";
  if (url.includes("mixdrop") || url.includes("mxdrop"))
    return "MixDrop";
  if (url.includes("ds2play.com"))
    return "DS2Play";
  if (url.includes("ds2play"))
    return "DS2Play";
  if (url.includes("do7go.com"))
    return "Do7Go";
  if (url.includes("do7go"))
    return "Do7Go";
  if (url.includes("flaswish.com"))
    return "FlasWish";
  if (url.includes("flaswish"))
    return "FlasWish";
  return "Unknown";
}
function extractEmbedLinks(episodeUrl) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const html = yield fetchText(episodeUrl);
      const $ = import_cheerio_without_node_native.default.load(html);
      const links = [];
      const seen = /* @__PURE__ */ new Set();
      $("iframe").each((i, elem) => {
        const src = $(elem).attr("src");
        if (src && src.includes("http") && !seen.has(src)) {
          seen.add(src);
          const server = extractServerName(src);
          links.push({ url: src, server });
          console.log(`[DoramasFlix] Found iframe: ${server} - ${src.substring(0, 60)}`);
        }
      });
      const nextDataScript = $("script#__NEXT_DATA__").html();
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          const apolloState = (_b = (_a = nextData == null ? void 0 : nextData.props) == null ? void 0 : _a.pageProps) == null ? void 0 : _b.apolloState;
          if (apolloState) {
            Object.keys(apolloState).forEach((key) => {
              var _a2, _b2;
              if (key.startsWith("ROOT_QUERY.listProblems")) {
                const problemEntry = apolloState[key];
                if ((_b2 = (_a2 = problemEntry == null ? void 0 : problemEntry.server) == null ? void 0 : _a2.json) == null ? void 0 : _b2.link) {
                  const serverInfo = problemEntry.server.json;
                  const link = serverInfo.link;
                  const serverId = serverInfo.server || "Unknown";
                  if (link && !seen.has(link)) {
                    seen.add(link);
                    const serverName = extractServerName(link);
                    links.push({ url: link, server: serverName });
                    console.log(`[DoramasFlix] Found in __NEXT_DATA__: ${serverName} - ${link.substring(0, 60)}`);
                  }
                }
                if (Array.isArray(problemEntry)) {
                  problemEntry.forEach((problemRef) => {
                    var _a3, _b3;
                    if (problemRef && problemRef.id) {
                      const problemData = apolloState[problemRef.id];
                      if ((_b3 = (_a3 = problemData == null ? void 0 : problemData.server) == null ? void 0 : _a3.json) == null ? void 0 : _b3.link) {
                        const serverInfo = problemData.server.json;
                        const link = serverInfo.link;
                        const serverName = extractServerName(link);
                        if (link && !seen.has(link)) {
                          seen.add(link);
                          links.push({ url: link, server: serverName });
                          console.log(`[DoramasFlix] Found in __NEXT_DATA__ (ref): ${serverName} - ${link.substring(0, 60)}`);
                        }
                      }
                    }
                  });
                }
              }
            });
          }
        } catch (e) {
          console.log("[DoramasFlix] Error parsing __NEXT_DATA__:", e.message);
        }
      }
      $("script").each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent) {
          const patterns = [
            /https?:\/\/[^\s"'`]+\.(m3u8|mp4)[^\s"'`]*/gi,
            /["']file["']:\s*["']([^"']+\.(m3u8|mp4))["']/gi,
            /["']src["']:\s*["']([^"']+\.(m3u8|mp4))["']/gi,
            /["']url["']:\s*["']([^"']+\.(m3u8|mp4))["']/gi
          ];
          patterns.forEach((pattern) => {
            const matches = scriptContent.match(pattern);
            if (matches) {
              matches.forEach((match) => {
                const url = match.replace(/["']/g, "");
                if (url && !seen.has(url)) {
                  seen.add(url);
                  const server = extractServerName(url);
                  links.push({ url, server });
                  console.log(`[DoramasFlix] Found in script: ${server} - ${url.substring(0, 60)}`);
                }
              });
            }
          });
        }
      });
      return links;
    } catch (e) {
      console.log("[DoramasFlix] Error extrayendo links:", e.message);
      return [];
    }
  });
}
function searchDramaAPI(query) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    try {
      const response = yield fetch("https://doramasflix-api.dracot16.workers.dev/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          operationName: "searchAll",
          variables: { input: query.replace(/[+]/g, " ") },
          query: `query searchAll($input: String!) {
  searchDorama(input: $input, limit: 32) { _id slug name name_es __typename }
  searchMovie(input: $input, limit: 32) { _id name name_es slug __typename }
}`
        })
      });
      if (!response.ok) {
        console.log(`[DoramasFlix] API request failed: ${response.status}`);
        return null;
      }
      const data = yield response.json();
      if (((_b = (_a = data == null ? void 0 : data.data) == null ? void 0 : _a.searchDorama) == null ? void 0 : _b.length) > 0) {
        return {
          id: data.data.searchDorama[0]._id,
          slug: data.data.searchDorama[0].slug,
          type: "dorama"
        };
      }
      if (((_d = (_c = data == null ? void 0 : data.data) == null ? void 0 : _c.searchMovie) == null ? void 0 : _d.length) > 0) {
        return {
          id: data.data.searchMovie[0]._id,
          slug: data.data.searchMovie[0].slug,
          type: "movie"
        };
      }
      return null;
    } catch (e) {
      console.log("[DoramasFlix] Error b\xFAsqueda:", e.message);
      return null;
    }
  });
}
function extractStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[DoramasFlix] Extracting streams for: ${mediaType} ${tmdbId} S${season}E${episode}`);
      const contentName = yield getContentNameFromTMDB(tmdbId, mediaType);
      if (!contentName) {
        console.log(`[DoramasFlix] Could not get name from TMDB for: ${tmdbId}`);
        return [];
      }
      const searchResult = yield searchDramaAPI(contentName);
      if (!searchResult) {
        console.log(`[DoramasFlix] No search results for: ${contentName}`);
        return [];
      }
      console.log(`[DoramasFlix] Found: ${searchResult.slug} (type: ${searchResult.type})`);
      let episodeUrl;
      if (mediaType === "movie") {
        episodeUrl = `${BASE_URL}/ver/${searchResult.slug}`;
      } else {
        episodeUrl = `${BASE_URL}/episodios/${searchResult.slug}-${season}x${episode}`;
      }
      console.log(`[DoramasFlix] Episode URL: ${episodeUrl}`);
      const embedLinks = yield extractEmbedLinks(episodeUrl);
      console.log(`[DoramasFlix] Found ${embedLinks.length} embed links`);
      if (!embedLinks.length) {
        return [];
      }
      const streams = [];
      for (const embed of embedLinks) {
        console.log(`[DoramasFlix] Resolving ${embed.server}: ${embed.url}`);
        try {
          const resolved = yield resolveVideo(embed.url, embed.server);
          if (resolved && resolved.url) {
            streams.push({
              name: "DoramasFlix",
              title: `[${embed.server}] ${resolved.quality || "720p"}`,
              url: resolved.url,
              quality: resolved.quality || "720p",
              headers: resolved.headers || {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": embed.url
              }
            });
            console.log(`[DoramasFlix] \u2705 Resolved: ${embed.server} -> ${resolved.url.substring(0, 60)}...`);
          } else {
            console.log(`[DoramasFlix] \u274C Could not resolve: ${embed.server}`);
          }
        } catch (err) {
          console.log(`[DoramasFlix] \u274C Error resolving ${embed.server}: ${err.message}`);
        }
      }
      console.log(`[DoramasFlix] Final streams: ${streams.length}`);
      return streams;
    } catch (error) {
      console.error(`[DoramasFlix] Extraction error: ${error.message}`);
      return [];
    }
  });
}

// src/doramasflix/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[DoramasFlix] Request: ${mediaType} ${tmdbId} S${season}E${episode}`);
      const streams = yield extractStreams(tmdbId, mediaType, season, episode);
      return streams;
    } catch (error) {
      console.error(`[DoramasFlix] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
