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
 * SoloLatino provider.
 * Searches sololatino.net → extracts IMDB ID → resolves via embed69 to direct m3u8.
 *
 * embed69 handles: POW challenge, vidhide/streamwish/voe resolution, m3u8 extraction.
 * Falls back to embed69.org/f/<imdb_id> isEmbed if embed69 module unavailable (QuickJS).
 */
var streamLabels = (function(){try{return require("./stream_labels.js")}catch(e){return null}})();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
 return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};
const BASE_URL = "https://sololatino.net";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Referer": BASE_URL + "/",
    "Connection": "keep-alive"
};

// ─── TMDB helpers ──────────────────────────────────────────────────────

async function getTMDBInfo(id, type) {
    try {
        const titles = new Set();
        let year = "", imdb_id = null;
        for (const lang of ["es-MX", "es-ES", "en-US"]) {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=${lang}`;
            const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
            const t = type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name);
            if (t) titles.add(t);
            const orig = res.original_title || res.original_name;
            if (orig) titles.add(orig);
            if (!imdb_id && res.imdb_id) imdb_id = res.imdb_id;
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        }
        return titles.size ? { titles: Array.from(titles), year, imdb_id } : null;
    } catch (e) {
        return null;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function norm(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ─── Search & match ─────────────────────────────────────────────────────

async function searchSite(searchTitle, type) {
    const searchUrl = `${BASE_URL}/buscar?q=${encodeURIComponent(searchTitle).replace(/%20/g, "+")}`;
    const html = await fetch(searchUrl, { headers: HEADERS }).then(r => r.text());
    const cleaned = html.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");

    const cardRegex = /<div class="card">([\s\S]*?)<\/div><\/div><\/a>/gi;
    let match;
    const results = [];
    const ns = norm(searchTitle);
    const wantSeries = type === "tv";

    let bestMatch = null;
    let bestScore = -1e9;
    while ((match = cardRegex.exec(cleaned)) !== null) {
        const cardHtml = match[1];
        const href = cardHtml.match(/href="(.*?)"/);
        const altTitle = cardHtml.match(/alt="(.*?)"/);
        if (!href || !altTitle) continue;
        if (href[1].includes("guia-solo-latino")) continue;

        const isSeries = href[1].includes("/serie/");
        if (wantSeries && !isSeries) continue;
        if (!wantSeries && isSeries) continue;

        const na = norm(altTitle[1]);
        let score = -1;
        if (na === ns) score = 100;                                    // exact
        else if (ns.length >= 6 && (na.includes(ns) || ns.includes(na)) && Math.abs(na.length - ns.length) < 8) score = 40; // substring, only if close length
        else if (ns.length >= 6 && na.includes(ns) && Math.abs(na.length - ns.length) < 8) score = 30;
        if (score > bestScore) { bestScore = score; bestMatch = href[1]; }
    }
    if (bestMatch && bestScore >= 30) return bestMatch;
    return null;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function getStreams(id, type, season, episode, title) {
    console.warn(`[SoloLatino] Resolving: ${id} Type=${type} S${season}E${episode} (${title})`);

    const tmdbInfo = await getTMDBInfo(id, type);
    let imdbId = tmdbInfo ? tmdbInfo.imdb_id : null;
    const titleCandidates = (tmdbInfo && tmdbInfo.titles && tmdbInfo.titles.length)
        ? tmdbInfo.titles : (title ? [title] : []);
    if (!titleCandidates.length) return [];

    try {
        // Step 1: Search on sololatino.net with each title variant until one matches
        let matchedUrl = null, searchTitle = "";
        for (const cand of titleCandidates) {
            matchedUrl = await searchSite(cand, type);
            if (matchedUrl) { searchTitle = cand; break; }
        }
        if (!matchedUrl) {
            console.warn(`[SoloLatino] No match found for: ${titleCandidates.join(" / ")}`);
            return [];
        }
        console.warn(`[SoloLatino] Matched URL: ${matchedUrl}`);

        let targetUrl = matchedUrl;

        // Step 2: For TV, resolve season/episode
        if (type === "tv" && season && episode) {
            const seriesHtml = await fetch(matchedUrl, { headers: HEADERS }).then(r => r.text());
            const cleaned = seriesHtml.replace(/\n|\r|\t|\s{2}|&nbsp;/g, "");

            const epLinkRegex = /<a[^>]*href="([^"]*\/episodio\/[^"]*)"[^>]*>[^<]*E(\d+)[^<]*<\/a>/gi;
            let epMatch;
            while ((epMatch = epLinkRegex.exec(cleaned)) !== null) {
                const epNum = parseInt(epMatch[2]);
                if (epNum === parseInt(episode)) {
                    targetUrl = epMatch[1];
                    break;
                }
            }

            if (targetUrl === matchedUrl) {
                console.warn(`[SoloLatino] Episode S${season}E${episode} not found`);
                return [];
            }
        }

        // Step 3: Try to extract IMDB ID from the page
        const pageHtml = await fetch(targetUrl, { headers: HEADERS }).then(r => r.text());
        const pageImdb = (pageHtml.match(/\/title\/(tt\d+)/) || [])[1];
        if (!imdbId && pageImdb) imdbId = pageImdb;
        if (!imdbId) {
            console.warn("[SoloLatino] No IMDB ID found");
            return [];
        }

        // Step 4: Resolve via embed69 to direct m3u8 URLs
        console.warn(`[SoloLatino] Resolving IMDB ${imdbId} via embed69`);
        try {
            const embed69 = require("./embed69.js");
            const streams = await embed69.getStreams(imdbId, type, season, episode, title);
            if (streams && streams.length > 0) {
                // Prefix provider name
                const result = streams.filter(s => s.url && (s.url.includes(".m3u8") || s.url.includes(".mp4") || s.url.includes("/hls")));
                console.warn(`[SoloLatino] Resolved ${result.length} playable streams`);
                return result.map(s => ({
                    ...s,
                    provider: "SoloLatino",
                    title: s.title || "SoloLatino"
                }));
            }
        } catch (e) {
            console.warn(`[SoloLatino] embed69 resolution failed: ${e.message}`);
        }

        console.warn("[SoloLatino] No playable streams resolved");
        return [];

    } catch (err) {
        console.warn(`[SoloLatino] Error: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
