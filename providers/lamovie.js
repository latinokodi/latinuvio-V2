// src/lamovie/index.js (v2.4.0 - Cache Buster: 18:29)
var cheerio = require('cheerio');
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var BASE_URL = "https://lamovie.cc";
var API_URL = "https://lamovie.cc/wp-api/v1";
var ANIME_COUNTRIES = ["JP", "CN", "KR"];
var GENRE_ANIMATION = 16;
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};
function get(url, extraHeaders) {
  var headers = Object.assign({}, DEFAULT_HEADERS, extraHeaders || {});
  return fetch(url, { headers, redirect: "follow" }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    var ct = res.headers.get("content-type") || "";
    if (ct.indexOf("json") !== -1) return res.json();
    return res.text();
  });
}
function normalizeTitle(t) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function buildSlug(title, year) {
  var slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return year ? slug + "-" + year : slug;
}
function getPostTypes(mediaType, genres, originCountries) {
  if (mediaType === "movie") return ["movies"];
  var isAnimation = (genres || []).indexOf(GENRE_ANIMATION) !== -1;
  if (!isAnimation) return ["tvshows"];
  var isAnimeCountry = false;
  for (var i = 0; i < (originCountries || []).length; i++) {
    if (ANIME_COUNTRIES.indexOf(originCountries[i]) !== -1) {
      isAnimeCountry = true;
      break;
    }
  }
  return isAnimeCountry ? ["animes"] : ["animes", "tvshows"];
}
var STOPWORDS = { las: 1, los: 1, una: 1, uno: 1, del: 1, con: 1, que: 1, por: 1, para: 1, the: 1, and: 1, for: 1, from: 1, with: 1 };
function scoreCandidate(candidateTitle, tmdbTitle, originalTitle, year) {
  var normCand = normalizeTitle(candidateTitle);
  var normTmdb = normalizeTitle(tmdbTitle);
  var normOrig = normalizeTitle(originalTitle || tmdbTitle);
  var score = 0;
  if (year && normCand.indexOf(year) !== -1) score += 50;
  var wordsToCheck = normTmdb.split(" ").filter(function (w) {
    return (w.length > 3 || /^\d+$/.test(w)) && !STOPWORDS[w];
  });
  if (wordsToCheck.length > 0) {
    var matched = 0;
    for (var i = 0; i < wordsToCheck.length; i++) {
      if (normCand.indexOf(wordsToCheck[i]) !== -1) matched++;
    }
    score += matched / wordsToCheck.length * 30;
  }
  var origWords = normOrig.split(" ").filter(function (w) {
    return (w.length > 3 || /^\d+$/.test(w)) && !STOPWORDS[w];
  });
  if (origWords.length > 0) {
    var origMatched = 0;
    for (var j = 0; j < origWords.length; j++) {
      if (normCand.indexOf(origWords[j]) !== -1) origMatched++;
    }
    score += origMatched / origWords.length * 20;
  }
  var sequelNum = normTmdb.match(/\b(\d+)\s*$/);
  if (sequelNum && normCand.split(" ").indexOf(sequelNum[1]) === -1) {
    score -= 100;
  }
  return score;
}
function b64decode(str) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var result = "";
  var i = 0;
  var s = str.replace(/[^A-Za-z0-9+/]/g, "");
  while (i < s.length) {
    var a = chars.indexOf(s[i++]);
    var b = chars.indexOf(s[i++]);
    var c = i < s.length ? chars.indexOf(s[i++]) : -1;
    var d = i < s.length ? chars.indexOf(s[i++]) : -1;
    var cb = c === -1 ? 0 : c;
    var db = d === -1 ? 0 : d;
    var n = a << 18 | b << 12 | cb << 6 | db;
    result += String.fromCharCode(n >> 16 & 255);
    if (c !== -1) result += String.fromCharCode(n >> 8 & 255);
    if (d !== -1) result += String.fromCharCode(n & 255);
  }
  return result;
}
function resolveRelativeUrl(href, base) {
  if (href.indexOf("http") === 0) return href;
  var m = base.match(/^(https?:\/\/[^/]+)/);
  var origin = m ? m[1] : "";
  if (href.charAt(0) === "/") return origin + href;
  var basePath = base.substring(0, base.lastIndexOf("/") + 1);
  return basePath + href;
}
function voeDecode(ct, luts) {
  try {
    var rawLuts = luts.replace(/^\[|\]$/g, "").split("','").map(function (s) {
      return s.replace(/^'+|'+$/g, "");
    });
    var escapedLuts = rawLuts.map(function (i) {
      return i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    var txt = "";
    for (var ci = 0; ci < ct.length; ci++) {
      var x = ct.charCodeAt(ci);
      if (x > 64 && x < 91) x = (x - 52) % 26 + 65;
      else if (x > 96 && x < 123) x = (x - 84) % 26 + 97;
      txt += String.fromCharCode(x);
    }
    for (var pi = 0; pi < escapedLuts.length; pi++) txt = txt.replace(new RegExp(escapedLuts[pi], "g"), "_");
    txt = txt.split("_").join("");
    var decoded1 = b64decode(txt);
    if (!decoded1) return null;
    var step4 = "";
    for (var si = 0; si < decoded1.length; si++) step4 += String.fromCharCode((decoded1.charCodeAt(si) - 3 + 256) % 256);
    var revBase64 = step4.split("").reverse().join("");
    var finalStr = b64decode(revBase64);
    if (!finalStr) return null;
    return JSON.parse(finalStr);
  } catch (e) {
    return null;
  }
}
function resolveVoe(embedUrl) {
  return get(embedUrl, { "Referer": embedUrl }).then(function (data) {
    if (data.indexOf("window.location.href") !== -1 && data.length < 2000) {
      var rm = data.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
      if (rm) return resolveVoe(rm[1]);
    }

    var jsonMatch = data.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
    if (jsonMatch) {
      try {
        var parsed = JSON.parse(jsonMatch[1].trim());
        var encText = Array.isArray(parsed) ? parsed[0] : parsed;
        if (typeof encText === "string") {
          var decoded = encText.replace(/[a-zA-Z]/g, function (c) {
            var code = c.charCodeAt(0);
            var limit = c <= "Z" ? 90 : 122;
            var shifted = code + 13;
            return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
          });

          var noise = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
          for (var i = 0; i < noise.length; i++) {
            decoded = decoded.split(noise[i]).join("");
          }

          var b64_1 = b64decode(decoded);
          if (b64_1) {
            var shiftedStr = "";
            for (var j = 0; j < b64_1.length; j++) {
              shiftedStr += String.fromCharCode(b64_1.charCodeAt(j) - 3);
            }
            var reversed = shiftedStr.split("").reverse().join("");
            var decrypted = b64decode(reversed);
            if (decrypted) {
              var finalData = JSON.parse(decrypted);
              if (finalData && (finalData.source || finalData.direct_access_url)) {
                return {
                  url: finalData.source || finalData.direct_access_url,
                  quality: "1080p",
                  verified: true,
                  headers: { "Referer": embedUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] }
                };
              }
            }
          }
        }
      } catch (ex) { console.log("[VOE] Decrypt error: " + ex.message); }
    }

    var re = /(?:mp4|hls)['"\s]*:\s*['"]([^'"]+)['"]/gi;
    var m;
    while ((m = re.exec(data)) !== null) {
      var candidate = m[1];
      if (!candidate) continue;
      var url = candidate;
      if (url.indexOf("aHR0") === 0) {
        try {
          url = b64decode(url);
        } catch (e) {
        }
      }
      return { url, quality: "1080p", verified: true, headers: { "Referer": embedUrl } };
    }
    return null;
  }).catch(function (err) {
    console.log("[VOE] Error: " + err.message);
    return null;
  });
}
var HLSWISH_DOMAIN_MAP = { "hglink.to": "vibuxer.com" };
function unpackEval(payload, radix, symtab) {
  var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return payload.replace(/\b([0-9a-zA-Z]+)\b/g, function (match) {
    var result = 0;
    for (var i = 0; i < match.length; i++) {
      var pos = chars.indexOf(match[i]);
      if (pos === -1) return match;
      result = result * radix + pos;
    }
    if (isNaN(result) || result >= symtab.length) return match;
    return symtab[result] && symtab[result] !== "" ? symtab[result] : match;
  });
}
function resolveHlswish(embedUrl) {
  var fetchUrl = embedUrl;
  var keys = Object.keys(HLSWISH_DOMAIN_MAP);
  for (var ki = 0; ki < keys.length; ki++) {
    if (fetchUrl.indexOf(keys[ki]) !== -1) fetchUrl = fetchUrl.replace(keys[ki], HLSWISH_DOMAIN_MAP[keys[ki]]);
  }
  var embedHostMatch = fetchUrl.match(/^(https?:\/\/[^/]+)/);
  var embedHost = embedHostMatch ? embedHostMatch[1] : "https://hlswish.com";
  return get(fetchUrl, {
    "Referer": "https://embed69.org/",
    "Origin": "https://embed69.org",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9"
  }).then(function (data) {
    var fileMatch = data.match(/file\s*:\s*["']([^"']+)["']/i);
    if (fileMatch) {
      var url = fileMatch[1];
      if (url.charAt(0) === "/") url = embedHost + url;
      return { url, quality: "1080p", verified: true, headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": embedHost + "/" } };
    }
    var packMatch = data.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (packMatch) {
      var unpacked = unpackEval(packMatch[1], parseInt(packMatch[2]), packMatch[4].split("|"));
      var m3u8Match = unpacked.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/);
      if (m3u8Match) {
        var url = m3u8Match[1];
        if (url.charAt(0) === "/") url = embedHost + url;
        return { url, quality: "1080p", verified: true, headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": embedHost + "/" } };
      }
    }
    var rawM3u8 = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
    if (rawM3u8) return { url: rawM3u8[0], quality: "1080p", verified: true, headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": embedHost + "/" } };
    return null;
  }).catch(function (err) {
    console.log("[HLSWish] Error: " + err.message);
    return null;
  });
}
function resolveLacloud(embedUrl) {
  return get(embedUrl, { "Referer": BASE_URL + "/" }).then(function (html) {
    var m = html.match(/const src\s*=\s*["']([^"']+)["']/);
    if (m) {
      return { url: m[1], quality: "1080p", verified: true, headers: { "Referer": embedUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] } };
    }
    return null;
  });
}
function resolvePacker(embedUrl) {
  return get(embedUrl, { "Referer": BASE_URL + "/" }).then(function (html) {
    try {
      var packedMatch = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*[']([\s\S]+?)[']\.split\([']\|[']\)/);
      if (!packedMatch) return null;

      var unpacked = unpack(packedMatch[1], parseInt(packedMatch[2]), packedMatch[4].split('|'));
      var streamMatch = unpacked.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/) ||
        unpacked.match(/["'](\/[^"']+\.m3u8[^"']*)["']/) ||
        unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/);

      if (streamMatch) {
        var hlsLink = streamMatch[1];
        if (hlsLink.startsWith('/')) {
          var baseUrl = embedUrl.match(/^(https?:\/\/[^/]+)/)[1];
          hlsLink = baseUrl + hlsLink;
        }
        return { url: hlsLink, quality: "1080p", verified: true, headers: { "Referer": embedUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] } };
      }
    } catch (e) { console.log("[LaMovie] Error unpacker: " + e.message); }
    return null;
  });
}
function resolveVimeos(embedUrl) {
  var originMatch = embedUrl.match(/^(https?:\/\/[^/]+)/);
  var origin = originMatch ? originMatch[1] : "https://vimeos.net";
  var playHeaders = { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": origin + "/", "Origin": origin };
  var fetchOpts = {
    "Referer": "https://la.movie/tv/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9"
  };
  function extractFileUrl(data) {
    var packMatch = data.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
    if (!packMatch) return null;
    var symtab = packMatch[4].split("|");
    var unpacked = unpackEval(packMatch[1], parseInt(packMatch[2]), symtab);
    var m = unpacked.match(/file:"(https?:\/\/[^"]+\.m3u8[^"]*)"/);
    if (!m) m = unpacked.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
    return m ? m[1] : null;
  }
  function attempt(n) {
    return get(embedUrl, fetchOpts).then(function (data) {
      var masterUrl = extractFileUrl(data);
      if (!masterUrl) {
        console.log("[Vimeos] Intento " + n + " sin URL, reintentando...");
        return attempt(n + 1);
      }
      var iParam = (masterUrl.match(/[?&]i=([^&]*)/) || ["", "?"])[1];
      console.log("[Vimeos] Intento " + n + " i=" + iParam + ": " + masterUrl.slice(0, 100));
      if (iParam === "0.0") {
        return { url: masterUrl, quality: "1080p", verified: true, headers: playHeaders };
      }
      return attempt(n + 1);
    }).catch(function (err) {
      console.log("[Vimeos] Error intento " + n + ": " + err.message);
      return attempt(n + 1);
    });
  }
  return attempt(1);
}
function resolveDoodstream(embedUrl) {
  var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  var embedHost = embedUrl.replace(/\/(d|f)\//, "/e/").replace("dsvplay.com", "d0000d.com");
  return get(embedHost, { 
    "User-Agent": UA, 
    "Referer": "https://lamovie.cc/",
    "Origin": "https://lamovie.cc"
  }).then(function(html) {
    // Regex mejorado segun Rust: captura la ruta completa y el token final
    var match = html.match(/\$\.get\(['"](\/pass_md5\/[\w-]+\/([\w-]+))['"]/i);
    if (!match) return null;
    
    var passPath = match[1]; // /pass_md5/TOKEN1/TOKEN2
    var token = match[2];    // TOKEN2
    var domain = new URL(embedHost).origin;
    
    return get(domain + passPath, { "User-Agent": UA, "Referer": embedHost }).then(function(videoBaseUrl) {
      if (!videoBaseUrl) return null;
      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      var randomString = "";
      for (var i = 0; i < 10; i++) randomString += chars.charAt(Math.floor(Math.random() * chars.length));
      var finalUrl = videoBaseUrl + randomString + "?token=" + token + "&expiry=" + Date.now();
      return { url: finalUrl, quality: "720p", verified: true, headers: { "User-Agent": UA, "Referer": domain + "/" } };
    });
  }).catch(function(err) {
    console.log("[DoodStream] Error: " + err.message);
    return null;
  });
}
function getResolver(url) {
  if (url.indexOf("hlswish") !== -1 || url.indexOf("streamwish") !== -1 || url.indexOf("strwish") !== -1 || url.indexOf("vibuxer") !== -1) return resolveHlswish;
  if (url.indexOf("voe.sx") !== -1) return resolveVoe;
  if (url.indexOf("vimeos.net") !== -1) return resolveVimeos;
  if (url.indexOf("lacloud.live") !== -1) return resolveLacloud;
  if (url.indexOf("earnvids.com") !== -1 || url.indexOf("hglink.to") !== -1 || url.indexOf("earnl.one") !== -1 || url.indexOf("vidnova.online") !== -1 || url.indexOf("streamfort.online") !== -1) return resolvePacker;
  if (url.indexOf("dood") !== -1 || url.indexOf("d0000d") !== -1 || url.indexOf("ds2video") !== -1 || url.indexOf("ds2play") !== -1 || url.indexOf("dsvplay") !== -1) return resolveDoodstream;
  return null;
}
function getServerName(url) {
  if (url.indexOf("hlswish") !== -1 || url.indexOf("streamwish") !== -1 || url.indexOf("strwish") !== -1 || url.indexOf("vibuxer") !== -1) return "StreamWish";
  if (url.indexOf("voe.sx") !== -1) return "VOE";
  if (url.indexOf("vimeos.net") !== -1) return "Vimeos";
  if (url.indexOf("lacloud.live") !== -1) return "Lacloud (Directo)";
  if (url.indexOf("earnvids.com") !== -1 || url.indexOf("earnl.one") !== -1 || url.indexOf("vidnova.online") !== -1) return "EarnVids";
  if (url.indexOf("hglink.to") !== -1 || url.indexOf("streamfort.online") !== -1) return "StreamHG";
  if (url.indexOf("dsvplay.com") !== -1 || url.indexOf("dood") !== -1 || url.indexOf("d0000d") !== -1 || url.indexOf("ds2video") !== -1 || url.indexOf("ds2play") !== -1) return "DoodStream";
  return "Online";
}
function getTmdbInfo(tmdbId, mediaType) {
  var type = mediaType === "movie" ? "movie" : "tv";
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=es-MX";
  return get(url).then(function (data) {
    var title = type === "movie" ? data.title || data.original_title : data.name || data.original_name;
    var originalTitle = type === "movie" ? data.original_title || data.title : data.original_name || data.name;
    var year = (type === "movie" ? data.release_date || "" : data.first_air_date || "").slice(0, 4);
    var genres = (data.genres || []).map(function (g) {
      return g.id;
    });
    var originCountries = data.origin_country || (data.production_countries || []).map(function (c) {
      return c.iso_3166_1;
    }) || [];
    return { title, originalTitle, year, genres, originCountries };
  });
}
function getIdBySlugApi(postType, slug) {
  var url = API_URL + "/single/" + postType + "?slug=" + encodeURIComponent(slug) + "&postType=" + postType;
  return get(url, { "Accept": "application/json", "Referer": BASE_URL + "/" }).then(function (data) {
    if (data && data.data && data.data._id) {
      console.log("[LaMovie] Slug OK: /" + postType + "/" + slug + " id:" + data.data._id);
      return { id: String(data.data._id) };
    }
    return null;
  }).catch(function () {
    return null;
  });
}
function searchLaMovie(title, originalTitle, year, postTypes) {
  var url = BASE_URL + "/search?keyword=" + encodeURIComponent(title);
  return get(url, { "Referer": BASE_URL + "/" }).then(function (html) {
    var $ = cheerio.load(html);
    var posts = [];
    $('.popular-card').each(function () {
      var $el = $(this);
      var t = $el.find('.popular-card__title p').text().trim();
      var ot = $el.find('.popular-card__title span').text().trim();
      var y = $el.find('.rates .year').text().trim();
      var link = $el.find('.popular-card__title a').attr('href');
      if (link) {
        posts.push({ title: t, original_title: ot, year: y, url: link });
      }
    });

    if (!posts.length && originalTitle && normalizeTitle(originalTitle) !== normalizeTitle(title)) {
      console.log('[LaMovie] Buscando con titulo original: "' + originalTitle + '"');
      var url2 = BASE_URL + "/search?keyword=" + encodeURIComponent(originalTitle);
      return get(url2, { "Referer": BASE_URL + "/" }).then(function (html2) {
        var $2 = cheerio.load(html2);
        var posts2 = [];
        $2('.popular-card').each(function () {
          var $el = $(this);
          var t = $el.find('.popular-card__title p').text().trim();
          var ot = $el.find('.popular-card__title span').text().trim();
          var y = $el.find('.rates .year').text().trim();
          var link = $el.find('.popular-card__title a').attr('href');
          if (link) posts2.push({ title: t, original_title: ot, year: y, url: link });
        });
        return posts2;
      });
    }
    return posts;
  }).then(function (posts) {
    if (!posts.length) return null;
    var scored = [];
    for (var i = 0; i < posts.length; i++) {
      scored.push({ post: posts[i], score: scoreCandidate(posts[i].title || "", title, originalTitle, year) });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    var best = scored[0];
    if (best.score < 20) {
      console.log("[LaMovie] Sin coincidencias (score: " + best.score.toFixed(1) + ")");
      return null;
    }
    console.log('[LaMovie] Busqueda OK: "' + best.post.title + '" (score:' + best.score.toFixed(1) + ") url:" + best.post.url);
    return { url: best.post.url };
  }).catch(function (err) {
    console.log("[LaMovie] Error busqueda: " + err.message);
    return null;
  });
}
function findContent(title, originalTitle, year, mediaType, genres, originCountries) {
  return searchLaMovie(title, originalTitle, year, []);
}
function getEpisodeId(seriesId, seasonNum, episodeNum) {
  var url = API_URL + "/single/episodes/list?_id=" + seriesId + "&season=" + seasonNum + "&page=1&postsPerPage=50";
  return get(url, { "Accept": "application/json", "Referer": BASE_URL + "/" }).then(function (data) {
    if (!data || !data.data || !data.data.posts) return null;
    var posts = data.data.posts;
    for (var i = 0; i < posts.length; i++) {
      var e = posts[i];
      if (String(e.season_number) === String(seasonNum) && String(e.episode_number) === String(episodeNum)) {
        console.log("[LaMovie] Episodio S" + seasonNum + "E" + episodeNum + " id:" + e._id);
        return String(e._id);
      }
    }
    console.log("[LaMovie] Episodio S" + seasonNum + "E" + episodeNum + " no encontrado");
    return null;
  }).catch(function (err) {
    console.log("[LaMovie] Error episodios: " + err.message);
    return null;
  });
}
function processOneEmbed(embed) {
  var resolver = getResolver(embed.url);
  if (!resolver) {
    console.log("[LaMovie] Sin resolver: " + embed.url);
    return Promise.resolve(null);
  }
  return resolver(embed.url).then(function (result) {
    if (!result || !result.url) return null;
    var serverName = getServerName(embed.url);
    var qualityLabel = embed.quality || result.quality || "1080p";
    var displayQuality = serverName + " \xB7 " + qualityLabel;
    return {
      name: "LaMovie",
      title: displayQuality,
      url: result.url,
      quality: displayQuality,
      headers: result.headers || {}
    };
  }).catch(function (err) {
    console.log("[LaMovie] Error embed: " + err.message);
    return null;
  });
}
function processEmbeds(embeds) {
  var results = [];
  function next(i) {
    if (i >= embeds.length) return Promise.resolve(results);
    return processOneEmbed(embeds[i]).then(function (result) {
      if (result) results.push(result);
      return next(i + 1);
    }).catch(function () {
      return next(i + 1);
    });
  }
  return next(0);
}
function getStreams(tmdbId, mediaType, season, episode) {
  var resolvedType = mediaType === "series" ? "tv" : mediaType || "movie";
  try {
    console.log("[LaMovie] Buscando TMDB:" + tmdbId + " (" + resolvedType + ")" + (season ? " S" + season + "E" + episode : ""));
    return getTmdbInfo(tmdbId, resolvedType).then(function (info) {
      if (!info || !info.title) return [];
      console.log('[LaMovie] TMDB: "' + info.title + '" (' + info.year + ")");
      return findContent(info.title, info.originalTitle, info.year, resolvedType, info.genres, info.originCountries).then(function (found) {
        if (!found || !found.url) {
          console.log("[LaMovie] No encontrado");
          return [];
        }
        var movieUrl = found.url.startsWith('http') ? found.url : BASE_URL + found.url;

        // Si es serie, necesitamos navegar al episodio
        var targetUrlPromise = Promise.resolve(movieUrl);
        if (resolvedType === "tv" && season && episode) {
          targetUrlPromise = get(movieUrl, { "Referer": BASE_URL + "/" }).then(function (html) {
            var $ = cheerio.load(html);
            var episodeUrl = null;
            $('.list-episodes a').each(function () {
              var txt = $(this).text().toLowerCase();
              if (txt.includes('temporada ' + season) && txt.includes('episodio ' + episode)) {
                episodeUrl = $(this).attr('href');
              }
            });
            if (!episodeUrl) {
              // Intentar busqueda por patrones mas simples si falla
              $('.list-episodes a').each(function () {
                var href = $(this).attr('href') || "";
                if (href.includes('-' + season + 'x' + episode) || href.includes('/episodio-' + episode)) {
                  episodeUrl = href;
                }
              });
            }
            return episodeUrl ? (episodeUrl.startsWith('http') ? episodeUrl : BASE_URL + episodeUrl) : null;
          });
        }

        return targetUrlPromise.then(function (targetUrl) {
          if (!targetUrl) return [];
          return get(targetUrl, { "Referer": BASE_URL + "/" }).then(function (html) {
            var $ = cheerio.load(html);
            var embeds = [];

            var langMap = {};
            $('.server-tab .tab').each(function() {
                var id = $(this).attr('data-id');
                var type = $(this).attr('data-type') || $(this).text();
                if (id && type) langMap[id] = type.trim().toLowerCase();
            });

            $('.lang-group').each(function() {
               var $group = $(this);
               var groupId = $group.attr('data-id');
               var langText = langMap[groupId] || $group.find('.lang-title').text().trim().toLowerCase() || "";
               
               var langLabel = "Desconocido"; 

              if (langText.includes('latino')) langLabel = "Latino";
              else if (langText.includes('espa\xF1ol') || langText.includes('castellano')) langLabel = "Castellano";
              else if (langText.includes('sub')) langLabel = "Subtitulado";

              if (langLabel === "Desconocido" && $group.hasClass('active')) langLabel = "Latino";

              if (langLabel !== "Latino") return;

               $group.find('.server-video').each(function() {
                  var videoUrl = $(this).attr('data-video');
                  var name = $(this).text().trim() || "Server";
                  if (videoUrl) {
                    embeds.push({ url: videoUrl, quality: "1080p", server: name, language: langLabel });
                  }
               });
            });

            if (!embeds.length) {
              return [];
            }
            console.log("[LaMovie] " + embeds.length + " embed(s) encontrados...");

            // Refactored processEmbeds logic to include language
            var results = [];
            var promises = embeds.map(function(embed) {
               var resolver = getResolver(embed.url);
               if (!resolver) return Promise.resolve();

               return resolver(embed.url).then(function(result) {
                  if (result && result.url) {
                    var serverName = getServerName(embed.url);
                    var isVerified = result.verified === true;
                    var qualityLabel = embed.quality || result.quality || "1080p";
                    var checkMark = isVerified ? " \u2705" : "";

                    var streamName = "La.movie - " + qualityLabel + checkMark;
                    var streamTitle = embed.language + " - " + serverName + " " + qualityLabel;

                    results.push({
                      name: streamName,
                      title: streamTitle,
                      url: result.url,
                      quality: qualityLabel,
                      verified: isVerified,
                      headers: result.headers || {}
                    });
                  }
               }).catch(function(e) { console.log("[LaMovie] Skip embed: " + e.message); });
            });

            return Promise.all(promises).then(function() {
               console.log("[LaMovie] Total final: " + results.length + " streams");
               return results;
            });
          });
        });
      });
    }).catch(function (err) {
      console.log("[LaMovie] Error: " + err.message);
      return [];
    });
  } catch (err) {
    console.log("[LaMovie] Error fatal: " + err.message);
    return Promise.resolve([]);
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getStreams: getStreams
  };

  // --- UTILS: P.A.C.K.E.R. UNPACKER ---
  function unpack(payload, radix, symtab) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var unbase = function (str) {
      var result = 0;
      for (var i = 0; i < str.length; i++) {
        var pos = chars.indexOf(str[i]);
        if (pos === -1) return NaN;
        result = result * radix + pos;
      }
      return result;
    };
    return payload.replace(/\b([0-9a-zA-Z]+)\b/g, function (match) {
      var idx = unbase(match);
      if (isNaN(idx) || idx >= symtab.length) return match;
      return (symtab[idx] && symtab[idx] !== '') ? symtab[idx] : match;
    });
  }
} else {
  global.getStreams = getStreams;
}
