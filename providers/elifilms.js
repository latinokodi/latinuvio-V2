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
 * EliFilms provider — AllCalidad (allcalidad.cc)
 *
 * HISTORY: the 2026-10-27 PHP2Shell patch (CVE-2026-109618/109619) killed the
 * old WP stack behind allcalidad.re (Cloudflare 522). The brand now serves the
 * "imnest" React theme from allcalidad.cc; its REST API moved from
 * /api/rest/ to /api/rest/v1/ and changed shape. Verified live endpoints:
 *
 *   GET /api/rest/v1/search?q=<query>&page=1
 *       -> { items:[{catalog_item_id, kind:"movie"|"serie", slug, title,
 *                    tmdb_id, year, url, poster_path, ...}], pagination, q }
 *   GET /api/rest/v1/content/<kind>/<slug>            (kind = movie | serie)
 *       -> { item:{ player_url, tmdb_id, ... }, cast, crew, overview, related }
 *   GET /api/rest/v1/episodes?item_id=<catalog_item_id>&season=<n>
 *       -> { episodes:[{ season, episode, player_url, playable, title }], cursor }
 *
 * Playback chain (all server-rendered, no embed page ever handed to Nuvio):
 *   item.player_url = https://videoapp.mov/e/movie/<tmdb>
 *                     https://videoapp.mov/e/tv/<tmdb>/<season>/<episode>
 *     -> fetch that page, read <iframe src="https://vimeos.net/embed-*.html?cf=JWT">
 *     -> fetch the vimeos embed; it inlines
 *          window.VIDAPI_CF_STREAM_RESPONSE = {data:{stream_urls:["<master.m3u8>"]}}
 *     -> master.m3u8 is a real HLS manifest (#EXTM3U) with 480p/720p variants.
 *
 * Supports: movies, TV shows.
 */
var streamLabels = (function(){try{return require("./stream_labels.js")}catch(e){return null}})();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function(s,pn) {
 var q = s.quality||"HD", sr = s.serverName||s.serverLabel||s.servername||"";
 var l = s.lang||s.language||s.audio||"Latino", r = s.isReal===true;
  return {name: pn+" - "+q+(r?" ✅":""), title: l+" - "+sr, quality: q, _resWeight:0, _sizeWeight:0};
};

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const HOST = "https://allcalidad.cc";
const API = `${HOST}/api/rest/v1`;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const API_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Referer": HOST + "/",
    "Origin": HOST
};

const PAGE_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    "Referer": HOST + "/"
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function originOf(url) {
    try { return new URL(url).origin; } catch (e) { return HOST; }
}

function normalizeTitle(value) {
    return String(value || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

async function fetchText(url, headers) {
    try {
        const res = await fetch(url, { headers: headers || PAGE_HEADERS, redirect: "follow" });
        if (!res || !res.ok) {
            console.log(`[EliFilms] HTTP ${res && res.status} for ${url}`);
            return null;
        }
        return await res.text();
    } catch (e) {
        console.log(`[EliFilms] Fetch error (${url}): ${e.message}`);
        return null;
    }
}

async function fetchJson(url, headers) {
    try {
        const res = await fetch(url, { headers: headers || API_HEADERS, redirect: "follow" });
        if (!res || !res.ok) {
            console.log(`[EliFilms] HTTP ${res && res.status} for ${url}`);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.log(`[EliFilms] JSON error (${url}): ${e.message}`);
        return null;
    }
}

function qualityLabel(height) {
    const h = parseInt(height, 10) || 0;
    if (h >= 2160) return "4K";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
    if (h > 0) return `${h}p`;
    return "HD";
}

// Max resolution advertised by a master playlist (label only — never a gate).
async function manifestQuality(url, headers) {
    try {
        const res = await fetch(url, { headers });
        if (!res || !res.ok) return null;
        const text = await res.text();
        if (!/#EXTM3U/.test(text)) return null;
        let best = 0;
        for (const line of text.split("\n")) {
            const m = line.match(/RESOLUTION=\d+x(\d+)/i);
            if (m) best = Math.max(best, parseInt(m[1], 10));
        }
        return best > 0 ? qualityLabel(best) : "HD";
    } catch (e) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// TMDB — collect multiple language/original titles + year
// ---------------------------------------------------------------------------

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
    for (const lang of ["es-MX", "es-ES", "en-US"]) {
        try {
            const kind = type === "movie" ? "movie" : "tv";
            const url = `https://api.themoviedb.org/3/${kind}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`;
            const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(r => r.json());
            if (!res || res.success === false) continue;
            const title = type === "movie" ? res.title : res.name;
            const original = type === "movie" ? res.original_title : res.original_name;
            if (title) titles.add(title);
            if (original) titles.add(original);
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        } catch (e) {
            console.log(`[EliFilms] TMDB error (${lang}): ${e.message}`);
        }
    }
    if (!titles.size) return null;
    const list = Array.from(titles);
    return {
        id: Number(id),
        titles: list,
        titlesNorm: list.map(normalizeTitle).filter(Boolean),
        year,
        kind: type === "tv" ? "serie" : "movie"
    };
}

// ---------------------------------------------------------------------------
// AllCalidad /api/rest/v1 catalog
// ---------------------------------------------------------------------------

async function searchCatalog(query) {
    const url = `${API}/search?q=${encodeURIComponent(query)}&page=1`;
    const json = await fetchJson(url);
    const items = json && Array.isArray(json.items) ? json.items : [];
    if (items.length) console.log(`[EliFilms] search "${query}" -> ${items.length} item(s)`);
    return items;
}

async function getContent(kind, slug) {
    if (!slug) return null;
    const json = await fetchJson(`${API}/content/${kind}/${encodeURIComponent(slug)}`);
    return json && json.item ? json.item : null;
}

async function getEpisodes(itemId, season) {
    if (!itemId) return [];
    let url = `${API}/episodes?item_id=${encodeURIComponent(itemId)}`;
    if (season !== null && season !== undefined && season !== "") url += `&season=${encodeURIComponent(season)}`;
    const json = await fetchJson(url);
    return json && Array.isArray(json.episodes) ? json.episodes : [];
}

// Score a search hit against the TMDB identity. -1 means "not a candidate".
function scoreCatalogItem(item, info) {
    if (!item || item.kind !== info.kind) return -1;
    let score = 0;
    const tmdbHit = item.tmdb_id !== null && item.tmdb_id !== undefined &&
                    Number(item.tmdb_id) === Number(info.id);
    if (tmdbHit) {
        score += 1000;
    } else {
        const title = normalizeTitle(item.title);
        if (!title) return -1;
        const exact = info.titlesNorm.includes(title);
        const loose = info.titlesNorm.some(t => t && t.length >= 3 && (title.includes(t) || t.includes(title)));
        if (exact) score += 100;
        else if (loose) score += 40;
        else return -1;
    }
    const itemYear = Number(item.year) || 0;
    const tmdbYear = Number(info.year) || 0;
    if (itemYear && tmdbYear) {
        const delta = Math.abs(itemYear - tmdbYear);
        if (delta === 0) score += 30;
        else if (delta <= 1) score += 15;
        else if (delta > 2) score -= 20;
    }
    return score;
}

async function findCatalogItems(info) {
    const queries = [];
    for (const title of info.titles) {
        const full = String(title || "").trim();
        if (full.length >= 3) queries.push(full);
        const short = full.split(/\s+/).filter(w => w.length > 1).slice(0, 3).join(" ");
        if (short.length >= 3 && short !== full) queries.push(short);
    }
    const uniqueQueries = Array.from(new Set(queries)).slice(0, 5);
    const seen = new Set();
    const scored = [];
    for (const query of uniqueQueries) {
        const items = await searchCatalog(query);
        for (const item of items) {
            const key = item.catalog_item_id || item.slug || item.url;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            const score = scoreCatalogItem(item, info);
            if (score > 0) scored.push({ item, score });
        }
        // A perfect TMDB+kind hit is enough — stop querying.
        if (scored.some(s => s.score >= 1000)) break;
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
}

// ---------------------------------------------------------------------------
// Player chain: videoapp.mov  ->  vimeos.net embed  ->  master.m3u8
// ---------------------------------------------------------------------------

// Balance-aware slice of a JSON object literal starting at `start` ({).
function readBalancedObject(source, start) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }
    return null;
}

// window.VIDAPI_CF_STREAM_RESPONSE = {"data":{"stream_urls":[...]}}
function extractStreamUrls(html) {
    if (!html) return [];
    const marker = html.indexOf("VIDAPI_CF_STREAM_RESPONSE");
    if (marker === -1) return [];
    const start = html.indexOf("{", marker);
    if (start === -1) return [];
    const jsonText = readBalancedObject(html, start);
    if (!jsonText) return [];
    try {
        const parsed = JSON.parse(jsonText);
        const list = parsed && parsed.data && parsed.data.stream_urls;
        return Array.isArray(list) ? list.filter(u => typeof u === "string" && /^https?:\/\//i.test(u)) : [];
    } catch (e) {
        return [];
    }
}

// Dean Edwards eval() packer decoder (legacy vimeos pages still use it).
function unpackEval(payload, radix, symtab) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unbase = (str) => {
        let result = 0;
        for (let i = 0; i < str.length; i++) {
            const pos = chars.indexOf(str[i]);
            if (pos === -1) return NaN;
            result = result * radix + pos;
        }
        return result;
    };
    return payload.replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
        const idx = unbase(match);
        if (isNaN(idx) || idx >= symtab.length) return match;
        return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
    });
}

function unpackPage(html) {
    if (!html) return null;
    const m = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (!m) return null;
    try {
        return unpackEval(m[1], parseInt(m[2], 10), m[4].split("|"));
    } catch (e) {
        return null;
    }
}

function firstM3u8(text) {
    if (!text) return null;
    const m = text.match(/https?:\\?\/\\?\/[^\s"'\\<]+\.m3u8[^\s"'\\<]*/i);
    if (m) return m[0].replace(/\\\//g, "/");
    const plain = text.match(/https?:\/\/[^\s"'<]+\.m3u8[^\s"'<]*/i);
    return plain ? plain[0] : null;
}

// Resolve a vimeos.net / vimeos.zip style embed page to a direct HLS URL.
// The `cf` token carries an allowed-origin list (["https://videoapp.mov",
// "https://allcalidad.cc"]); a vimeos.net or absent Referer gets a 1 KB stub
// instead of the stream payload, so the parent origin MUST be forwarded.
async function resolveVimeosEmbed(embedUrl, referer) {
    const headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": referer || (HOST + "/")
    };
    const html = await fetchText(embedUrl, headers);
    if (!html) return null;

    // 1. Current format: window.VIDAPI_CF_STREAM_RESPONSE -> data.stream_urls[]
    const streamUrls = extractStreamUrls(html);
    if (streamUrls.length) {
        for (const candidate of streamUrls) {
            const quality = await manifestQuality(candidate, {
                "User-Agent": USER_AGENT,
                "Referer": originOf(candidate) + "/"
            });
            return {
                url: candidate,
                quality: quality || "HD",
                server: "Vimeos",
                headers: { "User-Agent": USER_AGENT, "Referer": originOf(candidate) + "/" }
            };
        }
    }

    // 2. Legacy format: eval-packed jwplayer config with sources:[{file:"..."}]
    const unpacked = unpackPage(html);
    if (unpacked) {
        const candidate = firstM3u8(unpacked);
        if (candidate) {
            return {
                url: candidate,
                quality: await manifestQuality(candidate, { "User-Agent": USER_AGENT }) || "HD",
                server: "Vimeos",
                headers: { "User-Agent": USER_AGENT, "Referer": originOf(candidate) + "/" }
            };
        }
    }

    // 3. Last resort: a bare .m3u8 somewhere in the page.
    const bare = firstM3u8(html);
    if (bare) {
        return {
            url: bare,
            quality: await manifestQuality(bare, { "User-Agent": USER_AGENT }) || "HD",
            server: "Vimeos",
            headers: { "User-Agent": USER_AGENT, "Referer": originOf(bare) + "/" }
        };
    }
    return null;
}

// item.player_url -> videoapp.mov page -> vimeos embed -> direct m3u8
async function resolvePlayerUrl(playerUrl) {
    if (!playerUrl) return null;
    if (/vimeos\.(net|zip|sx|to|com)/i.test(playerUrl)) {
        return resolveVimeosEmbed(playerUrl, HOST + "/");
    }

    const html = await fetchText(playerUrl, PAGE_HEADERS);
    if (!html) return null;

    // The player page wraps the real embed in a single <iframe>.
    let frame = null;
    const frameMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (frameMatch) frame = frameMatch[1];
    if (!frame) {
        const direct = html.match(/https?:\/\/[^"'\s<>]*vimeos\.[a-z]+\/[^"'\s<>]+/i);
        if (direct) frame = direct[0];
    }
    if (!frame) {
        console.log("[EliFilms] Player page had no iframe/embed URL");
        return null;
    }
    frame = frame.replace(/&amp;/g, "&").replace(/\\\//g, "/");
    if (frame.startsWith("//")) frame = "https:" + frame;

    const resolved = await resolveVimeosEmbed(frame, originOf(playerUrl) + "/");
    if (!resolved) console.log(`[EliFilms] Could not resolve embed ${frame.slice(0, 120)}`);
    return resolved;
}

// ---------------------------------------------------------------------------
// getStreams — public entrypoint
// ---------------------------------------------------------------------------

function makeStream(resolved) {
    return {
        name: "EliFilms",
        title: `${resolved.quality || "HD"} · Latino · ${resolved.server || "Vimeos"}`,
        url: resolved.url,
        quality: resolved.quality || "HD",
        headers: resolved.headers || { "User-Agent": USER_AGENT }
    };
}

async function moviePlayerCandidates(item) {
    const urls = [];
    // The CMS derives the player URL from the TMDB id: /e/movie/<tmdb>.
    if (item.tmdb_id) urls.push(`https://videoapp.mov/e/movie/${item.tmdb_id}`);
    return urls;
}

async function moviePlayerFallback(item) {
    // Authoritative source when the derived URL does not resolve.
    const content = await getContent("movie", item.slug);
    return content && content.player_url ? [content.player_url] : [];
}

async function tvPlayerCandidates(item, season, episode) {
    const wantedSeason = parseInt(season, 10);
    const wantedEpisode = parseInt(episode, 10);
    const urls = [];

    // Ask for the wanted season first, then fall back to the whole list.
    for (const seasonArg of [wantedSeason, undefined]) {
        const episodes = await getEpisodes(item.catalog_item_id, seasonArg);
        const hit = episodes.find(ep =>
            parseInt(ep.season, 10) === wantedSeason &&
            parseInt(ep.episode, 10) === wantedEpisode
        );
        if (hit && hit.player_url) {
            if (hit.playable === false) {
                console.log(`[EliFilms] S${wantedSeason}E${wantedEpisode} flagged not playable`);
            }
            urls.push(hit.player_url);
            break;
        }
        if (seasonArg === wantedSeason && episodes.length) break; // season exists, episode absent
    }

    // Derived fallback: /e/tv/<tmdb>/<season>/<episode>
    if (item.tmdb_id) urls.push(`https://videoapp.mov/e/tv/${item.tmdb_id}/${wantedSeason}/${wantedEpisode}`);
    return Array.from(new Set(urls.filter(Boolean)));
}

async function getStreams(id, type, season, episode) {
    console.log(`[EliFilms] Resolving ID ${id} (${type})` + (type === "tv" ? ` S${season}E${episode}` : ""));

    const info = await getTMDBInfo(id, type);
    if (!info) {
        console.log("[EliFilms] No TMDB info.");
        return [];
    }

    const items = await findCatalogItems(info);
    if (!items.length) {
        console.log("[EliFilms] No catalog match on allcalidad.cc.");
        return [];
    }
    console.log(`[EliFilms] ${items.length} catalog candidate(s); best: "${items[0].title}" (${items[0].slug})`);

    const streams = [];
    for (const item of items.slice(0, 3)) {
        console.log(`[EliFilms] Trying "${item.title}" (${item.kind}/${item.slug})`);

        let candidates = [];
        if (item.kind === "movie") {
            candidates = await moviePlayerCandidates(item);
        } else {
            candidates = await tvPlayerCandidates(item, season, episode);
        }

        let resolved = null;
        for (const playerUrl of candidates) {
            resolved = await resolvePlayerUrl(playerUrl);
            if (resolved && resolved.url) break;
        }
        if (!resolved && item.kind === "movie") {
            for (const playerUrl of await moviePlayerFallback(item)) {
                resolved = await resolvePlayerUrl(playerUrl);
                if (resolved && resolved.url) break;
            }
        }

        if (resolved && resolved.url) {
            console.log(`[EliFilms] Playable: ${resolved.url.slice(0, 120)}`);
            streams.push(makeStream(resolved));
            if (streams.length >= 2) break;
        }
    }

    if (!streams.length) console.log("[EliFilms] No playable stream found.");
    return streams;
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
