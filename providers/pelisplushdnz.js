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
 * PelisPlusHD NZ — pelisplushd.bz
 *
 * Site layout (verified live):
 *   movies : /pelicula/<slug>          -> inline `video[1] = 'https://embed69.org/f/tt…/'`
 *   series : /serie/<slug>             -> episode list, player only on the episode page
 *   anime  : /anime/<slug>             -> same episode layout as series
 *   episode: /<kind>/<slug>/temporada/S/capitulo/E
 *
 * We locate the content page by the site's own search, walk to the episode page
 * for series/anime, read the embed69 folder id off the player block, and hand
 * off to the embed69 resolver.
 */
var streamLabels = (function(){try{return require("./stream_labels.js")}catch(e){return null}})();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
 return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};
const HOST = "https://pelisplushd.bz";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

const CONTENT_LINK = /\/(pelicula|serie|anime)\/([a-z0-9][a-z0-9-]{1,120})/gi;
const EPISODE_LINK = /\/temporada\/(\d+)\/capitulo\/(\d+)/i;

// Accent/Ñ-insensitive normalisation: "El Señor de los Cielos" must match the
// slug "el-senor-de-los-cielos". A plain [^a-z0-9] strip deletes "ñ" instead of
// folding it to "n", which silently broke every accented Spanish title.
function stripAccents(s) {
    try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    catch (e) {
        return s.replace(/[áàäâã]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
                .replace(/[óòöôõ]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n")
                .replace(/[ç]/g, "c");
    }
}
function norm(s) { return stripAccents((s || "").toString().toLowerCase()).replace(/[^a-z0-9]/g, ""); }

async function getTmdbInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return {
            title: type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name),
            original: type === "movie" ? res.original_title : res.original_name
        };
    } catch (e) { return null; }
}

function slugToTitle(slug) {
    return slug.replace(/-/g, " ");
}

// Pick the catalog entry whose slug best matches the requested title.
function pickCandidate(entries, query, preferKinds) {
    const nq = norm(query);
    if (!nq) return null;
    let best = null, bestScore = 0;
    for (const e of entries) {
        const nt = norm(slugToTitle(e.slug));
        if (!nt) continue;
        let score = 0;
        if (nt === nq) score = 100;
        else if (nt.startsWith(nq) || nq.startsWith(nt)) score = 70;
        else if (nt.includes(nq) || nq.includes(nt)) score = 45;
        if (!score) continue;
        // length closeness keeps "saga of tanya the evil" ahead of "youjo senki movie"
        score -= Math.abs(nt.length - nq.length) * 0.2;
        if (preferKinds.includes(e.kind)) score += 15;
        if (score > bestScore) { bestScore = score; best = e; }
    }
    return bestScore >= 30 ? best : null;
}

function collectLinks(html) {
    const out = [];
    for (const m of html.matchAll(CONTENT_LINK)) {
        out.push({ kind: m[1].toLowerCase(), slug: m[2].toLowerCase() });
    }
    return out;
}

async function searchSite(searchTitle, type) {
    const preferKinds = type === "tv" ? ["serie", "anime"] : ["pelicula"];
    let entries = [];

    // 1) the site's own search endpoint
    try {
        const html = await fetch(`${HOST}/search?s=${encodeURIComponent(searchTitle)}`, { headers: HEADERS }).then(r => r.text());
        entries = collectLinks(html).filter(e => preferKinds.includes(e.kind));
    } catch (e) {}

    // 2) catalog browse fallback
    if (!entries.length) {
        const pages = type === "tv" ? ["/series", "/animes"] : ["/peliculas"];
        for (const page of pages) {
            try {
                const html = await fetch(HOST + page, { headers: HEADERS }).then(r => r.text());
                entries = entries.concat(collectLinks(html).filter(e => preferKinds.includes(e.kind)));
            } catch (e) {}
        }
    }

    const best = pickCandidate(entries, searchTitle, preferKinds);
    if (!best) return null;
    return { url: `${HOST}/${best.kind}/${best.slug}`, kind: best.kind, slug: best.slug };
}

// Resolve a series/anime page down to the concrete episode page.
async function resolveEpisodePage(content, season, episode) {
    if (content.kind === "pelicula") return content.url;
    let html;
    try { html = await fetch(content.url, { headers: { ...HEADERS, "Referer": HOST + "/" } }).then(r => r.text()); }
    catch (e) { return null; }

    const wantS = season || 1, wantE = episode || 1;
    // The series page links episodes relative to itself
    // ("/temporada/1/capitulo/1"), so prefix with the content URL when needed.
    const patterns = [
        new RegExp(`/temporada/${wantS}/capitulo/${wantE}(?![0-9])`, "i"),
        new RegExp(`/temporada/${wantS}/capitulo/\\d+`, "i"),
        /\/temporada\/\d+\/capitulo\/\d+/i
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (!m) continue;
        const frag = m[0];
        if (/^\/temporada\//i.test(frag)) return `${content.url}${frag}`;
        if (/^https?:\/\//i.test(frag)) return frag;
        return HOST + (frag.startsWith("/") ? frag : "/" + frag);
    }
    return null;
}

// The player block on a movie/episode page looks like:
//   video[1] = 'https://embed69.org/f/tt9507276/';   (movie)
//   video[1] = 'https://embed69.org/f/tt2777882-1x01/'; (episode)
function extractImdb(html) {
    const direct = html.match(/embed69\.org\/f\/(tt\d{4,10})/i);
    if (direct) return direct[1];
    const folder = html.match(/\/f\/(tt\d{4,10})/i);
    if (folder) return folder[1];
    const any = html.match(/tt\d{6,10}/);
    return any ? any[0] : null;
}

async function getStreams(id, type, season, episode, title) {
    console.warn(`[PelisPlusHDnz] Resolving: ${id} (${type}) "${title || ""}"`);
    if (!id && !title) return [];

    try {
        const info = id ? await getTmdbInfo(id, type) : null;
        const searchTitles = [title, info && info.title, info && info.original]
            .filter((t, i, a) => t && a.indexOf(t) === i);

        let content = null, usedTitle = null;
        for (const t of searchTitles) {
            content = await searchSite(t, type);
            if (content) { usedTitle = t; break; }
        }
        if (!content) { console.warn(`[PelisPlusHDnz] Not found: "${searchTitles.join(" / ")}"`); return []; }
        console.warn(`[PelisPlusHDnz] Found: ${content.url} (via "${usedTitle}")`);

        const pageUrl = await resolveEpisodePage(content, season, episode);
        if (!pageUrl) { console.warn(`[PelisPlusHDnz] No episode page for S${season || 1}E${episode || 1}`); return []; }

        const html = await fetch(pageUrl, { headers: { ...HEADERS, "Referer": HOST + "/" } }).then(r => r.text());
        const imdbId = extractImdb(html);
        if (!imdbId) { console.warn(`[PelisPlusHDnz] No embed69/IMDB id on ${pageUrl}`); return []; }
        console.warn(`[PelisPlusHDnz] Resolving IMDB ${imdbId} via embed69 (${pageUrl})`);

        const embed69 = require("./embed69.js");
        const streams = await embed69.getStreams(imdbId, type, season, episode, title);
        return Array.isArray(streams) ? streams : [];
    } catch (e) {
        console.warn(`[PelisPlusHDnz] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams, searchSite, extractImdb, pickCandidate };
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
