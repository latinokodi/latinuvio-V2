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
var { resolveVoe: _resolveVoe, resolveStreamwish: _resolveStreamwish, resolveVidhide: _resolveVidhide, resolveFilemoon: _resolveFilemoon, resolveOkru: _resolveOkru } = require("./resolvers");

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
function resolveVideo(embedUrl, serverName) {
  return __async(this, null, function* () {
    console.log(`[Resolver] Dispatching for ${serverName}: ${embedUrl}`);
    const lowerUrl = embedUrl.toLowerCase();
    const lowerServer = serverName.toLowerCase();
    if (lowerUrl.includes("voe.sx") || lowerServer.includes("voe")) {
      return _resolveVoe(embedUrl);
    }
    if (lowerUrl.includes("do7go.com") || lowerUrl.includes("ds2play.com") || lowerUrl.includes("vidhide") || lowerServer.includes("do7go") || lowerServer.includes("ds2play") || lowerServer.includes("vidhide")) {
      return _resolveVidhide(embedUrl);
    }
    if (lowerUrl.includes("flaswish.com") || lowerUrl.includes("streamwish") || lowerUrl.includes("sfastwish") || lowerServer.includes("flaswish") || lowerServer.includes("streamwish") || lowerServer.includes("wish")) {
      return _resolveStreamwish(embedUrl);
    }
    if (lowerUrl.includes("ok.ru") || lowerServer.includes("okru")) {
      return _resolveOkru(embedUrl);
    }
    if (lowerUrl.includes("filemoon") || lowerServer.includes("filemoon")) {
      return _resolveFilemoon(embedUrl);
    }
    console.log(`[Resolver] No resolver found for ${serverName}`);
    return null;
  });
}

// src/doramasflix/extractor.js
var BASE_URL = "https://doramasflix.in";
var { TMDB_API_KEY_DORAMASFLIX: TMDB_API_KEY } = require("./tmdb_config");
function getContentNameFromTMDB(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const isImdb = String(tmdbId).startsWith("tt");
      const endpoint = isImdb
        ? `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
        : mediaType === "movie"
          ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
          : `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
      console.log(`[DoramasFlix] TMDB ${isImdb ? `/find/${tmdbId}` : `/${mediaType}/${tmdbId}`}`);
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
      // /find/ response wraps in movie_results / tv_results arrays
      let result = data;
      if (isImdb) {
        result = data.movie_results?.[0] || data.tv_results?.[0] || data.movie_results?.[0];
        if (!result) {
          console.log(`[DoramasFlix] TMDB /find/ returned no results for ${tmdbId}`);
          return null;
        }
      }
      const name = result.title || result.name;
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
              provider: "DoramasFlix",
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
