/* __FETCH_RETRY__ */
(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis
    : (typeof self !== 'undefined') ? self
    : (typeof global !== 'undefined') ? global
    : (typeof window !== 'undefined') ? window
    : null;
  if (!g || typeof g.fetch !== 'function' || g.fetch.__RETRY_WRAPPED__) return;
  var _f = g.fetch;
  function _timeoutSignal(ms) {
    try {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
    } catch (e) {}
    try {
      if (typeof AbortController === 'function' && typeof setTimeout === 'function') {
        var c = new AbortController();
        var t = setTimeout(function () { try { c.abort(); } catch (e) {} }, ms);
        return c.signal;
      }
    } catch (e) {}
    return undefined;
  }
  function _retryFetch(url, options) {
    if (options && typeof options === 'object' && !options.signal) {
      var t = (typeof options.timeout === 'number') ? options.timeout : 15000;
      if (t > 0) { options = Object.assign({}, options, { signal: _timeoutSignal(t) }); delete options.timeout; }
    }
    return new Promise(function (resolve, reject) {
      var attempt = 0, retries = 2, base = 400, max = 3200;
      function go() {
        _f(url, options).then(function (res) {
          if (res && (res.status === 429 || res.status === 408 || (res.status >= 500 && res.status < 600)) && attempt < retries) {
            attempt++;
            setTimeout(go, Math.min(max, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150));
          } else { resolve(res); }
        }).catch(function (err) {
          if (err && err.name === "AbortError") { reject(err); return; }
          if (attempt < retries) { attempt++; setTimeout(go, Math.min(max, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150)); }
          else { reject(err); }
        });
      }
      go();
    });
  }
  _retryFetch.__RETRY_WRAPPED__ = true;
  try { g.fetch = _retryFetch; } catch (e) {}
})();
/**
 * MonosChinos — vww.monoschinos2.net
 * Search → series page → AJAX episodes → embed extraction → embed69 resolution.
 */
var streamLabels = (function(){try{return require("./stream_labels.js")}catch(e){return null}})();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
 return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};
const HOST = "https://vww.monoschinos2.net";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

// Accent/Ñ-insensitive normalisation. A plain [^a-z0-9] strip deletes "ñ"
// instead of folding it to "n", which breaks every accented Spanish title.
function stripAccents(s) {
    try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    catch (e) {
        return s.replace(/[áàäâã]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
                .replace(/[óòöôõ]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n").replace(/ç/g, "c");
    }
}
function norm(s) { return stripAccents((s || "").toString().toLowerCase()).replace(/[^a-z0-9]/g, ""); }

async function getTmdbInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name),
            originalTitle: type === "movie" ? (res.original_title || res.title) : (res.original_name || res.name),
        };
    } catch (e) { return null; }
}

async function searchSite(searchTitle) {
    const html = await fetch(`${HOST}/animes?buscar=${encodeURIComponent(searchTitle)}`, {
        headers: { ...HEADERS, "Referer": HOST + "/" }
    }).then(r => r.text());

    const ns = norm(searchTitle);
    const blocks = [...html.matchAll(/ficha_efecto">([\s\S]*?)<\/li>/gi)];
    for (const [, block] of blocks) {
        const title = (block.match(/title="([^"]*)"/) || [])[1] || "";
        const href = (block.match(/href="([^"]*)"/) || [])[1] || "";
        if (!title || !href) continue;
        const cleanTitle = title.replace("Ver Anime", "").replace("Online Gratis", "").replace(/&quot;|&amp;|&#039;/g, "").trim();
        if (norm(cleanTitle).includes(ns) || ns.includes(norm(cleanTitle)))
            return href.replace("./", HOST + "/");
    }
    return null;
}

async function getEpisodeUrl(seriesUrl, episode) {
    const html = await fetch(seriesUrl, {
        headers: { ...HEADERS, "Referer": HOST + "/" }
    }).then(r => r.text());

    const dataI = (html.match(/data-i="([^"]+)"/) || [])[1];
    const dataU = (html.match(/data-u="([^"]+)"/) || [])[1];
    if (!dataI || !dataU) return null;

    // AJAX: get episodes
    const postBody = `acc=episodes&i=${encodeURIComponent(dataI)}&u=${encodeURIComponent(dataU)}&p=1`;
    const ajaxHtml = await fetch(`${HOST}/ajax_pagination`, {
        method: "POST",
        headers: {
            ...HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": seriesUrl
        },
        body: postBody
    }).then(r => r.text());

    const targetEp = String(parseInt(episode, 10));
    const articles = [...ajaxHtml.matchAll(/<article>([\s\S]*?)<\/article>/gi)];
    for (const [, article] of articles) {
        const epUrl = (article.match(/href="([^"]+)"/) || [])[1] || "";
        const altMatch = article.match(/alt="[^"]*episodio\s*(\d+)/i) || article.match(/alt="[^"]*capitulo\s*(\d+)/i);
        const epNum = altMatch ? altMatch[1] : "";
        if (epUrl && epNum === targetEp) return epUrl;
    }

    return null;
}

async function getEmbedUrls(episodeUrl) {
    const html = await fetch(episodeUrl, {
        headers: { ...HEADERS, "Referer": HOST + "/" }
    }).then(r => r.text());

    const embeds = [];

    // Pattern 1: target="_blank" href="URL"
    const directLinks = [...html.matchAll(/target="_blank"\s+href="(https?:\/\/[^"]+)"/gi)];
    for (const [, url] of directLinks) {
        if (!/rpmplayer\./.test(url)) embeds.push(url);
    }

    // Pattern 2: data-player="base64" via AJAX
    const encrypt = (html.match(/data-encrypt="([^"]+)"/) || [])[1];
    if (encrypt) {
        const postBody = `acc=opt&i=${encodeURIComponent(encrypt)}`;
        const ajaxHtml = await fetch(`${HOST}/ajax_pagination`, {
            method: "POST",
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": episodeUrl
            },
            body: postBody
        }).then(r => r.text());

        const dataPlayers = [...ajaxHtml.matchAll(/data-player="([^"]+)"/gi)];
        for (const [, b64] of dataPlayers) {
            try {
                const url = Buffer.from(b64, "base64").toString("utf-8");
                if (url.startsWith("http") && !/rpmplayer\./.test(url))
                    embeds.push(url);
            } catch (e) {}
        }
    }

    return [...new Set(embeds)];
}

async function getStreams(id, type, season, episode, title) {
    console.warn(`[MonosChinos] Resolving: ${id} (${type}) S${season}E${episode} "${title || ""}"`);
    if (!id && !title) return [];

    try {
        // Try every title we have: the caller's title (often the site's own
        // romaji/Spanish name), then the TMDB Spanish and English names.
        const candidates = [];
        if (title) candidates.push(title);
        if (id) {
            const info = await getTmdbInfo(id, type);
            if (info) {
                for (const t of [info.title, info.originalTitle]) if (t && !candidates.includes(t)) candidates.push(t);
            }
        }
        if (!candidates.length) return [];

        let searchTitle = candidates[0], seriesUrl = null;
        for (const cand of candidates) {
            seriesUrl = await searchSite(cand);
            if (seriesUrl) { searchTitle = cand; break; }
        }
        if (!seriesUrl) { console.warn(`[MonosChinos] Not found: "${candidates.join('" / "')}"`); return []; }
        console.warn(`[MonosChinos] Series: ${seriesUrl} (via "${searchTitle}")`);

        // For TV: resolve episode URL via AJAX
        let pageUrl = seriesUrl;
        if (type === "tv" && episode) {
            const epUrl = await getEpisodeUrl(seriesUrl, episode);
            if (!epUrl) { console.warn(`[MonosChinos] Episode ${episode} not found`); return []; }
            pageUrl = epUrl;
            console.warn(`[MonosChinos] Episode: ${pageUrl}`);
        }

        const embeds = await getEmbedUrls(pageUrl);
        if (!embeds.length) { console.warn("[MonosChinos] No embeds"); return []; }
        console.warn(`[MonosChinos] Embeds: ${embeds.length}`);

        const { resolveEmbed } = require("./embed69.js");
        let shared = null;
        try { shared = require("./cdn_resolvers.js"); } catch (e) {}
        const streams = [];

        for (const embedUrl of embeds) {
            const server = (embedUrl.match(/:\/\/(?:www\.)?([^.]+)\./) || [])[1] || "?";
            let result = null;
            try { result = await resolveEmbed(embedUrl, server); } catch (e) {}
            // embed69 echoes the embed URL back when it cannot resolve it; the
            // shared module covers the newer mirrors (dhcplay, movearnpre,
            // luluvdo, uqload, streamtape, voe, streamwish, ...).
            const unresolved = !result || !result.url || result.url === embedUrl
                || /\/embed[-/]|\/e\/|\/v\/|\/f\/|\/file\//i.test(String(result.url));
            if (unresolved && shared && typeof shared.resolveEmbed === "function") {
                try {
                    const alt = await shared.resolveEmbed(embedUrl);
                    if (alt && alt.url) result = alt;
                } catch (e) {}
            }
            if (result && result.url && result.url.startsWith("http")) {
                streams.push({
                    provider: "MonosChinos",
                    title: server,
                    url: result.url,
                    quality: result.quality || "HD",
                    headers: result.headers || { Referer: embedUrl, "User-Agent": UA }
                });
                console.warn(`[MonosChinos] Resolved: ${server} → ${result.url.slice(0, 70)}`);
            }
        }

        console.warn(`[MonosChinos] Found ${streams.length} streams`);
        return streams;
    } catch (e) {
        console.warn(`[MonosChinos] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
/* Nuvio cannot play embed pages or isEmbed entries — return media URLs only. */
(function () {
  if (typeof module === 'undefined' || !module.exports) return;
  var _nuvioOrig = module.exports.getStreams;
  if (typeof _nuvioOrig !== 'function' || _nuvioOrig.__DIRECT_ONLY__) return;
  var EMBED_HOST = /(voe\.sx|voe\.|streamwish|strwish|hlswish|awish|wishfast|embedwish|hanerix|filemoon|moonembed|bysesukior|bysesukop|vidhide|minochinos|dintezuvio|morencius|movearnpre|luluvdo|uqload|doodstream|dood\.|ds2play|mixdrop|streamtape|waaw|goodstream|vimeos|fastream|mp4upload|ok\.ru|okcdn|odnoklassniki|embed69|dramiyos|premilkyway|vidmoly|supervideo|streamlare|vibuxer|hglink|dhcplay|filelions|vidnest|dropcdn|barmonrey|rpmvid|vidsrc|playmogo|embedseek|tplayer|vidsonic|vidsuper|primeload|fkplayer|embedshortener|paulinito|zilla-networks|acek-cdn|cloudwindow-route|mega\.nz|mega\.co\.nz)/i;
  var DIRECT_EXT = /\.(m3u8|mp4|ts|mkv|webm|m4v|mov)(\?|#|$)/i;
  var MEDIA_PATH = /(\/m3u8\/|\/hls\/|\/hls2\/|master\.m3u8|playlist\.m3u8|video\.m3u8|\.urlset\/|\/manifest)/i;
  var isPlayable = function (s) {
    if (!s || s.isEmbed === true) return false;
    var u = String(s.url || '');
    if (!/^https?:\/\//i.test(u)) return false;      // no magnet:, no local paths
    if (DIRECT_EXT.test(u) || MEDIA_PATH.test(u)) return true;
    return !EMBED_HOST.test(u);
  };
  // Some CDNs reject a Referer while accepting the bare URL (vimeos family);
  // mp4upload wants its own direct URL as Referer.
  var fixHeaders = function (s) {
    if (!s || !s.url) return s;
    var u = String(s.url).toLowerCase();
    if (/vimeos\.|vms\.sh/.test(u)) {
      var h = {};
      for (var k in (s.headers || {})) {
        if (!/^(referer|origin)$/i.test(k)) h[k] = s.headers[k];
      }
      s.headers = h;
    } else if (/mp4upload\.com/.test(u)) {
      s.headers = Object.assign({}, s.headers || {}, { Referer: s.url });
    }
    return s;
  };
  var wrapped = function () {
    var args = arguments, self = this;
    return Promise.resolve(_nuvioOrig.apply(self, args)).then(function (r) {
      if (!Array.isArray(r)) return r;
      return r.map(fixHeaders).filter(isPlayable);
    });
  };
  wrapped.__DIRECT_ONLY__ = true;
  module.exports.getStreams = wrapped;
})();
