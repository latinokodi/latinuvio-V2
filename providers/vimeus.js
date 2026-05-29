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
      let data = yield fetchText(embedUrl, { Referer: embedUrl });
      if (/permanentToken/i.test(data)) {
        const m2 = data.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (m2) {
          console.log(`[VOE] Permanent token redirect -> ${m2[1]}`);
          data = yield fetchText(m2[1], { Referer: embedUrl });
        }
      }
      const rMain = data.match(
        /json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i
      );
      if (rMain) {
        const encodedArray = rMain[1];
        const loaderUrl = rMain[2].startsWith("http") ? rMain[2] : new URL(rMain[2], embedUrl).href;
        console.log(`[VOE] Found encoded array + loader: ${loaderUrl}`);
        const jsData = yield fetchText(loaderUrl, { Referer: embedUrl });
        const replMatch = jsData.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || jsData.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (replMatch) {
          const decoded = voeDecode(encodedArray, replMatch[1]);
          if (decoded && (decoded.source || decoded.direct_access_url)) {
            const url = decoded.source || decoded.direct_access_url;
            console.log(`[VOE] URL encontrada: ${url.substring(0, 80)}...`);
            return { url, quality: "1080p", headers: { "User-Agent": UA, Referer: embedUrl, Origin: new URL(embedUrl).origin } };
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
        return { url, quality: "720p", headers: { "User-Agent": UA, Referer: embedUrl, Origin: new URL(embedUrl).origin } };
      }
      console.log("[VOE] No se encontr\xF3 URL");
      return null;
    } catch (err) {
      console.log(`[VOE] Error: ${err.message}`);
      return null;
    }
  });
}
function resolveVidhide(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[VidHide] Resolviendo: ${embedUrl}`);
      const html = yield fetchText(embedUrl, {
        Referer: "https://vimeus.com/"
      });
      const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!evalMatch) {
        console.log("[VidHide] No bloque eval \u2014 intentando patrones directos...");
        const directM3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (directM3u8) {
          return { url: directM3u8[0], quality: "720p", headers: { Referer: embedUrl } };
        }
        const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
        if (sourcesMatch) {
          return { url: sourcesMatch[1], quality: "720p", headers: { Referer: embedUrl } };
        }
        return null;
      }
      const unpacked = unpackEval(evalMatch[1], 36, evalMatch[4].split("|"));
      const hls4Match = unpacked.match(/"hls4"\s*:\s*"([^"]+)"/);
      const hls2Match = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
      const hlsMatch = unpacked.match(/"hls"\s*:\s*"([^"]+)"/);
      const m3u8Relative = (_a = hls4Match || hls2Match || hlsMatch) == null ? void 0 : _a[1];
      if (!m3u8Relative) {
        console.log("[VidHide] No hls4/hls2/hls encontrado");
        return null;
      }
      let m3u8Url = m3u8Relative;
      if (!m3u8Relative.startsWith("http")) {
        m3u8Url = new URL(embedUrl).origin + m3u8Relative;
      }
      const origin = new URL(embedUrl).origin;
      console.log(`[VidHide] URL encontrada: ${m3u8Url.substring(0, 80)}...`);
      return {
        url: m3u8Url,
        quality: "720p",
        headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin }
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
      const embedHost = ((_a = embedUrl.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : _a[1]) || "https://streamwish.com";
      const data = yield fetchText(embedUrl, {
        Referer: "https://vimeus.com/"
      });
      const fileMatch = data.match(/file\s*:\s*["']([^"']+)["']/i);
      if (fileMatch) {
        let url = fileMatch[1];
        if (url.startsWith("/"))
          url = embedHost + url;
        console.log(`[StreamWish] URL encontrada: ${url.substring(0, 80)}...`);
        return { url, quality: "720p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
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
              console.log(`[StreamWish] URL encontrada (packed): ${fullUrl.substring(0, 80)}...`);
              return { url: fullUrl, quality: "720p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
            }
          } catch (e) {
          }
        }
        const m3u8InPacked = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8InPacked) {
          console.log(`[StreamWish] URL m3u8 en packed: ${m3u8InPacked[0].substring(0, 80)}...`);
          return { url: m3u8InPacked[0], quality: "720p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
        }
      }
      const rawM3u8 = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      if (rawM3u8) {
        console.log(`[StreamWish] URL m3u8 raw: ${rawM3u8[0].substring(0, 80)}...`);
        return { url: rawM3u8[0], quality: "720p", headers: { "User-Agent": UA, Referer: embedHost + "/", Origin: embedHost } };
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
      const raw = yield fetchText(embedUrl, { Referer: "https://ok.ru/" });
      if (raw.includes("copyrightsRestricted") || raw.includes("COPYRIGHTS_RESTRICTED") || raw.includes("LIMITED_ACCESS") || raw.includes("notFound") || !raw.includes("urls")) {
        console.log("[OkRu] Video no disponible");
        return null;
      }
      const data = raw.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "");
      const matches = [...data.matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)];
      const QUALITY_ORDER = ["full", "hd", "sd", "low", "lowest"];
      const videos = matches.map((m) => ({ type: m[1], url: m[2] })).filter((v) => !v.type.toLowerCase().includes("mobile") && v.url.startsWith("http"));
      if (!videos.length) {
        console.log("[OkRu] No se encontraron URLs");
        return null;
      }
      const sorted = videos.sort((a, b) => {
        const ai = QUALITY_ORDER.findIndex((q) => a.type.toLowerCase().includes(q));
        const bi = QUALITY_ORDER.findIndex((q) => b.type.toLowerCase().includes(q));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      const best = sorted[0];
      const QUALITY_MAP = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      console.log(`[OkRu] URL encontrada (${best.type}): ${best.url.substring(0, 80)}...`);
      return {
        url: best.url,
        quality: QUALITY_MAP[best.type] || best.type,
        headers: { "User-Agent": UA, Referer: "https://ok.ru/", Origin: "https://ok.ru" }
      };
    } catch (e) {
      console.log(`[OkRu] Error: ${e.message}`);
      return null;
    }
  });
}
function resolveFilemoon(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[Filemoon] Resolviendo: ${embedUrl}`);
      const data = yield fetchText(embedUrl, { Referer: "https://vimeus.com/" });
      const evalMatch = data.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (evalMatch) {
        const unpacked = unpackEval(evalMatch[1], 36, ((_a = evalMatch[4]) == null ? void 0 : _a.split("|")) || []);
        const m3u8InPacked = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8InPacked) {
          console.log(`[Filemoon] URL en packed: ${m3u8InPacked[0].substring(0, 80)}...`);
          return {
            url: m3u8InPacked[0],
            quality: "1080p",
            headers: { "User-Agent": UA, Referer: embedUrl, Origin: "https://filemoon.sx" }
          };
        }
      }
      const m3u8Match = data.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
      if (m3u8Match) {
        console.log(`[Filemoon] URL m3u8 directa: ${m3u8Match[0].substring(0, 80)}...`);
        return {
          url: m3u8Match[0],
          quality: "720p",
          headers: { "User-Agent": UA, Referer: embedUrl, Origin: "https://filemoon.sx" }
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
function resolveGoodstream(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[GoodStream] Resolviendo: ${embedUrl}`);
      const data = yield fetchText(embedUrl, { Referer: "https://vimeus.com/" });
      const evalMatch = data.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (evalMatch) {
        const unpacked = unpackEval(evalMatch[1], 36, ((_a = evalMatch[4]) == null ? void 0 : _a.split("|")) || []);
        const fileMatch2 = unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || unpacked.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
        if (fileMatch2) {
          console.log(`[GoodStream] URL en packed: ${fileMatch2[1].substring(0, 80)}...`);
          const origin = new URL(embedUrl).origin;
          return { url: fileMatch2[1], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
        const m3u8InPacked = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8InPacked) {
          console.log(`[GoodStream] m3u8 en packed: ${m3u8InPacked[0].substring(0, 80)}...`);
          const origin = new URL(embedUrl).origin;
          return { url: m3u8InPacked[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
      }
      const fileMatch = data.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || data.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (fileMatch) {
        console.log(`[GoodStream] URL directa: ${fileMatch[1].substring(0, 80)}...`);
        const origin = new URL(embedUrl).origin;
        return { url: fileMatch[1], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      const m3u8Match = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      if (m3u8Match) {
        console.log(`[GoodStream] m3u8 directo: ${m3u8Match[0].substring(0, 80)}...`);
        const origin = new URL(embedUrl).origin;
        return { url: m3u8Match[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      console.log("[GoodStream] No se encontr\xF3 URL");
      return null;
    } catch (err) {
      console.log(`[GoodStream] Error: ${err.message}`);
      return null;
    }
  });
}
function resolveVimeos(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(`[Vimeos] Resolviendo: ${embedUrl}`);
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
          console.log(`[Vimeos] URL en packed: ${url.substring(0, 80)}...`);
          const origin = new URL(embedUrl).origin;
          return { url, quality: "1080p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
        const m3u8 = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8) {
          console.log(`[Vimeos] m3u8 en packed: ${m3u8[0].substring(0, 80)}...`);
          const origin = new URL(embedUrl).origin;
          return { url: m3u8[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
        }
      }
      const fileMatch = data.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || data.match(/["']file["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) || data.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (fileMatch) {
        const url = fileMatch[1].startsWith("/") ? embedHost + fileMatch[1] : fileMatch[1];
        console.log(`[Vimeos] URL directa: ${url.substring(0, 80)}...`);
        const origin = new URL(embedUrl).origin;
        return { url, quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      const m3u8Match = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      if (m3u8Match) {
        console.log(`[Vimeos] m3u8 raw: ${m3u8Match[0].substring(0, 80)}...`);
        const origin = new URL(embedUrl).origin;
        return { url: m3u8Match[0], quality: "720p", headers: { "User-Agent": UA, Referer: `${origin}/`, Origin: origin } };
      }
      console.log("[Vimeos] No se encontr\xF3 URL");
      return null;
    } catch (err) {
      console.log(`[Vimeos] Error: ${err.message}`);
      return null;
    }
  });
}
function resolveVideo(embedUrl, serverName) {
  return __async(this, null, function* () {
    console.log(`[Resolver] Dispatching for ${serverName}: ${embedUrl}`);
    const u = embedUrl.toLowerCase();
    const s = serverName.toLowerCase();
    if (u.includes("voe.sx") || u.includes("voe") || s.includes("voe")) {
      return resolveVoe(embedUrl);
    }
    if (u.includes("do7go.com") || u.includes("ds2play.com") || u.includes("vidhide") || s.includes("do7go") || s.includes("ds2play") || s.includes("vidhide")) {
      return resolveVidhide(embedUrl);
    }
    if (u.includes("hlswish.com") || u.includes("flaswish.com") || u.includes("streamwish") || u.includes("sfastwish") || s.includes("streamwish") || s.includes("hlswish") || s.includes("flaswish") || s.includes("wish")) {
      return resolveStreamwish(embedUrl);
    }
    if (u.includes("ok.ru") || s.includes("okru")) {
      return resolveOkru(embedUrl);
    }
    if (u.includes("filemoon") || s.includes("filemoon")) {
      return resolveFilemoon(embedUrl);
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
              name: "Vimeus",
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
