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
 * DoramasFlix — doramasflix.in
 *
 * The site is now a Next.js app whose catalog lives in a public GraphQL API
 * (user-api.seriesapi.co). Scraping the HTML no longer yields players: the
 * episode page is an RSC shell with zero embed markup.
 *
 * Working flow (verified live 2026-10):
 *   1. searchFullDoramas(input)            -> serie slug
 *   2. detailEpisode(filter:{slug})        -> episode _id   (slug: <serie>-<S>x<E>)
 *   3. getEpisodeLinks(id, app)            -> links_online (embed-shortener URLs)
 *   4. cdn_resolvers.resolveEmbed(link)    -> direct m3u8
 *
 * The API hands out links wrapped by an embed shortener
 * (https://embedshortener.co/e/<JWT>); cdn_resolvers unwraps the JWT and then
 * reaches voe.sx / flaswish / streamwish / primeload behind it.
 */
var streamLabels = (function () { try { return require("./stream_labels.js"); } catch (e) { return null; } })();
var buildStreamLabel = streamLabels ? streamLabels.buildStreamLabel : function (s, pn) {
    var q = s.quality || "HD", sr = s.serverName || s.serverLabel || s.servername || "";
    var l = s.lang || s.language || s.audio || "Latino", r = s.isReal === true;
    return { name: pn + " - " + q + (r ? " ✅" : ""), title: l + " - " + sr, quality: q, _resWeight: 0, _sizeWeight: 0 };
};

const API = "https://user-api.seriesapi.co/graphql";
const SITE = "https://doramasflix.in";
// appConfig.android from the site bundle — the API filters link sets by app id
const APP_ID = "com.asiapp.doramasgo";
const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const GQL_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": UA,
    "Origin": SITE,
    "Referer": SITE + "/",
};

const DEBUG = false;
const log = (...a) => { if (DEBUG) console.log("[DoramasFlix]", ...a); };

async function gql(query, variables) {
    try {
        const res = await fetch(API, { method: "POST", headers: GQL_HEADERS, body: JSON.stringify({ query, variables }) });
        if (!res.ok) { log("gql HTTP", res.status); return null; }
        const json = await res.json();
        if (json.errors) log("gql errors", JSON.stringify(json.errors).slice(0, 200));
        return json.data || null;
    } catch (e) { log("gql failed", e.message); return null; }
}

// ─── TMDB titles to search with ─────────────────────────────────────────────
function cleanTitle(t) {
    return String(t || "").replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();
}

async function tmdbTitles(id, type) {
    const out = [];
    for (const lang of ["es-MX", "en-US"]) {
        try {
            const r = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=${lang}`, { headers: { "User-Agent": UA } });
            if (!r.ok) continue;
            const j = await r.json();
            const t = type === "movie" ? (j.title || j.original_title) : (j.name || j.original_name);
            const o = type === "movie" ? j.original_title : j.original_name;
            for (const v of [t, o]) if (v && !out.includes(v)) out.push(v);
        } catch (e) { }
    }
    return out;
}

// ─── API steps ──────────────────────────────────────────────────────────────
const SEARCH_Q = `query SearchFullDoramas($input: String!) {
  searchFullDoramas(input: $input, perPage: 12) {
    items { _id slug name name_es original_name first_air_date }
  }
}`;

const SEARCH_MOVIE_Q = `query SearchFullMovies($input: String!) {
  searchFullMovies(input: $input, perPage: 12) {
    items { _id slug name name_es original_name release_date }
  }
}`;

const EPISODE_Q = `query EpisodeDetailSlug($slug: String!) {
  detailEpisode(filter: { slug: $slug }) {
    _id name slug episode_number season_number serie_id serie_slug serie_name count_links
  }
}`;

const LINKS_Q = `query EpisodeLinksOnline($episode_id: ID!) {
  getEpisodeLinks(id: $episode_id, app: "${APP_ID}") {
    links_online { server lang link _id is_recommended }
  }
}`;

const MOVIE_LINKS_Q = `query MovieLinks($movie_id: ID!) {
  getMovieLinks(id: $movie_id, app: "${APP_ID}") {
    links_online { server lang link _id is_recommended }
  }
}`;

function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function pickMatch(items, titles) {
    if (!items || !items.length) return null;
    for (const title of titles) {
        const nq = norm(cleanTitle(title));
        if (!nq) continue;
        const exact = items.find(it => norm(cleanTitle(it.name)) === nq || norm(cleanTitle(it.name_es)) === nq
            || norm(cleanTitle(it.original_name)) === nq);
        if (exact) return exact;
    }
    for (const title of titles) {
        const nq = norm(cleanTitle(title));
        if (!nq) continue;
        const loose = items.find(it => {
            const cands = [it.name, it.name_es, it.original_name].map(v => norm(cleanTitle(v))).filter(Boolean);
            return cands.some(c => c.includes(nq) || nq.includes(c));
        });
        if (loose) return loose;
    }
    return items[0];
}

// Episode page slug convention used by the site itself: <serie-slug>-<S>x<E>
function episodeSlugCandidates(serieSlug, s, e) {
    return [
        `${serieSlug}-${s}x${e}`,
        `${serieSlug}-${s}x${e < 10 ? String(e).padStart(2, "0") : e}`,
        `${serieSlug}-${s}x1`,
    ];
}

async function findEpisode(serieSlug, s, e) {
    for (const slug of episodeSlugCandidates(serieSlug, s, e)) {
        const d = await gql(EPISODE_Q, { slug });
        if (d && d.detailEpisode && d.detailEpisode._id) return d.detailEpisode;
    }
    return null;
}

// ─── Embed resolution ───────────────────────────────────────────────────────
function langLabel(code) {
    const c = String(code || "");
    if (c === "13111") return "Latino";
    if (c === "13109") return "Castellano";
    if (c === "13113") return "Subtitulado";
    return "Latino";
}

async function resolveLink(link) {
    let resolvers = null;
    try { resolvers = require("./cdn_resolvers.js"); } catch (e) { log("no cdn_resolvers", e.message); }
    if (resolvers && typeof resolvers.resolveEmbed === "function") {
        try {
            const s = await resolvers.resolveEmbed(link);
            if (s && s.url) return { url: s.url, quality: s.quality || "1080p", headers: s.headers || {}, server: s.server || "Embed" };
        } catch (e) { log("resolve failed", e.message); }
    }
    return null;
}

async function streamsFromLinks(links, label) {
    const streams = [];
    const seen = new Set();
    for (const l of (links || []).slice(0, 10)) {
        const link = l.link || l.url;
        if (!link || seen.has(link)) continue;
        seen.add(link);
        const lang = langLabel(l.lang);
        const resolved = await resolveLink(link);
        if (!resolved) { log("unresolved", String(link).slice(0, 70)); continue; }
        if (seen.has(resolved.url)) continue;
        seen.add(resolved.url);
        const quality = resolved.quality || "1080p";
        streams.push({
            name: `${label} - ${quality} ✅`,
            title: `${lang} - ${resolved.server}`,
            url: resolved.url,
            quality,
            isReal: true,
            provider: resolved.server,
            language: lang,
            headers: resolved.headers,
        });
    }
    return streams;
}

// ─── Entry point ────────────────────────────────────────────────────────────
async function getStreams(id, type, season, episode, title) {
    const titles = [];
    if (title) titles.push(title);
    if (id) titles.push(...await tmdbTitles(id, type));
    if (!titles.length) { log("no title/id"); return []; }
    log("resolving", id, type, "titles:", titles.join(" | "));

    // ── movies ──
    if (type === "movie") {
        let items = null;
        for (const t of titles) {
            const data = await gql(SEARCH_MOVIE_Q, { input: t });
            items = data && data.searchFullMovies && data.searchFullMovies.items;
            if (items && items.length) break;
        }
        const match = pickMatch(items, titles);
        if (!match) { log("movie not found"); return []; }
        log("movie match", match.slug);
        const links = await gql(MOVIE_LINKS_Q, { movie_id: match._id });
        const list = links && links.getMovieLinks && links.getMovieLinks.links_online;
        if (!list || !list.length) { log("no movie links"); return []; }
        return await streamsFromLinks(list, "DoramasFlix");
    }

    // ── series ──
    let items = null;
    for (const t of titles) {
        const data = await gql(SEARCH_Q, { input: t });
        items = data && data.searchFullDoramas && data.searchFullDoramas.items;
        if (items && items.length) break;
    }
    const match = pickMatch(items, titles);
    if (!match) { log("serie not found"); return []; }
    log("serie match", match.slug);

    const ep = await findEpisode(match.slug, season || 1, episode || 1);
    if (!ep) { log("episode not found", match.slug, season, episode); return []; }
    log("episode", ep._id, ep.name, "links:", ep.count_links);

    const linkData = await gql(LINKS_Q, { episode_id: ep._id });
    const list = linkData && linkData.getEpisodeLinks && linkData.getEpisodeLinks.links_online;
    if (!list || !list.length) { log("no links for episode"); return []; }

    const streams = await streamsFromLinks(list, "DoramasFlix");
    log("streams", streams.length);
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
