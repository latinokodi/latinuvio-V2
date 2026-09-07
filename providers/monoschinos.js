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

function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

async function getTmdbInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`;
        const res = await fetch(url, { headers: HEADERS }).then(r => r.json());
        return { title: type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name) };
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
        let searchTitle = title;
        if (id) { const info = await getTmdbInfo(id, type); if (info) searchTitle = info.title || title; }
        if (!searchTitle) return [];

        const seriesUrl = await searchSite(searchTitle);
        if (!seriesUrl) { console.warn(`[MonosChinos] Not found: "${searchTitle}"`); return []; }
        console.warn(`[MonosChinos] Series: ${seriesUrl}`);

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
        const streams = [];

        for (const embedUrl of embeds) {
            const server = (embedUrl.match(/:\/\/(?:www\.)?([^.]+)\./) || [])[1] || "?";
            const result = await resolveEmbed(embedUrl, server);
            if (result && result.url && result.url.startsWith("http")) {
                streams.push({
                    provider: "MonosChinos",
                    title: server,
                    url: result.url,
                    quality: result.quality || "HD",
                    headers: { Referer: embedUrl, "User-Agent": UA }
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
