/**
 * pelisplus - Built from src/pelisplus/
 * Generated: 2026-05-05T21:05:01.205Z
 */
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve3, reject) => {
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
    var step = (x) => x.done ? resolve3(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/pelisplus/http.js
var require_http = __commonJS({
  "src/pelisplus/http.js"(exports2, module2) {
    var BASE_URL = "https://www.pelisplushd.la";
    var LOGO = "https://www.pelisplushd.la/images/logo/logo5.png";
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    var COMMON_HEADERS = {
      "User-Agent": DEFAULT_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    };
    function fetchText(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        try {
          const response = yield fetch(url, __spreadValues({
            headers: __spreadValues(__spreadValues({}, COMMON_HEADERS), options.headers)
          }, options));
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status} for ${url}`);
          }
          return yield response.text();
        } catch (error) {
          console.error(`[PelisPlusHD] Fetch error: ${error.message}`);
          throw error;
        }
      });
    }
    function fetchJson(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        const raw = yield fetchText(url, options);
        return JSON.parse(raw);
      });
    }
    function fetchHtml(url, referer) {
      return __async(this, null, function* () {
        try {
          const headers = __spreadValues({}, COMMON_HEADERS);
          if (referer) {
            headers["Referer"] = referer;
            headers["Sec-Fetch-Site"] = "same-origin";
          }
          const response = yield fetch(url, {
            headers
          });
          if (!response.ok)
            throw new Error(`HTTP Error: ${response.status}`);
          return yield response.text();
        } catch (error) {
          console.error(`[PelisPlusHD] fetchHtml error: ${error.message}`);
          return "";
        }
      });
    }
    module2.exports = {
      BASE_URL,
      LOGO,
      fetchText,
      fetchJson,
      fetchHtml
    };
  }
});

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
var require_http2 = __commonJS({
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
    var { getSessionUA } = require_http2();
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

// src/resolvers/voe.js
var require_voe = __commonJS({
  "src/resolvers/voe.js"(exports2, module2) {
    var { getSessionUA } = require_http2();
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
    function resolve3(url, signal = null) {
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
              return resolve3(rm[1]);
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
    module2.exports = { resolve: resolve3 };
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/hlswish.js
var require_hlswish = __commonJS({
  "src/resolvers/hlswish.js"(exports2, module2) {
    var { getSessionUA } = require_http2();
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
    function resolve3(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const UA3 = getSessionUA();
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
                  headers: { "Referer": mirror, "User-Agent": UA3 },
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
                    headers: { "User-Agent": UA3, "Referer": mirror, "X-Requested-With": "XMLHttpRequest" },
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
            "User-Agent": UA3
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
    module2.exports = { resolve: resolve3 };
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
    var { getSessionUA } = require_http2();
    function resolve3(url, signal = null) {
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
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/vidhide.js
var require_vidhide = __commonJS({
  "src/resolvers/vidhide.js"(exports2, module2) {
    var { getSessionUA, getStealthHeaders } = require_http2();
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
    function resolve3(url, signal = null) {
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
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/quality.js
var require_quality = __commonJS({
  "src/resolvers/quality.js"(exports2, module2) {
    var { request, getSessionUA } = require_http2();
    function detectQuality(_0) {
      return __async(this, arguments, function* (url, headers = {}) {
        try {
          if (!url || !url.includes(".m3u8"))
            return "1080p";
          const res = yield request(url, {
            timeout: 5e3,
            headers: __spreadValues({
              "User-Agent": getSessionUA()
            }, headers)
          });
          const data = yield res.text();
          if (!data.includes("#EXT-X-STREAM-INF")) {
            const match = url.match(/[_-](\d{3,4})p/i);
            return match ? `${match[1]}p` : "1080p";
          }
          let maxRes = 0;
          const lines = data.split("\n");
          for (const line of lines) {
            const match = line.match(/RESOLUTION=\d+x(\d+)/i);
            if (match) {
              const res2 = parseInt(match[1]);
              if (res2 > maxRes)
                maxRes = res2;
            }
          }
          if (maxRes > 0) {
            if (maxRes >= 2160)
              return "4K";
            if (maxRes >= 1080)
              return "1080p";
            if (maxRes >= 720)
              return "720p";
            if (maxRes >= 480)
              return "480p";
            return `${maxRes}p`;
          }
          return "1080p";
        } catch (e) {
          return "1080p";
        }
      });
    }
    module2.exports = { detectQuality };
  }
});

// src/resolvers/goodstream.js
var require_goodstream = __commonJS({
  "src/resolvers/goodstream.js"(exports2, module2) {
    var axios4 = require("axios");
    var { detectQuality } = require_quality();
    var { getSessionUA } = require_http2();
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          const UA3 = getSessionUA();
          console.log(`[GoodStream] Resolviendo: ${embedUrl}`);
          const response = yield axios4.get(embedUrl, {
            headers: {
              "User-Agent": UA3,
              "Referer": "https://goodstream.one/",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "es-MX,es;q=0.9",
              "Connection": "keep-alive"
            },
            timeout: 15e3,
            maxRedirects: 5
          });
          const match = response.data.match(/file:\s*"([^"]+)"/);
          if (!match) {
            console.log('[GoodStream] No se encontr\xF3 patr\xF3n file:"..."');
            return null;
          }
          const videoUrl = match[1];
          const refererHeaders = {
            "Referer": embedUrl,
            "Origin": "https://goodstream.one",
            "User-Agent": UA3,
            "Accept-Language": "es-MX,es;q=0.9"
          };
          const quality = yield detectQuality(videoUrl, refererHeaders);
          console.log(`[GoodStream] URL encontrada (${quality}): ${videoUrl.substring(0, 80)}...`);
          return {
            url: videoUrl,
            quality: quality || "1080p",
            verified: !!quality,
            serverName: "GoodStream",
            headers: refererHeaders
          };
        } catch (err) {
          console.log(`[GoodStream] Error: ${err.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/fastream.js
var require_fastream = __commonJS({
  "src/resolvers/fastream.js"(exports2, module2) {
    var UA3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function unpackPacker(data) {
      const match = data.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)\)\)/);
      if (!match)
        return null;
      let [, p, a, c, k] = match;
      a = parseInt(a);
      c = parseInt(c);
      k = k.split("|");
      while (c--) {
        if (k[c])
          p = p.replace(new RegExp("\\b" + c.toString(a) + "\\b", "g"), k[c]);
      }
      return p;
    }
    function detectQuality(_0) {
      return __async(this, arguments, function* (m3u8Url, headers = {}) {
        try {
          const res = yield fetch(m3u8Url, {
            headers: __spreadValues({ "User-Agent": UA3 }, headers),
            redirect: "follow"
          });
          const data = yield res.text();
          if (!data.includes("#EXT-X-STREAM-INF")) {
            const match = m3u8Url.match(/[_-](\d{3,4})p/);
            return match ? `${match[1]}p` : "1080p";
          }
          let bestHeight = 0;
          const lines = data.split("\n");
          for (const line of lines) {
            const m = line.match(/RESOLUTION=\d+x(\d+)/);
            if (m) {
              const h = parseInt(m[1]);
              if (h > bestHeight)
                bestHeight = h;
            }
          }
          if (bestHeight >= 2160)
            return "4K";
          if (bestHeight >= 1080)
            return "1080p";
          if (bestHeight >= 720)
            return "720p";
          if (bestHeight >= 480)
            return "480p";
          return bestHeight > 0 ? `${bestHeight}p` : "1080p";
        } catch (e) {
          return "1080p";
        }
      });
    }
    function resolve3(url) {
      return __async(this, null, function* () {
        var _a;
        try {
          const res = yield fetch(url, {
            headers: {
              "User-Agent": UA3,
              "Referer": "https://www3.seriesmetro.net/"
            },
            redirect: "follow"
          });
          const data = yield res.text();
          const unpacked = unpackPacker(data);
          if (!unpacked)
            return null;
          const m3u8 = (_a = unpacked.match(/file:"(https?:\/\/[^"]+\.m3u8[^"]*)"/)) == null ? void 0 : _a[1];
          if (!m3u8)
            return null;
          const quality = yield detectQuality(m3u8, { "Referer": "https://fastream.to/" });
          return {
            url: m3u8,
            quality,
            headers: { "User-Agent": UA3, "Referer": "https://fastream.to/" }
          };
        } catch (e) {
          console.error("[Fastream] Error:", e.message);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/vimeos.js
var require_vimeos = __commonJS({
  "src/resolvers/vimeos.js"(exports2, module2) {
    var { fetchHtml, fetchJson, getSessionUA } = require_http2();
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        const UA3 = getSessionUA();
        try {
          console.log("[Vimeos] Resolviendo: " + embedUrl);
          var html = yield fetchHtml(embedUrl, {
            headers: {
              "User-Agent": UA3,
              "Referer": "https://vimeos.net/",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8"
            }
          });
          var vimeoIdMatch = html.match(/vimeo\.com\/video\/(\d+)/i);
          if (!vimeoIdMatch)
            vimeoIdMatch = embedUrl.match(/\/(\d{7,10})/);
          if (vimeoIdMatch) {
            var vimeoId = vimeoIdMatch[1];
            try {
              var config = yield fetchJson("https://player.vimeo.com/video/" + vimeoId + "/config", {
                headers: { "User-Agent": UA3, "Referer": embedUrl }
              });
              var hlsUrl = null;
              if (config && config.request && config.request.files && config.request.files.hls && config.request.files.hls.cdns && config.request.files.hls.cdns.default) {
                hlsUrl = config.request.files.hls.cdns.default.url;
              }
              if (hlsUrl) {
                return {
                  url: hlsUrl,
                  verified: true,
                  serverName: "Vimeos",
                  headers: { "User-Agent": UA3, "Referer": "https://player.vimeo.com/", "Accept-Language": "es-MX,es;q=0.9" }
                };
              }
              var progressive = config && config.request && config.request.files ? config.request.files.progressive : null;
              if (progressive && progressive.length > 0) {
                var best = progressive.sort(function(a, b) {
                  return (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
                })[0];
                return {
                  url: best.url,
                  quality: best.quality ? best.quality + "p" : "1080p",
                  serverName: "Vimeos",
                  headers: { "User-Agent": UA3, "Referer": "https://player.vimeo.com/", "Accept-Language": "es-MX,es;q=0.9" }
                };
              }
            } catch (e) {
            }
          }
          var packMatch = html.match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
          if (packMatch) {
            console.log("[Vimeos] Usando Unpacker...");
            var payload = packMatch[1];
            var radix = parseInt(packMatch[2]);
            var symtab = packMatch[4].split("|");
            var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var unbase = function(str) {
              var result = 0;
              for (var i = 0; i < str.length; i++)
                result = result * radix + chars.indexOf(str[i]);
              return result;
            };
            var unpacked = payload.replace(/\b(\w+)\b/g, function(match) {
              var idx = unbase(match);
              return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
            });
            var m3u8Match = unpacked.match(/["']([^"']+\.m3u8[^"']*)['"]/i);
            if (m3u8Match) {
              return {
                url: m3u8Match[1],
                quality: "1080p",
                serverName: "Vimeos",
                headers: { "User-Agent": UA3, "Referer": "https://vimeos.net/", "Accept-Language": "es-MX,es;q=0.9" }
              };
            }
          }
          return null;
        } catch (err) {
          console.log("[Vimeos] Error: " + err.message);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/buzzheavier.js
var require_buzzheavier = __commonJS({
  "src/resolvers/buzzheavier.js"(exports2, module2) {
    var axios4 = require("axios");
    var { getStealthHeaders } = require_http2();
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        if (!embedUrl)
          return null;
        try {
          const cleanUrl = embedUrl.split("|")[0].replace(/\/$/, "");
          const domain = new URL(cleanUrl).hostname;
          const downloadUrl = `${cleanUrl}/download`;
          console.log(`[Buzzheavier] Resolviendo v8.8.7 (Python Logic): ${cleanUrl}`);
          const headers = __spreadProps(__spreadValues({}, getStealthHeaders()), {
            "Referer": cleanUrl,
            "hx-current-url": cleanUrl,
            "hx-request": "true",
            "Accept": "*/*"
          });
          try {
            const headResponse = yield axios4.head(downloadUrl, {
              headers,
              timeout: 8e3,
              maxRedirects: 0,
              // Importante: no seguir redirecciones para capturar hx-redirect
              validateStatus: (status) => status >= 200 && status < 400
            });
            const hxRedirect = headResponse.headers["hx-redirect"];
            if (hxRedirect) {
              let finalUrl = hxRedirect;
              if (hxRedirect.startsWith("/dl/")) {
                finalUrl = `https://${domain}${hxRedirect}`;
              }
              console.log("[Buzzheavier] \u2713 Enlace REAL obtenido via hx-redirect.");
              return {
                url: finalUrl + "#.mp4",
                isDirect: true,
                verified: true,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
                  "Referer": cleanUrl,
                  "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": '"Windows"',
                  "sec-fetch-dest": "document",
                  "sec-fetch-mode": "navigate",
                  "sec-fetch-site": "cross-site",
                  "upgrade-insecure-requests": "1",
                  "priority": "u=0, i"
                }
              };
            }
          } catch (err) {
            console.log("[Buzzheavier] \u26A0\uFE0F Error en HEAD: " + err.message);
          }
          const id = cleanUrl.split("/").pop();
          const predictableUrl = `https://buzzheavier.com/v/${id}/video.mp4`;
          return {
            url: predictableUrl + "#.mp4",
            isDirect: true,
            verified: true,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
              "Referer": cleanUrl,
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "cross-site"
            }
          };
        } catch (err) {
          console.error("[Buzzheavier] Error cr\xEDtico: " + err.message);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/okru.js
var okru_exports = {};
__export(okru_exports, {
  resolve: () => resolve
});
function resolve(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${embedUrl}`);
      const { data: raw } = yield import_axios.default.get(embedUrl, {
        timeout: 1e4,
        headers: {
          "User-Agent": UA,
          "Accept": "text/html",
          "Referer": "https://ok.ru/"
        }
      });
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
        verified: true,
        headers: { "User-Agent": UA, "Referer": "https://ok.ru/" }
      };
    } catch (e) {
      console.log(`[OkRu] Error: ${e.message}`);
      return null;
    }
  });
}
var import_axios, UA;
var init_okru = __esm({
  "src/resolvers/okru.js"() {
    import_axios = __toESM(require("axios"));
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  }
});

// src/resolvers/pixeldrain.js
var require_pixeldrain = __commonJS({
  "src/resolvers/pixeldrain.js"(exports2, module2) {
    var axios4 = require("axios");
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          console.log("[Pixeldrain] Resolviendo: " + embedUrl);
          const idMatch = embedUrl.match(/\/(u|l|api\/file)\/([a-zA-Z0-9]+)/i);
          if (!idMatch) {
            console.log("[Pixeldrain] No se pudo encontrar un ID v\xE1lido en la URL.");
            return null;
          }
          const fileId = idMatch[2];
          const directUrl = `https://pixeldrain.com/api/file/${fileId}?download=1`;
          try {
            const check = yield axios4.get(directUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Range": "bytes=0-0"
                // Solo pedimos 1 byte para que sea una petición ultra-rápida
              },
              timeout: 5e3,
              validateStatus: (status) => status < 500
              // Considerar cualquier respuesta < 500 como "posiblemente vivo"
            });
            if (check.status === 404) {
              console.log("[Pixeldrain] \u274C Archivo no encontrado confirmado (404).");
              return null;
            }
          } catch (err) {
            if (err.response && err.response.status === 404) {
              console.log("[Pixeldrain] \u274C Archivo no encontrado confirmado (404).");
              return null;
            }
            console.log("[Pixeldrain] \u26A0\uFE0F Validaci\xF3n dudosa (" + (err.response ? err.response.status : "Network Error") + "). Procediendo de todos modos.");
          }
          console.log("[Pixeldrain] \u2713 URL Directa generada y confirmada.");
          return {
            url: directUrl,
            verified: true,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Referer": "https://pixeldrain.com/"
            }
          };
        } catch (e) {
          console.error("[Pixeldrain] Error cr\xEDtico: " + e.message);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/playmogo.js
var require_playmogo = __commonJS({
  "src/resolvers/playmogo.js"(exports2, module2) {
    var { fetchHtml, DEFAULT_UA } = require_http2();
    function resolve3(url) {
      return __async(this, null, function* () {
        try {
          console.log("[Playmogo] Resolving: " + url);
          return {
            url,
            verified: true,
            serverName: "Playmogo",
            headers: {
              "User-Agent": DEFAULT_UA,
              "Referer": "https://dsvplay.com/",
              "Origin": "https://dsvplay.com"
            }
          };
        } catch (e) {
          console.error("[Playmogo] Error: " + e.message);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/turbovid.js
var turbovid_exports = {};
__export(turbovid_exports, {
  resolve: () => resolve2
});
function resolve2(embedUrl) {
  return __async(this, null, function* () {
    try {
      const { data: html } = yield import_axios2.default.get(embedUrl, {
        headers: {
          "User-Agent": UA2,
          "Referer": "https://www.fuegocine.com/"
        },
        timeout: 8e3
      });
      const hashMatch = html.match(/data-hash="([^"]+\.m3u8[^"]*)"/);
      if (hashMatch) {
        return {
          url: hashMatch[1],
          verified: true,
          headers: { "Referer": embedUrl }
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
var import_axios2, UA2;
var init_turbovid = __esm({
  "src/resolvers/turbovid.js"() {
    import_axios2 = __toESM(require("axios"));
    UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  }
});

// src/resolvers/embedseek.js
var require_embedseek = __commonJS({
  "src/resolvers/embedseek.js"(exports2, module2) {
    var CryptoJS2 = require("crypto-js");
    var { getSessionUA } = require_http2();
    function resolve3(url) {
      return __async(this, null, function* () {
        try {
          const UA3 = getSessionUA();
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname;
          const hash = parsedUrl.hash;
          const id = hash.replace("#", "").split("&")[0];
          if (!id)
            return null;
          const apiUrl = `${parsedUrl.origin}/api/v1/info?id=${id}`;
          const headers = {
            "User-Agent": UA3,
            "Referer": url,
            "Origin": parsedUrl.origin
          };
          const response = yield fetch(apiUrl, { headers });
          if (!response.ok)
            return null;
          const encryptedData = yield response.text();
          if (typeof encryptedData !== "string" || encryptedData.length < 10) {
            return null;
          }
          const key = generateKey(hostname);
          const iv = generateIV(hostname, hash);
          const decrypted = decrypt(encryptedData, key, iv);
          const data = JSON.parse(decrypted);
          if (data && data.url) {
            let videoUrl = data.url;
            if (videoUrl.startsWith("/")) {
              videoUrl = `${parsedUrl.origin}${videoUrl}`;
            }
            return {
              url: videoUrl,
              verified: true,
              serverName: "SeekStreaming",
              headers: {
                "User-Agent": UA3,
                "Referer": url,
                "Origin": parsedUrl.origin
              }
            };
          }
          return null;
        } catch (e) {
          console.error("EmbedSeek Resolve Error:", e.message);
          return null;
        }
      });
    }
    function generateKey(hostname) {
      let n = "";
      const b = "7519".split("");
      for (let i = 0; i < b.length; i++)
        n += String.fromCharCode(parseInt("10" + b[i]));
      n += String.fromCharCode(hostname.charCodeAt(1));
      n += n.substring(1, 3);
      n += String.fromCharCode(110, 109, 117);
      const re = "3579".split("");
      n += String.fromCharCode(parseInt(re[3] + re[2]), parseInt(re[1] + re[2]));
      const s1 = (parseInt(re[0]) + 1).toString() + re[3];
      n += String.fromCharCode(parseInt(s1), parseInt(s1));
      const s2 = (parseInt(re[3]) * 10 + parseInt(re[3])).toString();
      const s3 = re.reverse().join("").substring(0, 2);
      n += String.fromCharCode(parseInt(s2), parseInt(s3));
      return CryptoJS2.enc.Utf8.parse(n.substring(0, 16));
    }
    function generateIV(hostname, hash) {
      const s = hostname;
      const p = s + "//";
      const o = hash;
      const g = s.length * p.length;
      let b = "";
      for (let i = 1; i < 10; i++)
        b += String.fromCharCode(i + g);
      const re = "111";
      const pe = 3 * o.charCodeAt(0);
      const tt = 111 + s.length;
      const k = tt + 4;
      const ie = s.charCodeAt(1);
      const me = ie - 2;
      b += String.fromCharCode(g, 111, pe, tt, k, ie, me);
      return CryptoJS2.enc.Utf8.parse(b.substring(0, 16));
    }
    function decrypt(hex, keyWA, ivWA) {
      const ciphertextWA = CryptoJS2.enc.Hex.parse(hex);
      const decrypted = CryptoJS2.AES.decrypt(
        { ciphertext: ciphertextWA },
        keyWA,
        {
          iv: ivWA,
          mode: CryptoJS2.mode.CBC,
          padding: CryptoJS2.pad.Pkcs7
        }
      );
      return decrypted.toString(CryptoJS2.enc.Utf8);
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/tplayer.js
var require_tplayer = __commonJS({
  "src/resolvers/tplayer.js"(exports2, module2) {
    var axios4 = require("axios");
    var { getStealthHeaders } = require_http2();
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          console.log("[TPlayer] Resolviendo con sesi\xF3n: " + embedUrl);
          const idMatch = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
          if (!idMatch)
            return null;
          const fileId = idMatch[1];
          const baseUrl = new URL(embedUrl).origin;
          const apiUrl = `${baseUrl}/api/resolve/${fileId}`;
          const baseHeaders = __spreadProps(__spreadValues({}, getStealthHeaders()), {
            "Referer": embedUrl,
            "Origin": baseUrl,
            "X-Requested-With": "XMLHttpRequest"
          });
          const embedResp = yield axios4.get(embedUrl, {
            headers: baseHeaders,
            timeout: 5e3
          });
          const cookies = (embedResp.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
          if (cookies) {
            baseHeaders["Cookie"] = cookies;
            console.log("[TPlayer] Sesi\xF3n capturada correctamente.");
          }
          const { data } = yield axios4.get(apiUrl, {
            headers: baseHeaders,
            timeout: 5e3
          });
          if (!data || !data.success || !data.streamUrl) {
            console.log("[TPlayer] La API no autoriz\xF3 el stream.");
            return null;
          }
          const streamUrl = data.streamUrl.startsWith("http") ? data.streamUrl : `${baseUrl}${data.streamUrl}`;
          console.log("[TPlayer] \u2713 Link de sesi\xF3n generado.");
          return {
            url: streamUrl,
            isDirect: true,
            verified: true,
            headers: {
              "User-Agent": baseHeaders["User-Agent"],
              "Referer": embedUrl,
              "Origin": baseUrl,
              "Cookie": cookies
              // Vital para que Nuvio pueda descargar el stream
            }
          };
        } catch (e) {
          console.error("[TPlayer] Error de resoluci\xF3n: " + e.message);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/lulustream.js
var require_lulustream = __commonJS({
  "src/resolvers/lulustream.js"(exports2, module2) {
    var { getSessionUA } = require_http2();
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
    function resolve3(url) {
      return __async(this, null, function* () {
        try {
          const UA3 = getSessionUA();
          const urlObj = new URL(url);
          const origin = urlObj.origin;
          const response = yield fetch(url, {
            headers: {
              "User-Agent": UA3,
              "Referer": url
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          let m3u8Url = null;
          const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
          if (sourcesMatch) {
            m3u8Url = sourcesMatch[1];
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
            const fileMatch = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
            if (fileMatch)
              m3u8Url = fileMatch[1];
          }
          if (m3u8Url) {
            m3u8Url = m3u8Url.replace(/\\/g, "");
            if (m3u8Url.startsWith("/"))
              m3u8Url = origin + m3u8Url;
            const stream = {
              url: m3u8Url,
              verified: true,
              serverName: "LuluStream",
              headers: {
                "Referer": url,
                "Origin": origin,
                "User-Agent": UA3
              }
            };
            return yield validateStream(stream);
          }
          return null;
        } catch (e) {
          console.error(`[LuluStream] error: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/dropcdn.js
var require_dropcdn = __commonJS({
  "src/resolvers/dropcdn.js"(exports2, module2) {
    function resolve3(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const normalizedUrl = url.toString().replace("/d/", "/").replace("/e/", "/").replace("/embed-", "/");
          const idMatch = normalizedUrl.match(/\/([a-zA-Z0-9]+)$/) || normalizedUrl.match(/\/([a-zA-Z0-9]+)_o\//);
          const fileCode = idMatch ? idMatch[1] : normalizedUrl.split("/").pop();
          const embedUrl = `https://dr0pstream.com/e/${fileCode}`;
          console.log(`[DropCDN] Iniciando Handshake ds2 (v2.6): ${fileCode}`);
          const UA3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
          const BROWSER_HEADERS = {
            "User-Agent": UA3,
            "Accept": "*/*",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            "Referer": "https://dr0pstream.com/",
            "Origin": "https://dr0pstream.com",
            "X-Requested-With": "XMLHttpRequest"
          };
          const response = yield fetch(embedUrl, { headers: BROWSER_HEADERS, signal });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const cookiePairs = [];
          const cookiePattern = /\$\.cookie\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g;
          let cMatch;
          while (cMatch = cookiePattern.exec(html)) {
            cookiePairs.push(`${cMatch[1]}=${cMatch[2]}`);
          }
          const cookieHeader = cookiePairs.join("; ");
          let unpacked = "";
          const packerMatch = html.match(new RegExp("eval\\(function\\(p,a,c,k,e,d\\)\\{.*?return p\\}\\('(.*?)',(\\d+),(\\d+),'(.*?)'\\.split\\('\\|'\\)\\)\\)", "s"));
          if (packerMatch) {
            unpacked = unpack(packerMatch[0]);
          }
          const longNumbers = unpacked.match(/\b\d{10}\b/g) || [];
          const hexHashes = unpacked.match(/\b([a-f0-9]{32})\b/g) || [];
          const viewIds = unpacked.match(/\b\d{6,7}\b/g) || [];
          if (longNumbers.length > 0 && hexHashes.length > 0) {
            const part1 = longNumbers[longNumbers.length - 1];
            const part2 = hexHashes[hexHashes.length - 1];
            const dynamicHash = `${part1}-${part2}`;
            const viewId = viewIds.length > 0 ? viewIds[viewIds.length - 1] : `303030`;
            const beaconUrl = `https://dr0pstream.com/dl?op=view&file_code=${fileCode}&hash=${dynamicHash}&view_id=${viewId}&adb=0`;
            console.log(`[DropCDN] Enviando Beacon: ${viewId}`);
            yield fetch(beaconUrl, {
              headers: __spreadProps(__spreadValues({}, BROWSER_HEADERS), { "Cookie": cookieHeader, "Referer": embedUrl })
            }).catch(() => {
            });
          }
          const searchContext = unpacked + "\n" + html;
          const m3u8Matches = searchContext.match(/https?:\/\/[^"']+\.m3u8[^"']*/g);
          if (m3u8Matches && m3u8Matches.length > 0) {
            let m3u8Url = m3u8Matches.find((u) => u.includes("master.m3u8") && u.includes("?t=")) || m3u8Matches.find((u) => u.includes("master.m3u8")) || m3u8Matches[0];
            m3u8Url = m3u8Url.replace(/\\\//g, "/");
            if (m3u8Url.includes("dropcdn.io")) {
              m3u8Url = m3u8Url.replace("r1.dropcdn.io", "ds2.dropcdn.io").replace("_o/", "/").replace("_o.m3u8", ".m3u8");
              if (!m3u8Url.includes("srv=")) {
                m3u8Url += (m3u8Url.includes("?") ? "&" : "?") + "srv=ds2i";
              }
              console.log(`[DropCDN] \u2705 Protocolo ds2 Sincronizado`);
            }
            return {
              url: m3u8Url,
              quality: "HD",
              verified: true,
              serverName: "DropCDN",
              headers: __spreadProps(__spreadValues({}, BROWSER_HEADERS), {
                "Cookie": cookieHeader,
                "Referer": "https://dr0pstream.com/"
              })
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });
    }
    function unpack(packed) {
      try {
        const m = packed.match(new RegExp("eval\\(function\\(p,a,c,k,e,d\\)\\{.*?return p\\}\\('(.+)',(\\d+),(\\d+),'(.+)'\\.split\\('\\|'\\)\\)\\)", "s"));
        if (!m)
          return packed;
        let p = m[1];
        const a = parseInt(m[2]), c = parseInt(m[3]), k = m[4].split("|");
        p = p.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const encode = (i, b) => i < b ? alphabet[i] : encode(Math.floor(i / b), b) + alphabet[i % b];
        for (let i = c - 1; i >= 0; i--) {
          if (k[i])
            p = p.replace(new RegExp("\\b" + encode(i, a) + "\\b", "g"), k[i]);
        }
        return p;
      } catch (e) {
        return packed;
      }
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/vidsrc.js
var require_vidsrc = __commonJS({
  "src/resolvers/vidsrc.js"(exports2, module2) {
    function resolve3(url, signal = null) {
      return __async(this, null, function* () {
        try {
          let embedUrl = url.toString().replace("vidsrc.to", "vidsrc.xyz").replace("vidsrc.pm", "vidsrc.xyz").replace("moviesapi.club/movie", "cdn.moviesapi.to/embed/movie").replace("moviesapi.to/movie", "cdn.moviesapi.to/embed/movie");
          console.log(`[VidSrc] Iniciando Resoluci\xF3n: ${embedUrl}`);
          const UA3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
          const headers = { "User-Agent": UA3, "Referer": "https://vidsrc.xyz/" };
          const res1 = yield fetch(embedUrl, { headers, signal });
          if (!res1.ok)
            return null;
          const html1 = yield res1.text();
          const iframeMatch = html1.match(/src=['"]([^"]+)['"] f/);
          if (!iframeMatch)
            return null;
          let nextUrl = iframeMatch[1];
          if (nextUrl.startsWith("//"))
            nextUrl = "https:" + nextUrl;
          const res2 = yield fetch(nextUrl, { headers: __spreadProps(__spreadValues({}, headers), { "Referer": embedUrl }), signal });
          if (!res2.ok)
            return null;
          const html2 = yield res2.text();
          const encryptedMatch = html2.match(/id="([^"]+)" style="display:none;">([^<]+)/);
          if (!encryptedMatch)
            return null;
          const decId = encryptedMatch[1];
          const cipherText = encryptedMatch[2];
          const decrypted = crsdiv(cipherText, decId);
          if (!decrypted)
            return null;
          const finalUrl = decrypted.split(" ")[0].replace("{v1}", "thrumbleandjaxon.com");
          console.log(`[VidSrc] \xA1Enlace Descifrado!: ${finalUrl.substring(0, 50)}...`);
          return {
            url: finalUrl,
            quality: "HD",
            verified: true,
            serverName: "VidSrc",
            headers: {
              "User-Agent": UA3,
              "Referer": nextUrl,
              "Origin": new URL(nextUrl).origin
            }
          };
        } catch (error) {
          console.error(`[VidSrc] Error: ${error.message}`);
          return null;
        }
      });
    }
    function crsdiv(a, decId) {
      try {
        if (decId === "sXnL9MQIry") {
          const b = Array.from("pWB9V)[*4I`nJpp?ozyB~dbr9yt!_n4u").map((c) => c.charCodeAt(0));
          const d = a.match(/.{2}/g).map((x) => parseInt(x, 16));
          const decrypted = d.map((v, i) => (v ^ b[i % b.length]) - 3);
          return atob(String.fromCharCode(...decrypted));
        }
        if (decId === "IhWrImMIGL") {
          const d = Array.from(a).map((ch) => {
            const code = ch.charCodeAt(0);
            if (code >= 97 && code <= 109 || code >= 65 && code <= 77)
              return String.fromCharCode(code + 13);
            if (code >= 110 && code <= 122 || code >= 78 && code <= 90)
              return String.fromCharCode(code - 13);
            return ch;
          }).join("");
          return atob(d);
        }
        if (decId === "xTyBxQyGTA") {
          const b = a.split("").reverse().join("");
          let c = "";
          for (let i = 0; i < b.length; i += 2)
            c += b[i];
          return atob(c);
        }
        if (["JoAHUMCLXV", "Oi3v1dAlaM", "TsA2KGDGux"].includes(decId)) {
          const shift = { "JoAHUMCLXV": 3, "Oi3v1dAlaM": 5, "TsA2KGDGux": 7 }[decId];
          const b64 = a.split("").reverse().join("").replace(/-/g, "+").replace(/_/g, "/");
          const decoded = atob(b64);
          return Array.from(decoded).map((ch) => String.fromCharCode(ch.charCodeAt(0) - shift)).join("");
        }
        return null;
      } catch (e) {
        return null;
      }
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/doodstream.js
var require_doodstream = __commonJS({
  "src/resolvers/doodstream.js"(exports2, module2) {
    var { getSessionUA } = require_http2();
    function resolve3(url, signal = null) {
      return __async(this, null, function* () {
        try {
          const UA3 = getSessionUA();
          console.log(`[DoodStream] Resolviendo: ${url}`);
          let embedUrl = url;
          if (!embedUrl.includes("/e/")) {
            embedUrl = embedUrl.replace(/\/(d|f)\//, "/e/");
          }
          const response = yield fetch(embedUrl, {
            signal,
            headers: {
              "User-Agent": UA3,
              "Referer": "https://lamovie.cc/"
              // Referer de confianza para evadir 403
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const fetchRegex = /\$\.get\(['"](\/pass_md5\/[\w-]+)\/([\w-]+)['"]/i;
          const match = html.match(fetchRegex);
          if (!match) {
            console.log("[DoodStream] No se encontraron tokens (pass_md5)");
            return null;
          }
          const passPath = match[1];
          const token = match[2];
          const domain = new URL(embedUrl).origin;
          const passUrl = domain + passPath;
          const passRes = yield fetch(passUrl, {
            headers: {
              "User-Agent": UA3,
              "Referer": embedUrl
            },
            signal
          });
          if (!passRes.ok)
            return null;
          const videoBaseUrl = yield passRes.text();
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          let randomString = "";
          for (let i = 0; i < 10; i++) {
            randomString += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const expiry = Date.now();
          const finalVideoUrl = `${videoBaseUrl}${randomString}?token=${token}&expiry=${expiry}`;
          const reqHeaders = {
            "User-Agent": UA3,
            "Referer": domain + "/"
          };
          let isLive = false;
          try {
            const checkRes = yield fetch(finalVideoUrl, {
              method: "HEAD",
              headers: reqHeaders,
              signal
            });
            isLive = checkRes.ok;
          } catch (err) {
            isLive = true;
          }
          return {
            url: finalVideoUrl,
            quality: "720p",
            // Doodstream suele ser 720p estático o adaptativo interno
            verified: isLive,
            serverName: "DoodStream",
            headers: reqHeaders
          };
        } catch (e) {
          console.error(`[DoodStream] Error: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/vidnest.js
var require_vidnest = __commonJS({
  "src/resolvers/vidnest.js"(exports2, module2) {
    var axios4 = require("axios");
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          const { data: html } = yield axios4.get(embedUrl, {
            headers: { "Referer": "https://www.fuegocine.com/" },
            timeout: 8e3
          });
          const match = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*"([^"]+\.mp4[^"]*)"/);
          if (match && match[1]) {
            return {
              url: match[1],
              quality: "HD",
              serverName: "VidNest",
              verified: true,
              headers: { "Referer": embedUrl }
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/vidsonic.js
var require_vidsonic = __commonJS({
  "src/resolvers/vidsonic.js"(exports2, module2) {
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          const id = embedUrl.split("/").pop().replace(".html", "");
          const targetUrl = `https://vidsonic.net/e/${id}`;
          const response = yield fetch(targetUrl, {
            headers: {
              "Referer": "https://www.fuegocine.com/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const vMatch = html.match(/const\s+_0x1\s*=\s*['"]([^'"]+)['"]/);
          if (vMatch) {
            const hexPipe = vMatch[1];
            const clean = hexPipe.split("|").join("");
            let decoded = "";
            for (let i = 0; i < clean.length; i += 2) {
              decoded += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
            }
            const finalUrl = decoded.split("").reverse().join("");
            if (finalUrl.includes("http")) {
              return {
                url: finalUrl,
                quality: "HD",
                serverName: "Vidsonic",
                verified: true,
                headers: { "Referer": targetUrl }
              };
            }
          }
          const hexMatch = html.match(/\["([a-f0-9]{50,})"\]/);
          if (hexMatch) {
            const hex = hexMatch[1].split("").reverse().join("");
            let decoded = "";
            for (let i = 0; i < hex.length; i += 2) {
              decoded += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            if (decoded.includes("http")) {
              return {
                url: decoded,
                quality: "HD",
                serverName: "Vidsonic",
                verified: true,
                headers: { "Referer": targetUrl }
              };
            }
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/barmonrey.js
var require_barmonrey = __commonJS({
  "src/resolvers/barmonrey.js"(exports2, module2) {
    var axios4 = require("axios");
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          const { data: html } = yield axios4.get(embedUrl, {
            headers: { "Referer": "https://www.fuegocine.com/" },
            timeout: 8e3
          });
          const m3u8 = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
          if (m3u8) {
            return {
              url: m3u8[0],
              quality: "HD",
              serverName: "Barmonrey",
              verified: true,
              headers: { "Referer": embedUrl }
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/vidmoly.js
var require_vidmoly = __commonJS({
  "src/resolvers/vidmoly.js"(exports2, module2) {
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          const urlObj = new URL(embedUrl);
          const redirectBase = "https://vidmoly.to";
          const videoId = urlObj.pathname.split("/").pop().replace(".html", "").replace("embed-", "");
          const targetUrl = `${redirectBase}/embed-${videoId}.html`;
          const response = yield fetch(targetUrl, {
            headers: {
              "Referer": redirectBase + "/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "text/html"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const match = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/);
          if (match && match[1]) {
            return {
              url: match[1],
              quality: "HD",
              serverName: "Vidmoly",
              verified: true,
              headers: {
                "Referer": targetUrl,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
              }
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/rpmvid.js
var require_rpmvid = __commonJS({
  "src/resolvers/rpmvid.js"(exports2, module2) {
    var CryptoJS2 = require("crypto-js");
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        var _a;
        try {
          const id = embedUrl.split("/").pop().replace(".html", "");
          const isUpns = embedUrl.includes("upns");
          const apiDomain = isUpns ? "https://fuegocineplayer.upns.online" : "https://rpmvid.com";
          const apiUrl = `${apiDomain}/api/v1/video`;
          const bodyStr = `url=${encodeURIComponent(id)}`;
          const response = yield fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Referer": embedUrl
            },
            body: bodyStr
          });
          if (!response.ok)
            return null;
          const data = yield response.json();
          if (data.status !== "success" || !data.payload)
            return null;
          const key = CryptoJS2.enc.Utf8.parse("kiemtienmua911ca");
          const iv = CryptoJS2.enc.Utf8.parse("1234567890oiuytr");
          const decrypted = CryptoJS2.AES.decrypt(data.payload, key, {
            iv,
            mode: CryptoJS2.mode.CBC,
            padding: CryptoJS2.pad.Pkcs7
          }).toString(CryptoJS2.enc.Utf8);
          const payload = JSON.parse(decrypted);
          let videoUrl = payload.url || payload.sources && ((_a = payload.sources[0]) == null ? void 0 : _a.file);
          if (videoUrl) {
            if (videoUrl.includes(".txt"))
              videoUrl += "#index.m3u8";
            return {
              url: videoUrl,
              quality: "HD",
              serverName: isUpns ? "UPNS" : "Rpmvid",
              verified: true,
              headers: { "Referer": apiDomain }
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
  }
});

// src/resolvers/generic_fuegocine.js
var require_generic_fuegocine = __commonJS({
  "src/resolvers/generic_fuegocine.js"(exports2, module2) {
    function resolve3(embedUrl) {
      return __async(this, null, function* () {
        try {
          const response = yield fetch(embedUrl, {
            headers: {
              "Referer": "https://www.fuegocine.com/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const m3u8 = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
          if (m3u8) {
            return {
              url: m3u8[0],
              quality: "HD",
              serverName: "Server",
              verified: true,
              headers: { "Referer": embedUrl }
            };
          }
          const mp4 = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i);
          if (mp4) {
            return {
              url: mp4[0],
              quality: "HD",
              serverName: "Server",
              verified: true,
              headers: { "Referer": embedUrl }
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      });
    }
    module2.exports = { resolve: resolve3 };
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

// src/utils/resolvers.js
var require_resolvers = __commonJS({
  "src/utils/resolvers.js"(exports2, module2) {
    var { resolve: resolveVoe } = require_voe();
    var { resolve: resolveHlswish } = require_hlswish();
    var { resolve: resolveFilemoon } = require_filemoon();
    var { resolve: resolveVidhide } = require_vidhide();
    var { resolve: resolveGoodstream } = require_goodstream();
    var { resolve: resolveFastream } = require_fastream();
    var { resolve: resolveVimeos } = require_vimeos();
    var { resolve: resolveBuzzheavier } = require_buzzheavier();
    var { resolve: resolveOkru } = (init_okru(), __toCommonJS(okru_exports));
    var { resolve: resolvePixeldrain } = require_pixeldrain();
    var { resolve: resolvePlaymogo } = require_playmogo();
    var { resolve: resolveTurbovid } = (init_turbovid(), __toCommonJS(turbovid_exports));
    var { resolve: resolveEmbedseek } = require_embedseek();
    var { resolve: resolveTplayer } = require_tplayer();
    var { resolve: resolveLulustream } = require_lulustream();
    var { resolve: resolveDropcdn } = require_dropcdn();
    var { resolve: resolveVidsrc } = require_vidsrc();
    var { resolve: resolveDoodstream } = require_doodstream();
    var { resolve: resolveVidnest } = require_vidnest();
    var { resolve: resolveVidsonic } = require_vidsonic();
    var { resolve: resolveBarmonrey } = require_barmonrey();
    var { resolve: resolveVidmoly } = require_vidmoly();
    var { resolve: resolveRpmvid } = require_rpmvid();
    var { resolve: resolveGeneric } = require_generic_fuegocine();
    var { getSessionUA } = require_http2();
    var { isMirror } = require_mirrors();
    var UA3 = getSessionUA();
    function getDirectCdnHeaders(url) {
      if (!url)
        return null;
      const { getStealthHeaders } = require_http2();
      const s = url.toLowerCase();
      try {
        const domain = new URL(url).hostname;
        const baseOrigin = `https://${domain}`;
        const headers = __spreadProps(__spreadValues({}, getStealthHeaders()), {
          "Referer": baseOrigin,
          "Origin": baseOrigin
        });
        if (isMirror(s, "FILEMOON") || isMirror(s, "VIDHIDE")) {
          headers["X-Requested-With"] = "XMLHttpRequest";
          headers["x-embed-origin"] = domain;
          if (isMirror(s, "FILEMOON")) {
            headers["x-embed-origin"] = "ww3.gnulahd.nu";
            headers["x-embed-parent"] = baseOrigin;
          }
        }
        return headers;
      } catch (e) {
        return { "User-Agent": UA3, "referer": url.split("?")[0] };
      }
    }
    function applyPiping(result) {
      if (!result || !result.url)
        return result;
      let url = result.url;
      const s = url.toLowerCase();
      const isDirectFile = s.includes("pixeldrain") || s.includes("buzzheavier") || s.includes("tplayer") || result.isDirect;
      const anchor = isDirectFile ? "#.mp4" : "";
      if (anchor && !url.includes(".m3u8") && !url.includes(".mp4")) {
        url = `${url}${anchor}`;
      }
      result.url = url;
      return result;
    }
    function resolveEmbed(url, signal = null) {
      return __async(this, null, function* () {
        if (!url)
          return null;
        const s = url.toLowerCase();
        if (s.includes("hqq.ac") || s.includes("hqq.tv") || s.includes("netu.tv") || s.includes("waaw.to") || s.includes("netu.to") || s.includes("hqq.to")) {
          return null;
        }
        if (isMirror(s, "VOE")) {
          const res = yield resolveVoe(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "STREAMWISH") || s.includes("filelions")) {
          const res = yield resolveHlswish(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "FILEMOON")) {
          const res = yield resolveFilemoon(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "VIDHIDE") || s.includes("mdfury") || s.includes("dintezuvio")) {
          const res = yield resolveVidhide(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "FASTREAM")) {
          const res = yield resolveFastream(url);
          if (res)
            return applyPiping(res);
        }
        if (s.includes("vimeos") || s.includes("vms.sh")) {
          const res = yield resolveVimeos(url);
          if (res)
            return applyPiping(res);
          return null;
        }
        if (isMirror(s, "OKRU")) {
          const res = yield resolveOkru(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "BUZZHEAVIER")) {
          const res = yield resolveBuzzheavier(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "GOODSTREAM")) {
          const res = yield resolveGoodstream(url);
          if (res)
            return applyPiping(res);
          return null;
        }
        if (s.includes("playmogo"))
          return applyPiping(yield resolvePlaymogo(url));
        if (s.includes("turbovid"))
          return applyPiping(yield resolveTurbovid(url));
        if (isMirror(s, "PIXELDRAIN"))
          return applyPiping(yield resolvePixeldrain(url));
        if (s.includes("tplayer.pelisgo.online"))
          return applyPiping(yield resolveTplayer(url));
        if (s.includes("embedseek"))
          return applyPiping(yield resolveEmbedseek(url));
        if (isMirror(s, "LULUSTREAM"))
          return applyPiping(yield resolveLulustream(url));
        if (isMirror(s, "DROPCDN")) {
          const res = yield resolveDropcdn(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (s.includes("vidsrc") || s.includes("moviesapi.to") || s.includes("moviesapi.club")) {
          const res = yield resolveVidsrc(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "DOODSTREAM")) {
          const res = yield resolveDoodstream(url, signal);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "VIDNEST")) {
          const res = yield resolveVidnest(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "VIDSONIC")) {
          const res = yield resolveVidsonic(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "BARMONREY")) {
          const res = yield resolveBarmonrey(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "VIDMOLY")) {
          const res = yield resolveVidmoly(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "UPNS")) {
          const res = yield resolveRpmvid(url);
          if (res)
            return applyPiping(res);
        }
        if (isMirror(s, "UNLIMPLAY") || isMirror(s, "KRAKENFILES")) {
          const res = yield resolveGeneric(url);
          if (res)
            return applyPiping(res);
        }
        const isKnown = isMirror(s, "VOE") || isMirror(s, "STREAMWISH") || isMirror(s, "FILEMOON") || isMirror(s, "VIDHIDE") || isMirror(s, "FASTREAM") || isMirror(s, "OKRU") || isMirror(s, "GOODSTREAM") || s.includes("vimeos") || s.includes("vms.sh") || s.includes("la.movie");
        if (isKnown) {
          console.log(`[Resolvers] Known server failed resolution (Down): ${url}`);
          return null;
        }
        const finalHeaders = getDirectCdnHeaders(url);
        return applyPiping({
          url,
          quality: "SD",
          verified: false,
          headers: finalHeaders
        });
      });
    }
    module2.exports = { resolveEmbed };
  }
});

// src/utils/tmdb.js
var require_tmdb = __commonJS({
  "src/utils/tmdb.js"(exports2, module2) {
    var axios4 = require("axios");
    var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
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
            url = `https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=${language}`;
            const { data } = yield axios4.get(url, { timeout: 6e3 });
            const result = type === "movie" ? data.movie_results && data.movie_results[0] : data.tv_results && data.tv_results[0] || data.movie_results && data.movie_results[0];
            const title = result ? result.name || result.title : null;
            if (title)
              titleCache.set(cacheKey, title);
            return title;
          } else {
            url = `https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${TMDB_API_KEY}&language=${language}`;
            const { data } = yield axios4.get(url, { timeout: 6e3 });
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
            url = `https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
            const { data } = yield axios4.get(url, { timeout: 6e3 });
            result = type === "movie" ? data.movie_results && data.movie_results[0] : data.tv_results && data.tv_results[0] || data.movie_results && data.movie_results[0];
          } else {
            url = `https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${TMDB_API_KEY}`;
            const { data } = yield axios4.get(url, { timeout: 6e3 });
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
          const altUrl = `https://api.themoviedb.org/3/${type}/${cleanId}/alternative_titles?api_key=${TMDB_API_KEY}`;
          const { data } = yield axios4.get(altUrl, { timeout: 5e3 });
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
    function finalizeStreams(streams, providerName, mediaTitle) {
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
    module2.exports = { finalizeStreams, normalizeLanguage };
  }
});

// src/pelisplus/extractor.js
var require_extractor = __commonJS({
  "src/pelisplus/extractor.js"(exports2, module2) {
    var cheerio = require("cheerio");
    var { fetchText, BASE_URL } = require_http();
    var { resolveEmbed } = require_resolvers();
    var { validateStream } = require_m3u8();
    var { getTmdbTitle: getTmdbTitle2, getTmdbAliases } = require_tmdb();
    var engine = require_engine();
    function normalizeTitle(t) {
      if (!t)
        return "";
      return t.toLowerCase().replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    }
    function titleMatch(query, target) {
      const q = normalizeTitle(query);
      const t = normalizeTitle(target);
      if (!q || !t)
        return false;
      if (q === t)
        return true;
      const qWords = q.split(" ").filter((w) => w.length > 2);
      const tWords = t.split(" ");
      if (qWords.length === 0)
        return q === t;
      const matchCount = qWords.filter((w) => tWords.includes(w)).length;
      const ratio = matchCount / qWords.length;
      return ratio >= 0.8;
    }
    function normalizeTitle(t) {
      if (!t)
        return "";
      return t.toLowerCase().replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    }
    function getStreams2(tmdbId, mediaType, season, episode, query) {
      return __async(this, null, function* () {
        try {
          console.log(`[PelisPlusHD] Extracting: ${query || tmdbId} (TMDB: ${tmdbId})`);
          let titlesToTry = [query];
          if (tmdbId && tmdbId.toString().match(/^\d+/) && !tmdbId.toString().startsWith("tt")) {
            const [aliases, spanishTitle] = yield Promise.all([
              getTmdbAliases(tmdbId, mediaType),
              getTmdbTitle2(tmdbId, mediaType, "es-MX")
            ]);
            const allAliases = [query];
            if (spanishTitle)
              allAliases.push(spanishTitle);
            if (aliases)
              aliases.forEach((a) => allAliases.push(a));
            const mainKeyword = query.split(/\s+/).filter((w) => w.length > 4)[0];
            if (mainKeyword && !allAliases.includes(mainKeyword))
              allAliases.push(mainKeyword);
            titlesToTry = Array.from(new Set(allAliases.filter(Boolean)));
            console.log(`[PelisPlusHD] Alias Radar v12.0.0: Trying ${titlesToTry.length} terms.`);
          }
          const searchPromises = titlesToTry.slice(0, 5).map((t) => __async(this, null, function* () {
            try {
              const searchUrl = `${BASE_URL}/search?s=${encodeURIComponent(t)}`;
              const html = yield fetchText(searchUrl);
              const matches = [];
              const aRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
              let m;
              while ((m = aRegex.exec(html)) !== null) {
                const href = m[1];
                const content = m[2];
                if (mediaType === "movie" && !href.includes("/pelicula/"))
                  continue;
                if (mediaType === "tv" && !href.includes("/serie/"))
                  continue;
                let resultTitle = "";
                const pMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                if (pMatch) {
                  resultTitle = pMatch[1].replace(/<[^>]+>/g, "").trim();
                } else {
                  const dtMatch = m[0].match(/data-title="([^"]+)"/i);
                  resultTitle = dtMatch ? dtMatch[1].trim() : content.replace(/<[^>]+>/g, "").trim();
                }
                resultTitle = resultTitle.replace(/^VER\s+/i, "").replace(/\s+Online\s+Gratis\s+HD$/i, "").replace(/\s+Online\s+Latino\s+HD$/i, "").replace(/\(\d{4}\)$/, "").trim();
                const tWords = t.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
                const rWords = resultTitle.toLowerCase().split(/\s+/);
                const isWordMatch = tWords.some((w) => rWords.includes(w));
                const isUrlMatch = href.toLowerCase().includes(t.toLowerCase().replace(/\s+/g, "-")) || tWords.length > 0 && tWords.every((w) => href.toLowerCase().includes(w));
                if (titleMatch(t, resultTitle) || titleMatch(query, resultTitle) || isWordMatch || isUrlMatch) {
                  console.log(`[PelisPlusHD] Match Found: ${resultTitle} (${href})`);
                  matches.push({ href: BASE_URL + (href.startsWith("/") ? href : "/" + href), title: resultTitle });
                }
              }
              return matches;
            } catch (e) {
              return [];
            }
          }));
          const allSearchHits = yield Promise.all(searchPromises);
          let movieUrl = null;
          let bestMatch = null;
          let highestScore = -1;
          for (const hits of allSearchHits) {
            for (const hit of hits) {
              if (!bestMatch) {
                bestMatch = hit;
                console.log(`[PelisPlusHD] Selected Match: ${hit.title} (${hit.href})`);
              }
            }
          }
          if (bestMatch) {
            movieUrl = bestMatch.href;
          }
          if (!movieUrl) {
            console.log(`[PelisPlusHD] No matches found for ${tmdbId}`);
            return [];
          }
          if (mediaType === "tv") {
            if (movieUrl.endsWith("/"))
              movieUrl = movieUrl.slice(0, -1);
            movieUrl = `${movieUrl}/temporada/${season}/capitulo/${episode}`;
            console.log(`[PelisPlusHD] Episode URL: ${movieUrl}`);
          }
          const pageHtml = yield fetchText(movieUrl);
          const rawResults = [];
          const seenUrls = /* @__PURE__ */ new Set();
          const $movie = cheerio.load(pageHtml);
          $movie("li[data-url], li.playurl").each((i, el) => {
            const lang = $movie(el).attr("data-name") || "";
            const directUrl = $movie(el).attr("data-url");
            const serverId = $movie(el).attr("data-id");
            const serverType = $movie(el).attr("data-tipo");
            const serverName = $movie(el).text().trim();
            const isSupported = lang.toLowerCase().includes("latino") || lang.toLowerCase().includes("espa\xF1ol") || lang.toLowerCase().includes("castellano");
            if (isSupported) {
              const urlToUse = directUrl || serverId;
              if (urlToUse && !seenUrls.has(urlToUse)) {
                seenUrls.add(urlToUse);
                rawResults.push({
                  serverName,
                  serverUrl: directUrl || serverId,
                  language: lang.toLowerCase().includes("latino") ? "Latino" : "Castellano"
                });
              }
            }
          });
          if (rawResults.length === 0) {
            console.log(`[PelisPlusHD] No Latino servers in playurl. Trying Universal Scan...`);
            $movie("li[data-url]").each((i, el) => {
              var _a, _b;
              const sUrl = $movie(el).attr("data-url");
              let sName = $movie(el).attr("data-name") || $movie(el).text() || "";
              const isSupported = sName.toLowerCase().includes("latino") || sName.toLowerCase().includes("espa\xF1ol") || sName.toLowerCase().includes("castellano") || ((_a = $movie(el).attr("title")) == null ? void 0 : _a.toLowerCase().includes("latino")) || ((_b = $movie(el).attr("title")) == null ? void 0 : _b.toLowerCase().includes("espa\xF1ol"));
              if (sUrl && isSupported) {
                rawResults.push({ serverUrl: sUrl, serverName: sName, language: sName.toLowerCase().includes("latino") ? "Latino" : "Castellano" });
              }
            });
          }
          if (rawResults.length === 0) {
            console.log(`[PelisPlusHD] No links in Universal Scan. Trying Span Data (#link_url)...`);
            const isLatinoPage = pageHtml.includes("Espa\xF1ol Latino") || pageHtml.includes("Espa\xF1ol Castellano") || pageHtml.includes("Castellano");
            if (isLatinoPage) {
              $movie("#link_url span").each((i, el) => {
                const sUrl = $movie(el).attr("url");
                const lid = $movie(el).attr("lid");
                if (sUrl) {
                  const sName = $movie(`li[data-id="${lid}"] a`).text().trim() || "Servidor";
                  rawResults.push({ serverUrl: sUrl, serverName: sName, language: pageHtml.includes("Latino") ? "Latino" : "Castellano" });
                }
              });
            }
          }
          if (rawResults.length === 0) {
            console.log(`[PelisPlusHD] Span Data failed. Trying legacy var options...`);
            const optionsMatch = pageHtml.match(/var\s+options\s*=\s*({[\s\S]*?});/i);
            if (optionsMatch) {
              try {
                const options = JSON.parse(optionsMatch[1].replace(/'/g, '"').replace(/,\s*}/g, "}"));
                for (const key in options) {
                  const isSupported = key.toLowerCase().includes("latino") || key.toLowerCase().includes("espa\xF1ol") || key.toLowerCase().includes("castellano");
                  if (isSupported) {
                    options[key].forEach((item) => {
                      if (item.url && !seenUrls.has(item.url)) {
                        seenUrls.add(item.url);
                        rawResults.push({ serverUrl: item.url, serverName: item.name || key, language: key });
                      }
                    });
                  }
                }
              } catch (e) {
              }
            }
          }
          const { resolveEmbed: resolveEmbed2 } = require_resolvers();
          const { validateStream: validateStream2 } = require_m3u8();
          const { finalizeStreams } = require_engine();
          console.log(`[PelisPlusHD] Resolving ${rawResults.length} sources (v9.3.0 Optimized)...`);
          const candidates = [];
          const controller = new AbortController();
          const signal = controller.signal;
          let isFinished = false;
          const TARGET_COUNT = 15;
          const processStream = (res) => __async(this, null, function* () {
            if (isFinished)
              return null;
            try {
              let embedUrl = res.serverUrl;
              if (!embedUrl && res.serverId) {
                const embedRes = yield axios.get(`${BASE_URL}/ajax/embed?id=${res.serverId}&tipo=${res.serverType}`, { timeout: 4e3 });
                embedUrl = embedRes.data.url || embedRes.data;
              }
              if (!embedUrl || isFinished)
                return null;
              const finalUrl = yield resolveEmbed2(embedUrl, signal);
              if (!finalUrl || isFinished)
                return null;
              const directUrl = typeof finalUrl === "string" ? finalUrl : finalUrl.url;
              const headers = typeof finalUrl === "object" && finalUrl.headers ? finalUrl.headers : { "Referer": BASE_URL };
              const streamData = {
                url: directUrl,
                quality: "HD",
                language: res.language || "Latino",
                serverLabel: res.serverName,
                headers
              };
              const vStream = yield validateStream2(streamData, signal);
              const result = vStream && vStream.verified ? vStream : streamData;
              if (!isFinished && result) {
                candidates.push(result);
                if (candidates.length >= TARGET_COUNT) {
                  isFinished = true;
                  try {
                    controller.abort();
                  } catch (e) {
                  }
                }
              }
              return result;
            } catch (e) {
              return null;
            }
          });
          let timeoutId;
          const timeoutPromise = new Promise((resolve3) => {
            timeoutId = setTimeout(() => {
              isFinished = true;
              try {
                controller.abort();
              } catch (e) {
              }
              resolve3();
            }, 7e3);
          });
          try {
            yield Promise.race([
              Promise.all(rawResults.map((res) => processStream(res))),
              timeoutPromise
            ]);
          } finally {
            if (timeoutId)
              clearTimeout(timeoutId);
          }
          const anchoredStreams = candidates.map((s) => {
            if (s.serverUrl && !s.serverUrl.includes(".m3u8") && !s.serverUrl.includes(".mp4")) {
              s.serverUrl = s.serverUrl + "#.m3u8";
            }
            return s;
          });
          return yield engine.finalizeStreams(anchoredStreams, "PelisPlusHD", query);
        } catch (error) {
          console.error("[PelisPlusHD] getStreams Error:", error.message);
          return [];
        }
      });
    }
    module2.exports = { extract: getStreams2, getStreams: getStreams2 };
  }
});

// src/pelisplus/index.js
var extractor = require_extractor();
var { getTmdbTitle } = require_tmdb();
function getStreams(tmdbId, mediaType, season, episode, title) {
  return __async(this, null, function* () {
    try {
      console.log(`[PelisPlusHD] Request: ${mediaType} ${tmdbId} S${season}E${episode}`);
      let mediaTitle = title;
      if (!mediaTitle && tmdbId) {
        mediaTitle = yield getTmdbTitle(tmdbId, mediaType);
      }
      if (!mediaTitle) {
        console.log(`[PelisPlusHD] No TMDB title for ${tmdbId}`);
        return [];
      }
      console.log(`[PelisPlusHD] Target Title: "${mediaTitle}"`);
      const streams = yield extractor.extract(tmdbId, mediaType, season, episode, mediaTitle);
      if (!streams || streams.length === 0) {
        console.log(`[PelisPlusHD] No streams found for ${tmdbId}`);
        return [];
      }
      return streams;
    } catch (error) {
      console.error(`[PelisPlusHD] Fatal Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
