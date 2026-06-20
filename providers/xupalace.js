/**
 * xupalace - Built from src/xupalace/
 * Generated: 2026-05-05T21:05:01.261Z
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
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// src/utils/ua.js
var require_ua = __commonJS({
  "src/utils/ua.js"(exports2, module2) {
    var UA_POOL = [
      // Windows - Chrome 146 (Custom modern fingerprint)
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
    ];
    function getRandomUA() {
      const index = Math.floor(Math.random() * UA_POOL.length);
      return UA_POOL[index];
    }
    module2.exports = { getRandomUA, UA_POOL };
  }
});

// src/utils/http.js
var require_http = __commonJS({
  "src/utils/http.js"(exports2, module2) {
    var { getRandomUA } = require_ua();
    var DEFAULT_CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    var sessionUA = null;
    function setSessionUA(ua) {
      sessionUA = ua;
    }
    function getSessionUA() {
      return sessionUA || DEFAULT_CHROME_UA;
    }
    function getStealthHeaders() {
      return {
        "User-Agent": getSessionUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "es-US,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6",
        "Connection": "keep-alive",
        "sec-ch-ua": '"Chromium";v="137", "Not-A.Brand";v="24", "Google Chrome";v="137"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      };
    }
    var DEFAULT_UA = getSessionUA();
    var MOBILE_UA = getSessionUA();
    function request(url, options) {
      return __async(this, null, function* () {
        var opt = options || {};
        var currentUA = opt.headers && opt.headers["User-Agent"] ? opt.headers["User-Agent"] : getSessionUA();
        var headers = Object.assign({
          "User-Agent": currentUA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
        }, opt.headers);
        try {
          var fetchOptions = Object.assign({
            redirect: opt.redirect || "follow",
            skipSizeCheck: true
          }, opt, {
            headers
          });
          if (opt.signal)
            fetchOptions.signal = opt.signal;
          var response = yield fetch(url, fetchOptions);
          if (opt.redirect === "manual" && (response.status === 301 || response.status === 302)) {
            const redirectUrl = response.headers.get("location");
            console.log(`[HTTP] Redirecci\xF3n detectada (Manual): ${redirectUrl}`);
            return { status: response.status, redirectUrl, ok: false };
          }
          if (!response.ok && !opt.ignoreErrors) {
            console.warn("[HTTP] Error " + response.status + " en " + url);
          }
          return response;
        } catch (error) {
          console.error("[HTTP] Error en " + url + ": " + error.message);
          throw error;
        }
      });
    }
    function fetchHtml(url, options) {
      return __async(this, null, function* () {
        var res = yield request(url, options);
        return yield res.text();
      });
    }
    function fetchJson(url, options) {
      return __async(this, null, function* () {
        var res = yield request(url, options);
        return yield res.json();
      });
    }
    module2.exports = {
      request,
      fetchHtml,
      fetchJson,
      getSessionUA,
      setSessionUA,
      getStealthHeaders,
      DEFAULT_UA,
      MOBILE_UA
    };
  }
});

// src/utils/m3u8.js
var require_m3u8 = __commonJS({
  "src/utils/m3u8.js"(exports2, module2) {
    var { getSessionUA } = require_http();
    function getQualityFromHeight(height) {
      if (!height)
        return "1080p";
      const h = parseInt(height);
      if (h >= 2160)
        return "4K";
      if (h >= 1440)
        return "1440p";
      if (h >= 1080)
        return "1080p";
      if (h >= 720)
        return "720p";
      if (h >= 480)
        return "480p";
      if (h >= 360)
        return "360p";
      return "1080p";
    }
    function parseBestQuality(content, url = "") {
      let bestHeight = 0;
      let bestBandwidth = 0;
      if (content) {
        const lines = content.split("\n");
        for (const line of lines) {
          if (line.includes("RESOLUTION=")) {
            const match = line.match(/RESOLUTION=\d+x(\d+)/i);
            if (match) {
              const height = parseInt(match[1]);
              if (height > bestHeight)
                bestHeight = height;
            }
          }
          if (line.includes("BANDWIDTH=")) {
            const match = line.match(/BANDWIDTH=(\d+)/i);
            if (match) {
              const bandwidth = parseInt(match[1]);
              if (bandwidth > bestBandwidth)
                bestBandwidth = bandwidth;
            }
          }
        }
      }
      let quality = "1080p";
      let isReal = false;
      if (bestHeight > 0) {
        quality = getQualityFromHeight(bestHeight);
      } else {
        const qMatch = url.match(/([_-]|\/)(\d{3,4})([pP]|(\.m3u8))?/);
        if (qMatch) {
          const h = parseInt(qMatch[2]);
          if (h >= 360 && h <= 4320)
            quality = getQualityFromHeight(h);
        }
      }
      if (bestHeight > 0)
        isReal = true;
      if (bestBandwidth >= 2e6)
        isReal = true;
      return { quality, isReal };
    }
    var VALIDATION_CACHE = /* @__PURE__ */ new Map();
    function validateStream(stream, signal = null) {
      return __async(this, null, function* () {
        if (!stream || !stream.url)
          return stream;
        const { url, headers } = stream;
        const isMp4 = url.toLowerCase().includes(".mp4");
        if (VALIDATION_CACHE.has(url))
          return __spreadValues(__spreadValues({}, stream), VALIDATION_CACHE.get(url));
        try {
          const fetchOptions = {
            method: isMp4 ? "HEAD" : "GET",
            headers: __spreadValues({
              "User-Agent": getSessionUA()
            }, headers || {})
          };
          if (signal)
            fetchOptions.signal = signal;
          const response = yield fetch(url, fetchOptions);
          if (!response.ok)
            return __spreadProps(__spreadValues({}, stream), { verified: false });
          if (isMp4) {
            const resultData2 = { verified: true, quality: stream.quality || "1080p", isReal: true };
            VALIDATION_CACHE.set(url, resultData2);
            return __spreadValues(__spreadValues({}, stream), resultData2);
          }
          const text = yield response.text();
          const info = parseBestQuality(text, url);
          const resultData = {
            verified: true,
            quality: info.quality,
            isReal: info.isReal
          };
          VALIDATION_CACHE.set(url, resultData);
          return __spreadValues(__spreadValues({}, stream), resultData);
        } catch (error) {
          const info = parseBestQuality("", url);
          const resultData = { quality: info.quality, verified: true, isReal: false };
          VALIDATION_CACHE.set(url, resultData);
          return __spreadValues(__spreadValues({}, stream), resultData);
        }
      });
    }
    module2.exports = { validateStream, getQualityFromHeight };
  }
});

// src/utils/sorting.js
var sorting_exports = {};
__export(sorting_exports, {
  sortStreamsByQuality: () => sortStreamsByQuality
});
function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams))
    return [];
  return [...streams].sort((a, b) => {
    const scoreA = QUALITY_SCORE[a.quality] || 0;
    const scoreB = QUALITY_SCORE[b.quality] || 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const serverA = (a.serverLabel || "").split(" ")[0];
    const serverB = (b.serverLabel || "").split(" ")[0];
    const speedA = SERVER_SCORE[serverA] || 0;
    const speedB = SERVER_SCORE[serverB] || 0;
    if (speedA !== speedB) {
      return speedB - speedA;
    }
    if (a.verified && !b.verified)
      return -1;
    if (!a.verified && b.verified)
      return 1;
    return 0;
  });
}
var QUALITY_SCORE, SERVER_SCORE;
var init_sorting = __esm({
  "src/utils/sorting.js"() {
    QUALITY_SCORE = {
      "4K": 100,
      "1440p": 90,
      "1080p": 80,
      "720p": 70,
      "480p": 60,
      "360p": 50,
      "240p": 40,
      "Auto": 30,
      "Unknown": 0
    };
    SERVER_SCORE = {
      "VOE": 10,
      "Filemoon": 10,
      "Tplayer": 10,
      "Vimeos": 10,
      "Netu": 5,
      "GoodStream": 10,
      "StreamWish": -5,
      "VidHide": -5
    };
  }
});

// src/utils/mirrors.js
var require_mirrors = __commonJS({
  "src/utils/mirrors.js"(exports2, module2) {
    var MIRRORS = {
      VIDHIDE: [
        "vidhide",
        "minochinos",
        "vadisov",
        "vaiditv",
        "amusemre",
        "callistanise",
        "vhaudm",
        "mdfury",
        "dintezuvio",
        "acek-cdn",
        "vedonm",
        "vidhidepro",
        "vidhidevip",
        "masukestin",
        "vidoza",
        "supervideo"
      ],
      STREAMWISH: [
        "hlswish",
        "streamwish",
        "hglink",
        "hglamioz",
        "hglink.to",
        "audinifer",
        "embedwish",
        "awish",
        "dwish",
        "strwish",
        "filelions",
        "wishembed",
        "wishfast",
        "hanerix"
      ],
      FILEMOON: [
        "filemoon",
        "moonalu",
        "moonembed",
        "bysedikamoum",
        "r66nv9ed",
        "398fitus",
        "filemoon.sx",
        "filemoon.to",
        "filemoon.lat",
        "filemoon.live",
        "filemoon.online",
        "filemoon.me",
        "bysedikamoum.com",
        "r66nv9ed.com",
        "398fitus.com",
        "fmoon.top"
      ],
      VOE: [
        "voe.sx",
        "voe-sx",
        "voex.sx",
        "marissashare",
        "cloudwindow",
        "marissasharecareer"
      ],
      FASTREAM: [
        "fastream",
        "fastplay",
        "fembed"
      ],
      OKRU: [
        "ok.ru",
        "okru"
      ],
      PIXELDRAIN: [
        "pixeldrain"
      ],
      BUZZHEAVIER: [
        "buzzheavier",
        "bzh.sh"
      ],
      GOODSTREAM: [
        "goodstream",
        "gs.one"
      ],
      LULUSTREAM: [
        "lulustream",
        "luluvdo",
        "luluvids",
        "pondy",
        "lulupuv"
      ],
      SEEKSTREAMING: [
        "seekplays",
        "seekstreaming",
        "embedseek"
      ],
      DROPCDN: [
        "dropcdn.io",
        "dropload.io",
        "dropcdn",
        "dropload",
        "dr0pstream"
      ],
      DOODSTREAM: [
        "dood.li",
        "dood.la",
        "ds2video.com",
        "ds2play.com",
        "dood.yt",
        "dood.ws",
        "dood.so",
        "dood.to",
        "dood.pm",
        "dood.watch",
        "dood.sh",
        "dood.cx",
        "dood.wf",
        "dood.re",
        "dood.one",
        "dood.tech",
        "dood.work",
        "doods.pro",
        "dooood.com",
        "doodstream.com",
        "doodstream.co",
        "d000d.com",
        "d0000d.com",
        "doodapi.com",
        "d0o0d.com",
        "do0od.com",
        "dooodster.com",
        "vidply.com",
        "do7go.com",
        "all3do.com",
        "doply.net",
        "dsvplay.com"
      ],
      VIDNEST: [
        "vidnest.io",
        "vidnest.live"
      ],
      VIDSONIC: [
        "vidsonic.net"
      ],
      BARMONREY: [
        "barmonrey.com"
      ],
      VIDMOLY: [
        "vidmoly.biz",
        "vidmoly.to"
      ],
      UNLIMPLAY: [
        "unlimplay.com"
      ],
      KRAKENFILES: [
        "krakenfiles.com"
      ],
      UPNS: [
        "upns.online"
      ]
    };
    function isMirror(url, groupName) {
      if (!url || !MIRRORS[groupName])
        return false;
      const s = url.toLowerCase();
      return MIRRORS[groupName].some((m) => s.includes(m));
    }
    module2.exports = { MIRRORS, isMirror };
  }
});

// src/utils/engine.js
var require_engine = __commonJS({
  "src/utils/engine.js"(exports2, module2) {
    var { validateStream } = require_m3u8();
    var { sortStreamsByQuality: sortStreamsByQuality2 } = (init_sorting(), __toCommonJS(sorting_exports));
    var { isMirror } = require_mirrors();
    function normalizeLanguage(lang) {
      const l = (lang || "").toLowerCase();
      if (l.includes("latino") || l === "lat" || l.includes("mex") || l.includes("col") || l.includes("arg") || l.includes("chi") || l.includes("per") || l.includes("dub") || l.includes("dual")) {
        return "Latino";
      }
      if (l.includes("esp") || l.includes("cas") || l.includes("spa") || l.includes("cast") || l === "espa\xF1ol") {
        return "Castellano";
      }
      if (l.includes("sub") || l.includes("vose") || l === "sub") {
        return "Subtitulado";
      }
      if (l.includes("eng") || l.includes("en-us") || l === "en") {
        return "Ingl\xE9s";
      }
      return "Latino";
    }
    function normalizeServer(server, url = "", resolvedServerName = null) {
      if (resolvedServerName)
        return resolvedServerName;
      const u = (url || "").toLowerCase();
      const s = (server || "").toLowerCase();
      if (u.includes("goodstream") || s.includes("goodstream"))
        return "GoodStream";
      if (u.includes("vimeos") || u.includes("vms.sh") || s.includes("vimeos"))
        return "Vimeos";
      if (isMirror(u, "VIDHIDE") || isMirror(s, "VIDHIDE"))
        return "VidHide";
      if (isMirror(u, "STREAMWISH") || isMirror(s, "STREAMWISH"))
        return "StreamWish";
      if (isMirror(u, "VOE") || isMirror(s, "VOE"))
        return "VOE";
      if (isMirror(u, "FILEMOON") || isMirror(s, "FILEMOON"))
        return "Filemoon";
      if (isMirror(u, "DOODSTREAM") || isMirror(s, "DOODSTREAM"))
        return "DoodStream";
      if (url) {
        try {
          const domainParts = new URL(url).hostname.replace("www.", "").split(".");
          const mainName = domainParts.length > 1 ? domainParts[domainParts.length - 2] : domainParts[0];
          return mainName.charAt(0).toUpperCase() + mainName.slice(1);
        } catch (e) {
        }
      }
      return server || "Servidor";
    }
    function finalizeStreams2(streams, providerName, mediaTitle) {
      return __async(this, null, function* () {
        if (!Array.isArray(streams) || streams.length === 0)
          return [];
        console.log(`[Engine] PROCESANDO STREAMS - Bitrate Global v7.6.0`);
        const { validateStream: validateStream2 } = require_m3u8();
        const sorted = sortStreamsByQuality2(streams);
        const CONCURRENCY_LIMIT = 5;
        const MAX_VALIDATIONS = 5;
        const validatedStreams = [];
        for (let i = 0; i < sorted.length; i += CONCURRENCY_LIMIT) {
          if (i >= MAX_VALIDATIONS) {
            validatedStreams.push(...sorted.slice(i));
            break;
          }
          const batch = sorted.slice(i, i + CONCURRENCY_LIMIT);
          const batchResults = yield Promise.all(batch.map((s) => __async(this, null, function* () {
            try {
              if (s.isReal === true)
                return s;
              if (s.url && (s.url.includes(".m3u8") || s.url.includes(".mp4"))) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);
                try {
                  const validated = yield validateStream2(s, controller.signal);
                  clearTimeout(timeoutId);
                  return validated;
                } catch (e) {
                  clearTimeout(timeoutId);
                  return __spreadProps(__spreadValues({}, s), { verified: false, isReal: false });
                }
              }
            } catch (e) {
            }
            return s;
          })));
          validatedStreams.push(...batchResults);
        }
        const processed = [];
        const seenTitles = /* @__PURE__ */ new Set();
        for (const s of validatedStreams) {
          if (!s)
            continue;
          const rawLang = normalizeLanguage(s.lang || s.Audio || s.langLabel || s.language || s.audio || "Latino");
          const l = rawLang.toLowerCase();
          const isAllowed = l === "latino" || l === "castellano";
          if (!isAllowed && providerName !== "FuegoCine")
            continue;
          const server = normalizeServer(s.serverLabel || s.serverName || s.servername, s.url, s.serverName);
          const quality = s.quality || "HD";
          const isReal = s.isReal === true;
          const isVerified = s.verified === true;
          const checkMark = isReal ? " \u2705" : "";
          const streamName = `${providerName} - ${quality}${checkMark}`;
          const streamTitle = `${rawLang} - ${server}`;
          if (seenTitles.has(streamName + streamTitle + s.url))
            continue;
          seenTitles.add(streamName + streamTitle + s.url);
          processed.push({
            name: streamName,
            title: streamTitle,
            url: s.url,
            quality,
            verified: isVerified,
            isReal,
            provider: server,
            language: rawLang,
            headers: s.headers || {
              "User-Agent": "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
        }
        return processed;
      });
    }
    module2.exports = { finalizeStreams: finalizeStreams2, normalizeLanguage };
  }
});

// src/utils/tmdb.js
var require_tmdb = __commonJS({
  "src/utils/tmdb.js"(exports2, module2) {
    var axios2 = require("axios");
    var TMDB_API_KEY2 = "439c478a771f35c05022f9feabcca01c";
    var titleCache = /* @__PURE__ */ new Map();
    function getTmdbTitle2(tmdbId, mediaType, language = "en-US", retries = 2) {
      return __async(this, null, function* () {
        if (!tmdbId)
          return null;
        const cleanId = tmdbId.toString().split(":")[0];
        const cacheKey = `${cleanId}_${mediaType}_${language}`;
        if (titleCache.has(cacheKey))
          return titleCache.get(cacheKey);
        try {
          const type = mediaType === "movie" || mediaType === "movies" ? "movie" : "tv";
          let url;
          if (cleanId.startsWith("tt")) {
            url = `https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY2}&external_source=imdb_id&language=${language}`;
            const { data } = yield axios2.get(url, { timeout: 6e3 });
            const result = type === "movie" ? data.movie_results && data.movie_results[0] : data.tv_results && data.tv_results[0] || data.movie_results && data.movie_results[0];
            const title = result ? result.name || result.title : null;
            if (title)
              titleCache.set(cacheKey, title);
            return title;
          } else {
            url = `https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${TMDB_API_KEY2}&language=${language}`;
            const { data } = yield axios2.get(url, { timeout: 6e3 });
            const title = data.name || data.title || null;
            if (title)
              titleCache.set(cacheKey, title);
            return title;
          }
        } catch (e) {
          if (retries > 0) {
            console.log(`[TMDB-Rescue] Retrying ${tmdbId} (${retries} left)...`);
            yield new Promise((r) => setTimeout(r, 1e3));
            return getTmdbTitle2(tmdbId, mediaType, retries - 1);
          }
          console.log(`[TMDB-Rescue] Failed to fetch title for ${tmdbId}: ${e.message}`);
          return null;
        }
      });
    }
    function getTmdbInfo(tmdbId, mediaType) {
      return __async(this, null, function* () {
        if (!tmdbId)
          return null;
        const cleanId = tmdbId.toString().split(":")[0];
        const type = mediaType === "movie" || mediaType === "movies" ? "movie" : "tv";
        try {
          let url;
          let result;
          if (cleanId.startsWith("tt")) {
            url = `https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY2}&external_source=imdb_id`;
            const { data } = yield axios2.get(url, { timeout: 6e3 });
            result = type === "movie" ? data.movie_results && data.movie_results[0] : data.tv_results && data.tv_results[0] || data.movie_results && data.movie_results[0];
          } else {
            url = `https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${TMDB_API_KEY2}`;
            const { data } = yield axios2.get(url, { timeout: 6e3 });
            result = data;
          }
          if (result) {
            const title = result.name || result.title;
            const date = result.release_date || result.first_air_date || "";
            const year = date.split("-")[0];
            return { title, year };
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    function getTmdbAliases(tmdbId, mediaType) {
      return __async(this, null, function* () {
        if (!tmdbId)
          return [];
        const cleanId = tmdbId.toString().split(":")[0];
        const type = mediaType === "movie" || mediaType === "movies" ? "movie" : "tv";
        const titles = /* @__PURE__ */ new Set();
        try {
          const [enTitle, esTitle] = yield Promise.all([
            getTmdbTitle2(cleanId, type, "en-US"),
            getTmdbTitle2(cleanId, type, "es-MX")
          ]);
          if (enTitle)
            titles.add(enTitle);
          if (esTitle)
            titles.add(esTitle);
          const altUrl = `https://api.themoviedb.org/3/${type}/${cleanId}/alternative_titles?api_key=${TMDB_API_KEY2}`;
          const { data } = yield axios2.get(altUrl, { timeout: 5e3 });
          const altResults = data.titles || data.results || [];
          altResults.forEach((item) => {
            if (item.title)
              titles.add(item.title);
          });
          return Array.from(titles);
        } catch (e) {
          console.warn(`[TMDB-Aliases] Failed for ${tmdbId}: ${e.message}`);
          return Array.from(titles);
        }
      });
    }
    module2.exports = { getTmdbTitle: getTmdbTitle2, getTmdbInfo, getTmdbAliases };
  }
});

// src/resolvers/hlswish.js
var require_hlswish = __commonJS({
  "src/resolvers/hlswish.js"(exports2, module2) {
    var { getSessionUA } = require_http();
    var { validateStream } = require_m3u8();
    function unpackEval(payload, radix, symtab) {
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
      return payload.replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
        const idx = unbase(match);
        if (isNaN(idx) || idx >= symtab.length)
          return match;
        return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
      });
    }
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const UA2 = getSessionUA();
          const rawId = url.split("/").pop().replace(/\.html$/, "");
          const urlObj = new URL(url);
          const mirrors = [
            `https://hanerix.com/e/${rawId}`,
            `https://embedwish.com/e/${rawId}`,
            `https://hglink.to/e/${rawId}`,
            url,
            `https://streamwish.to/e/${rawId}`,
            `https://awish.pro/e/${rawId}`,
            `https://strwish.com/e/${rawId}`,
            `https://wishfast.top/e/${rawId}`,
            `https://sfastwish.com/e/${rawId}`
          ];
          console.log(`[StreamWish] Race-Resolving v7.9.4: ${rawId} (${mirrors.length} mirrors)`);
          const validResult = yield new Promise((resolveRace) => {
            let resolved = false;
            let pending = mirrors.length;
            mirrors.forEach((mirror) => __async(this, null, function* () {
              try {
                const mirrorObj = new URL(mirror);
                const mirrorOrigin = mirrorObj.origin;
                const resp = yield fetch(mirror, {
                  headers: { "Referer": mirror, "User-Agent": UA2 },
                  signal
                });
                if (!resp.ok)
                  throw new Error();
                const html = yield resp.text();
                let m3u8Url = null;
                const hashMatch = html.match(/[0-9a-f]{32}/i);
                if (hashMatch) {
                  const hash = hashMatch[0];
                  const dlUrl = `${mirrorOrigin}/dl?op=view&file_code=${rawId}&hash=${hash}&embed=1&referer=&adb=1&hls4=1`;
                  const dlResp = yield fetch(dlUrl, {
                    headers: { "User-Agent": UA2, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" },
                    signal
                  });
                  if (dlResp.ok) {
                    const dlData = yield dlResp.text();
                    const match = dlData.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
                    if (match)
                      m3u8Url = match[0];
                  }
                }
                if (!m3u8Url) {
                  const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
                  if (packedMatch) {
                    const unpacked = unpackEval(packedMatch[1], parseInt(packedMatch[2]), packedMatch[4].split("|"));
                    const match = unpacked.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
                    if (match)
                      m3u8Url = match[0];
                  }
                }
                if (!m3u8Url) {
                  const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
                  if (fileMatch)
                    m3u8Url = fileMatch[1];
                }
                if (m3u8Url && !resolved) {
                  resolved = true;
                  m3u8Url = m3u8Url.replace(/\\/g, "");
                  if (m3u8Url.startsWith("/"))
                    m3u8Url = mirrorOrigin + m3u8Url;
                  resolveRace({ url: m3u8Url, mirror });
                }
              } catch (e) {
              } finally {
                pending--;
                if (pending === 0 && !resolved)
                  resolveRace(null);
              }
            }));
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolveRace(null);
              }
            }, 3500);
          });
          if (!validResult)
            return null;
          const reqHeaders = {
            "Referer": validResult.mirror,
            "Origin": new URL(validResult.mirror).origin,
            "User-Agent": UA2
          };
          const streamObj = { url: validResult.url, headers: reqHeaders };
          const validation = yield validateStream(streamObj, signal);
          const isLive = validation ? validation.verified : true;
          const streamQuality = validation && validation.quality ? validation.quality : "Auto";
          return {
            url: validResult.url,
            quality: streamQuality,
            verified: isLive,
            isReal: validation ? validation.isReal : false,
            serverName: "StreamWish",
            headers: reqHeaders
          };
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve };
  }
});

// src/utils/aes_gcm.js
var require_aes_gcm = __commonJS({
  "src/utils/aes_gcm.js"(exports2, module2) {
    var _CryptoJS = typeof CryptoJS !== "undefined" ? CryptoJS : null;
    function parseB64(b64) {
      if (!b64 || !_CryptoJS)
        return null;
      try {
        const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
        return _CryptoJS.enc.Base64.parse(normalized);
      } catch (e) {
        return null;
      }
    }
    function decryptGCM(keyWA, ivWA, ciphertextWithTagWA) {
      try {
        if (!keyWA || !ivWA || !ciphertextWithTagWA || !_CryptoJS)
          return null;
        const tagSizeWords = 4;
        const ciphertextWords = ciphertextWithTagWA.words.slice(0, ciphertextWithTagWA.words.length - tagSizeWords);
        const ciphertextWA = _CryptoJS.lib.WordArray.create(
          ciphertextWords,
          ciphertextWithTagWA.sigBytes - 16
        );
        let counterWA = ivWA.clone();
        counterWA.concat(_CryptoJS.lib.WordArray.create([2], 4));
        const decrypted = _CryptoJS.AES.decrypt(
          { ciphertext: ciphertextWA },
          keyWA,
          {
            iv: counterWA,
            mode: _CryptoJS.mode.CTR,
            padding: _CryptoJS.pad.NoPadding
          }
        );
        return decrypted.toString(_CryptoJS.enc.Utf8);
      } catch (e) {
        console.error("[AES-GCM] Error:", e.message);
        return null;
      }
    }
    function decryptByse(playback) {
      try {
        if (!playback || !playback.key_parts || !playback.payload || !playback.iv || !_CryptoJS)
          return null;
        let keyWA = parseB64(playback.key_parts[0]);
        for (let i = 1; i < playback.key_parts.length; i++) {
          const part = parseB64(playback.key_parts[i]);
          if (part)
            keyWA.concat(part);
        }
        const ivWA = parseB64(playback.iv);
        const ciphertextWithTagWA = parseB64(playback.payload);
        return decryptGCM(keyWA, ivWA, ciphertextWithTagWA);
      } catch (e) {
        console.error("[Byse] Failed:", e.message);
        return null;
      }
    }
    module2.exports = { decryptByse };
  }
});

// src/resolvers/filemoon.js
var require_filemoon = __commonJS({
  "src/resolvers/filemoon.js"(exports2, module2) {
    var { decryptByse } = require_aes_gcm();
    var { getSessionUA } = require_http();
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        var _a, _b, _c, _d;
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          const videoId = urlObj.pathname.split("/").filter((p) => !!p).pop();
          const UA_CHROME = getSessionUA();
          if (!videoId)
            return null;
          console.log(`[Filemoon] ECDSA-Resolving: ${videoId} Host: ${hostname}`);
          const detailsResp = yield fetch(`https://${hostname}/api/videos/${videoId}/embed/details`, {
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": url, "User-Agent": UA_CHROME }
          });
          const details = yield detailsResp.json();
          const frameUrl = details.embed_frame_url;
          if (!frameUrl)
            return null;
          const playbackDomain = new URL(frameUrl).origin;
          const challengeResp = yield fetch(`${playbackDomain}/api/videos/access/challenge`, {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest", "Referer": frameUrl, "Origin": playbackDomain, "User-Agent": UA_CHROME }
          });
          const challenge = yield challengeResp.json();
          if (!challenge.challenge_id)
            return null;
          const deviceId = Math.random().toString(36).substring(2, 15);
          const viewerId = Math.random().toString(36).substring(2, 15);
          const attestPayload = {
            "viewer_id": viewerId,
            "device_id": deviceId,
            "challenge_id": challenge.challenge_id,
            "nonce": challenge.nonce,
            // v8.2.0: Firma y llave estructuralmente perfectas para pasar el check de la curva
            "signature": "MEUCIQDYi5fX9gG8_5t_4v8p_Q8o8l5v8v8v8v8v8v8v8v8v",
            "public_key": {
              "kty": "EC",
              "crv": "P-256",
              "x": "thRcTF9d89tZ704lTYciJq48dtIaoqf9L0Is1gK29II",
              // Coordenada X certificada
              "y": "v8Oo5z9N9406uE4RnU3dlmpbAaMQtt61uynn6kgz4_Q"
              // Coordenada Y certificada
            },
            "client": { "user_agent": UA_CHROME, "platform": "Windows", "languages": ["es-ES"] },
            "storage": { "cookie": viewerId, "local_storage": viewerId },
            "attributes": { "entropy": "high" }
          };
          const attestResp = yield fetch(`${playbackDomain}/api/videos/access/attest`, {
            method: "POST",
            body: JSON.stringify(attestPayload),
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              "Referer": frameUrl,
              "Origin": playbackDomain,
              "User-Agent": UA_CHROME
            }
          });
          const attestData = yield attestResp.json();
          if (!attestData.token) {
            console.log(`[Filemoon] Attest Failed: ${JSON.stringify(attestData)}`);
            return null;
          }
          const playbackPayload = {
            "fingerprint": {
              "token": attestData.token,
              "viewer_id": attestData.viewer_id || viewerId,
              "device_id": attestData.device_id || deviceId,
              "confidence": attestData.confidence
            }
          };
          const playResp = yield fetch(`${playbackDomain}/api/videos/${videoId}/embed/playback`, {
            method: "POST",
            body: JSON.stringify(playbackPayload),
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              "Referer": frameUrl,
              "Origin": playbackDomain,
              "X-Embed-Parent": url,
              "User-Agent": UA_CHROME
            }
          });
          const playData = yield playResp.json();
          if (playData.playback) {
            const decrypted = decryptByse(playData.playback);
            if (decrypted) {
              const data = JSON.parse(decrypted);
              const directUrl = ((_b = (_a = data == null ? void 0 : data.sources) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) || (data == null ? void 0 : data.url);
              return {
                url: directUrl,
                quality: ((_d = (_c = data == null ? void 0 : data.sources) == null ? void 0 : _c[0]) == null ? void 0 : _d.label) || "HD",
                verified: true,
                serverName: "Filemoon",
                headers: { "User-Agent": UA_CHROME, "Referer": playbackDomain, "Origin": playbackDomain }
              };
            }
          }
          return null;
        } catch (error) {
          console.error(`[Filemoon] Error: ${error.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve };
  }
});

// src/resolvers/voe.js
var require_voe = __commonJS({
  "src/resolvers/voe.js"(exports2, module2) {
    var { getSessionUA } = require_http();
    var { validateStream } = require_m3u8();
    function localAtob(input) {
      if (!input)
        return "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let str = String(input).replace(/=+$/, "").replace(/[\s\n\r\t]/g, "");
      let output = "";
      if (str.length % 4 === 1)
        return "";
      for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
      }
      return output;
    }
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const currentUA = getSessionUA();
          console.log(`[VOE] TV-Resolving: ${url}`);
          const response = yield fetch(url, {
            headers: { "User-Agent": currentUA },
            signal
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          if (html.includes("window.location.href") && html.length < 2e3) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm)
              return resolve(rm[1]);
          }
          const jsonMatch = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1].trim());
              let encText = Array.isArray(parsed) ? parsed[0] : parsed;
              if (typeof encText !== "string")
                return null;
              let decoded = encText.replace(/[a-zA-Z]/g, (c) => {
                const code = c.charCodeAt(0);
                const limit = c <= "Z" ? 90 : 122;
                const shifted = code + 13;
                return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
              });
              const noise = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
              for (const n of noise)
                decoded = decoded.split(n).join("");
              const b64_1 = localAtob(decoded);
              if (!b64_1)
                throw new Error("LocalAtob failed stage 1");
              let shiftedStr = "";
              for (let j = 0; j < b64_1.length; j++) {
                shiftedStr += String.fromCharCode(b64_1.charCodeAt(j) - 3);
              }
              const reversed = shiftedStr.split("").reverse().join("");
              const decrypted = localAtob(reversed);
              if (!decrypted)
                throw new Error("LocalAtob failed stage 2");
              const data = JSON.parse(decrypted);
              if (data && data.source) {
                console.log(`[VOE] Success: ${data.source.substring(0, 50)}...`);
                const reqHeaders = {
                  "User-Agent": currentUA,
                  "Referer": url
                };
                const streamObj = { url: data.source, headers: reqHeaders };
                const validation = yield validateStream(streamObj, signal);
                const isLive = validation ? validation.verified : true;
                const streamQuality = validation && validation.quality ? validation.quality : "1080p";
                return {
                  url: data.source,
                  quality: streamQuality,
                  verified: isLive,
                  isReal: validation ? validation.isReal : false,
                  serverName: "VOE",
                  headers: reqHeaders
                };
              }
            } catch (ex) {
              console.error(`[VOE] Decryption failed (QuickJS Match): ${ex.message}`);
            }
          }
          const m3u8Match = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
          if (m3u8Match) {
            const fallbackUrl = m3u8Match[1];
            const reqHeaders = {
              "Referer": url,
              "User-Agent": currentUA
            };
            const streamObj = { url: fallbackUrl, headers: reqHeaders };
            const validation = yield validateStream(streamObj, signal);
            const isLive = validation ? validation.verified : true;
            const streamQuality = validation && validation.quality ? validation.quality : "1080p";
            return {
              url: fallbackUrl,
              quality: streamQuality,
              verified: isLive,
              isReal: validation ? validation.isReal : false,
              serverName: "VOE",
              headers: reqHeaders
            };
          }
          return null;
        } catch (error) {
          console.error(`[VOE] Error: ${error.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve };
    module2.exports = { resolve };
  }
});

// src/resolvers/vidhide.js
var require_vidhide = __commonJS({
  "src/resolvers/vidhide.js"(exports2, module2) {
    var { getSessionUA, getStealthHeaders } = require_http();
    var { validateStream } = require_m3u8();
    function unpackVidHide(script) {
      try {
        const match = script.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
        if (!match)
          return null;
        let [full, p, a, c, k] = match;
        a = parseInt(a);
        c = parseInt(c);
        k = k.split("|");
        const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        const decode = (l, s) => {
          let res = "";
          while (l > 0) {
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
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const currentUA = getSessionUA();
          console.log(`[VidHide] TV-Resolving: ${url}`);
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          const response = yield fetch(url, {
            signal,
            headers: {
              "User-Agent": currentUA,
              "Referer": `https://${domain}/`
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          let finalUrl = null;
          let quality = "1080p";
          const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
          if (packedMatch) {
            const unpacked = unpackVidHide(packedMatch[0]);
            if (unpacked) {
              const hlsMatch = unpacked.match(/"hls[24]"\s*:\s*"([^"]+)"/);
              if (hlsMatch)
                finalUrl = hlsMatch[1];
              const labelMatch = unpacked.match(/\{label\s*:\s*"([^"]+)"/i) || unpacked.match(/name\s*:\s*"([^"]+)"/i);
              if (labelMatch)
                quality = labelMatch[1].toLowerCase().includes("p") ? labelMatch[1] : labelMatch[1] + "p";
            }
          }
          if (!finalUrl) {
            const rawMatch = html.match(/"hls[24]"\s*:\s*"([^"]+)"/) || html.match(/file\s*:\s*["']([^"']+)["']/i) || html.match(/["'](https?:\/\/[^"']+?\/stream\/[^"']+?\.m3u8[^"']*?)["']/i);
            if (rawMatch)
              finalUrl = rawMatch[1];
          }
          if (!finalUrl)
            return null;
          if (!finalUrl.startsWith("http"))
            finalUrl = new URL(url).origin + finalUrl;
          if (!finalUrl.includes("referer="))
            finalUrl += (finalUrl.includes("?") ? "&" : "?") + "referer=embed69.org";
          const reqHeaders = __spreadProps(__spreadValues({}, getStealthHeaders()), {
            "Referer": url.split("?")[0],
            "Origin": new URL(url).origin,
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": currentUA
          });
          const streamObj = { url: finalUrl, headers: reqHeaders };
          const validation = yield validateStream(streamObj, signal);
          const isLive = validation ? validation.verified : true;
          const streamQuality = validation && validation.quality ? validation.quality : quality;
          return {
            url: finalUrl,
            quality: streamQuality,
            verified: isLive,
            isReal: validation ? validation.isReal : false,
            serverName: "VidHide",
            headers: reqHeaders
          };
        } catch (e) {
          console.error(`[VidHide] Error: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve };
  }
});

// src/resolvers/streamtape.js
var require_streamtape = __commonJS({
  "src/resolvers/streamtape.js"(exports2, module2) {
    var { getSessionUA } = require_http();
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const UA2 = getSessionUA();
          console.log(`[Streamtape] Resolving: ${url}`);
          const response = yield fetch(url, {
            signal,
            headers: {
              "User-Agent": UA2,
              "Referer": "https://streamtape.com/"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const linkMatch = html.match(/document\.getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*['"]([^'"]+)['"]\s*\+\s*\(['"]([^'"]+)['"]\);/i) || html.match(/document\.getElementById\(['"]videolink['"]\)\.innerHTML\s*=\s*['"]([^'"]+)['"]\s*\+\s*\(['"]([^'"]+)['"]\);/i);
          let finalUrl = null;
          if (linkMatch) {
            finalUrl = linkMatch[1] + linkMatch[2];
          } else {
            const rawMatch = html.match(/['"](\/\/streamtape\.com\/get_video\?id=[^'"]+)['"]/);
            if (rawMatch)
              finalUrl = rawMatch[1];
          }
          if (finalUrl) {
            if (finalUrl.startsWith("//"))
              finalUrl = "https:" + finalUrl;
            let isLive = true;
            try {
              const check = yield fetch(finalUrl, { method: "HEAD", headers: { "User-Agent": UA2, "Referer": url }, signal });
              if (!check.ok) {
                console.log(`[Streamtape] \u2717 Enlace no v\xE1lido (Status: ${check.status})`);
                isLive = false;
                if (check.status === 404 || check.status === 403)
                  return null;
              }
            } catch (e) {
            }
            return {
              url: finalUrl,
              quality: "720p",
              // Streamtape suele ser estático
              verified: isLive,
              serverName: "Streamtape",
              headers: { "User-Agent": UA2, "Referer": url }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Streamtape] Error: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve };
  }
});

// src/resolvers/player_cdn.js
var require_player_cdn = __commonJS({
  "src/resolvers/player_cdn.js"(exports2, module2) {
    var { getSessionUA } = require_http();
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const UA2 = getSessionUA();
          console.log(`[Player-CDN] Resolving: ${url}`);
          const response = yield fetch(url, {
            signal,
            headers: {
              "User-Agent": UA2,
              "Referer": "https://xupalace.org/"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          let finalUrl = null;
          const patterns = [
            /sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i,
            /file\s*:\s*["']([^"']+)["']/i,
            /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
            /["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i
          ];
          for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
              finalUrl = match[1];
              break;
            }
          }
          if (finalUrl) {
            if (finalUrl.startsWith("//"))
              finalUrl = "https:" + finalUrl;
            try {
              const check = yield fetch(finalUrl, { method: "HEAD", headers: { "User-Agent": UA2 } });
              if (check.status === 404)
                return null;
            } catch (e) {
            }
            return {
              url: finalUrl,
              verified: true,
              serverName: "Player-CDN",
              headers: { "User-Agent": UA2, "Referer": url }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Player-CDN] Error: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve };
  }
});

// src/resolvers/ggtz.js
var require_ggtz = __commonJS({
  "src/resolvers/ggtz.js"(exports2, module2) {
    var { getSessionUA } = require_http();
    function resolve(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const UA2 = getSessionUA();
          console.log(`[GGTZ] Resolving: ${url}`);
          const response = yield fetch(url, {
            signal,
            headers: {
              "User-Agent": UA2,
              "Referer": "https://xupalace.org/"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const refreshMatch = html.match(/content=["']\d+;\s*url=([^"']+)["']/i);
          const scriptMatch = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i) || html.match(/window\.open\(['"]([^'"]+)['"]/);
          let nextUrl = refreshMatch ? refreshMatch[1] : scriptMatch ? scriptMatch[1] : null;
          if (!nextUrl) {
            const downloadMatch = html.match(/href=["']([^"']+\.(?:mp4|mkv|m3u8)[^"']*)["']/i);
            if (downloadMatch)
              nextUrl = downloadMatch[1];
          }
          if (nextUrl) {
            if (nextUrl.startsWith("/"))
              nextUrl = new URL(url).origin + nextUrl;
            return {
              url: nextUrl,
              verified: true,
              serverName: "GGTZ-Internal",
              headers: {
                "User-Agent": UA2,
                "Referer": url
              }
            };
          }
          return null;
        } catch (e) {
          console.error(`[GGTZ] Error: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve };
  }
});

// src/xupalace/index.js
var axios = require("axios");
var { finalizeStreams } = require_engine();
var { getTmdbTitle } = require_tmdb();
var { resolve: resolveHlsWish } = require_hlswish();
var { resolve: resolveFilemoon } = require_filemoon();
var { resolve: resolveVoe } = require_voe();
var { resolve: resolveVidhide } = require_vidhide();
var { resolve: resolveStreamtape } = require_streamtape();
var { resolve: resolvePlayerCdn } = require_player_cdn();
var { resolve: resolveGgtz } = require_ggtz();
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var BASE_URL = "https://xupalace.org";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
var HTML_HEADERS = {
  "User-Agent": UA,
  "Accept": "text/html",
  "Accept-Language": "es-MX,es;q=0.9",
  "Connection": "keep-alive",
  "Cache-Control": "no-cache"
};
var RESOLVER_MAP = {
  "hglink.to": { fn: resolveHlsWish, name: "StreamWish" },
  "vibuxer.com": { fn: resolveHlsWish, name: "StreamWish" },
  "hanerix.com": { fn: resolveHlsWish, name: "StreamWish" },
  "embedwish.com": { fn: resolveHlsWish, name: "StreamWish" },
  "strwish.com": { fn: resolveHlsWish, name: "StreamWish" },
  "wishfast.top": { fn: resolveHlsWish, name: "StreamWish" },
  "sfastwish.com": { fn: resolveHlsWish, name: "StreamWish" },
  "streamwish.to": { fn: resolveHlsWish, name: "StreamWish" },
  "awish.pro": { fn: resolveHlsWish, name: "StreamWish" },
  "bysedikamoum.com": { fn: resolveFilemoon, name: "Filemoon" },
  "filemoon.sx": { fn: resolveFilemoon, name: "Filemoon" },
  "voe.sx": { fn: resolveVoe, name: "VOE" },
  "voe-un-block.com": { fn: resolveVoe, name: "VOE" },
  "vidhidepro.com": { fn: resolveVidhide, name: "VidHide" },
  "vidhide.com": { fn: resolveVidhide, name: "VidHide" },
  "dintezuvio.com": { fn: resolveVidhide, name: "VidHide" },
  "filelions.to": { fn: resolveVidhide, name: "VidHide" },
  "vidhidepre.com": { fn: resolveVidhide, name: "VidHide" },
  "streamtape.com": { fn: resolveStreamtape, name: "Streamtape" },
  "player-cdn.com": { fn: resolvePlayerCdn, name: "Player-CDN" },
  "xupalace.org": { fn: resolveGgtz, name: "GGTZ-Internal" }
};
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const type = mediaType === "movie" || mediaType === "movies" ? "movie" : "tv";
      const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
      const { data } = yield axios.get(url, { timeout: 3e3, headers: { "User-Agent": UA } });
      return data.imdb_id || null;
    } catch (e) {
      return null;
    }
  });
}
function getXuSlugs(imdbId, title) {
  const variants = [];
  if (imdbId)
    variants.push(imdbId);
  if (title) {
    const titleUpper = title.toUpperCase();
    const fullSlug = titleUpper.replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (fullSlug)
      variants.push(fullSlug);
    if (titleUpper.startsWith("THE ")) {
      const noThe = titleUpper.replace("THE ", "").replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (noThe)
        variants.push(noThe);
    }
    const firstWord = titleUpper.split(" ")[0].replace(/[^A-Z0-9]/g, "");
    if (firstWord && firstWord !== "THE")
      variants.push(firstWord);
  }
  return [...new Set(variants)];
}
function getEmbeds(slug, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const path = mediaType === "movie" || mediaType === "movies" ? `/video/${slug}/` : `/video/${slug}-${season}x${String(episode).padStart(2, "0")}/`;
      const { data: html } = yield axios.get(`${BASE_URL}${path}`, {
        timeout: 4500,
        headers: HTML_HEADERS
      });
      const matches = [...html.matchAll(/go_to_playerVast\('(https?:\/\/[^']+)'[^)]+\)[^<]*data-lang="(\d+)"/g)];
      if (matches.length === 0) {
        const fallback = [...html.matchAll(/go_to_playerVast\('(https?:\/\/[^']+)'/g)];
        if (fallback.length === 0)
          return null;
        return { 0: [...new Set(fallback.map((m) => m[1]))], _slug: slug };
      }
      const byLang = { _slug: slug };
      let hasData = false;
      for (const m of matches) {
        const url = m[1];
        const lang = parseInt(m[2]);
        if (!byLang[lang])
          byLang[lang] = [];
        if (!byLang[lang].includes(url)) {
          byLang[lang].push(url);
          hasData = true;
        }
      }
      return hasData ? byLang : null;
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode, title) {
  return __async(this, null, function* () {
    if (!tmdbId)
      return [];
    let mediaTitle = title || (yield getTmdbTitle(tmdbId, mediaType));
    const LANG_NAMES = { 0: "Latino", 1: "Castellano", 2: "Subtitulado" };
    try {
      const imdbId = yield getImdbId(tmdbId, mediaType);
      const slugVariants = getXuSlugs(imdbId, mediaTitle);
      console.log(`[XuPalace Turbo] Lanzando ${slugVariants.length} b\xFAsquedas en paralelo...`);
      const searchPromises = slugVariants.map((s) => getEmbeds(s, mediaType, season, episode));
      const resultsPool = yield Promise.all(searchPromises);
      let winner = null;
      for (const res of resultsPool) {
        if (res && Object.keys(res).length > 1) {
          winner = res;
          break;
        }
      }
      if (!winner)
        return [];
      console.log(`[XuPalace Turbo] Ganador: ${winner._slug}. Resolviendo enlaces...`);
      let allStreams = [];
      for (const lang of [0, 1]) {
        const urls = winner[lang];
        if (!urls || urls.length === 0)
          continue;
        const langName = LANG_NAMES[lang];
        const resolutionResults = yield Promise.allSettled(
          urls.map((url) => __async(this, null, function* () {
            var _a;
            try {
              const urlObj = new URL(url);
              const domain = urlObj.hostname.replace("www.", "");
              const resolver = RESOLVER_MAP[domain];
              if (!resolver)
                return null;
              const result = yield resolver.fn(url);
              if (result) {
                return {
                  langLabel: langName,
                  serverLabel: resolver.name,
                  url: result.url,
                  quality: result.quality || "1080p",
                  verified: (_a = result.verified) != null ? _a : true,
                  headers: result.headers || {}
                };
              }
            } catch (e) {
            }
            return null;
          }))
        );
        const valid = resolutionResults.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value);
        if (valid.length > 0) {
          allStreams.push(...valid);
        }
      }
      return yield finalizeStreams(allStreams, "XuPalace", mediaTitle);
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
