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
 * HackStore provider — hackstore.mx
 *
 * HISTORY: the 2026-10-27 PHP2Shell patch (CVE-2026-109618/109619) took the old
 * WordPress install (hackstore2.com) down — Cloudflare 522. The brand now runs
 * the "hackstorefo" React theme on hackstore.mx with the same JSON envelope
 * ({error, message, data}) but a NEW namespace. `window.siteConfig` on the live
 * site declares it explicitly:
 *
 *   apiUrl  : https://hackstore.mx/wp-json/wpf/v1   (WP REST)
 *   fastApi : https://hackstore.mx/wp-api/v1        <-- the one the app uses
 *
 * Verified live endpoints (all GET, JSON):
 *   /wp-api/v1/search?postType=any&q=<query>&postsPerPage=<n>
 *       -> {data:{posts:[{_id, title, slug, type:"movies"|"tvshows", release_date,
 *                         original_title, lang, quality, ...}], pagination}}
 *       (queries shorter than 3 chars are rejected by the site)
 *   /wp-api/v1/single/<type>?slug=<slug>&postType=<type>
 *       -> {data:{...post, _id}}            (optional; search already returns _id)
 *   /wp-api/v1/single/episodes/list?_id=<seriesId>&season=<n>&page=1&postsPerPage=<n>
 *       -> {data:{posts:[{_id, season_number, episode_number, slug, ...}],
 *                 seasons:["1","2",...], pagination}}
 *   /wp-api/v1/player?postId=<postId>&demo=0
 *       -> {data:{embeds:[{url, server, lang, quality}], downloads:[]}}
 *       (irrelevant posts expose the placeholder https://hackstore.mx/wait/ —
 *        "Video en preparación" — which is filtered out below)
 *
 * Embeds are vimeos.net / voe.sx / goodstream / streamwish pages; each is
 * resolved to a direct HLS/MP4 URL. Supports: movies, TV shows.
 */

const HOST = "https://hackstore.mx";
const API = `${HOST}/wp-api/v1`;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const API_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Referer": HOST + "/"
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
            console.log(`[Hackstore] HTTP ${res && res.status} for ${url}`);
            return null;
        }
        return await res.text();
    } catch (e) {
        console.log(`[Hackstore] Fetch error (${url}): ${e.message}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Quality detection
// ---------------------------------------------------------------------------

const QUALITY_MAPS = {
    vimeos: { x: "1080p", o: "1080p", h: "720p", n: "480p", l: "360p" },
    goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" },
    vidhide: { n: "720p", l: "480p" },
    streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" },
    voe: { n: "720p", l: "360p" }
};
const QUALITY_ORDER = ["x", "o", "h", "n", "l"];

function qualityFamily(url) {
    const u = String(url || "");
    if (u.includes("vimeos")) return QUALITY_MAPS.vimeos;
    if (u.includes("goodstream")) return QUALITY_MAPS.goodstream;
    if (u.includes("cloudwindow-route")) return QUALITY_MAPS.voe;
    if (u.includes("minochinos") || u.includes("vidhide") || u.includes("dintezuvio") || u.includes("dramiyos")) return QUALITY_MAPS.vidhide;
    if (u.includes("premilkyway") || u.includes("hlswish") || u.includes("vibuxer") || u.includes("streamwish")) return QUALITY_MAPS.streamwish;
    return null;
}

function qualityFromUrl(url) {
    if (!url) return "HD";
    const family = qualityFamily(url);
    if (family) {
        const m = String(url).match(/_,([a-z,]+),\.urlset/);
        if (m) {
            const letters = m[1].split(",").filter(Boolean);
            for (const letter of QUALITY_ORDER) {
                if (letters.includes(letter) && family[letter]) return family[letter];
            }
        }
    }
    const px = String(url).match(/[_\-\/](\d{3,4})p/);
    return px ? `${px[1]}p` : "HD";
}

function resolutionLabel(width, height) {
    if (width >= 3840 || height >= 2160) return "4K";
    if (width >= 1920 || height >= 1080) return "1080p";
    if (width >= 1280 || height >= 720) return "720p";
    if (width >= 854 || height >= 480) return "480p";
    return "360p";
}

async function probeQuality(url, headers) {
    try {
        const res = await fetch(url, { headers: Object.assign({ "User-Agent": USER_AGENT }, headers || {}), redirect: "follow" });
        const text = await res.text();
        if (!text.includes("#EXT-X-STREAM-INF")) {
            const px = String(url).match(/[_-](\d{3,4})p/);
            return px ? `${px[1]}p` : "HD";
        }
        let bestWidth = 0;
        let bestHeight = 0;
        for (const line of text.split("\n")) {
            const m = line.match(/RESOLUTION=(\d+)x(\d+)/);
            if (m) {
                const height = parseInt(m[2], 10);
                if (height > bestHeight) {
                    bestHeight = height;
                    bestWidth = parseInt(m[1], 10);
                }
            }
        }
        return bestHeight > 0 ? resolutionLabel(bestWidth, bestHeight) : "HD";
    } catch (e) {
        return "HD";
    }
}

async function resolveQuality(url, headers) {
    const fromUrl = qualityFromUrl(url);
    return fromUrl !== "HD" ? fromUrl : probeQuality(url, headers);
}

// ---------------------------------------------------------------------------
// Embed-page extraction helpers (vimeos family)
// ---------------------------------------------------------------------------

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

// Pull the jwplayer config's hls2/3/4 or a bare .m3u8 out of unpacked JS.
function hlsFromUnpacked(unpacked, origin) {
    const direct = unpacked.match(/"hls[234]"\s*:\s*"([^"]+)"/);
    if (direct) return direct[1].startsWith("/") ? origin + direct[1] : direct[1];
    const source = unpacked.match(/(?:file|src)\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
    if (source) return source[1].startsWith("/") ? origin + source[1] : source[1];
    return firstM3u8(unpacked);
}

function firstM3u8(text) {
    if (!text) return null;
    const escaped = text.match(/https?:\\?\/\\?\/[^\s"'\\<]+\.m3u8[^\s"'\\<]*/i);
    if (escaped) return escaped[0].replace(/\\\//g, "/");
    const plain = text.match(/https?:\/\/[^\s"'<]+\.m3u8[^\s"'<]*/i);
    return plain ? plain[0] : null;
}

// ---------------------------------------------------------------------------
// Embed resolvers
// ---------------------------------------------------------------------------

async function resolveVimeos(embedUrl) {
    try {
        console.log(`[Vimeos] Resolviendo: ${embedUrl}`);
        const html = await fetchText(embedUrl, {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Referer": HOST + "/"
        });
        if (!html) return null;

        // 1. Current vimeos format.
        const streamUrls = extractStreamUrls(html);
        if (streamUrls.length) {
            const url = streamUrls[0];
            const quality = await resolveQuality(url, { Referer: originOf(url) + "/" });
            console.log(`[Vimeos] URL encontrada (${quality}): ${url.slice(0, 90)}`);
            return { url, quality, headers: { "User-Agent": USER_AGENT, Referer: originOf(url) + "/" } };
        }

        // 2. Legacy eval-packed jwplayer config.
        const unpacked = unpackPage(html);
        if (unpacked) {
            const url = hlsFromUnpacked(unpacked, originOf(embedUrl));
            if (url) {
                const quality = await resolveQuality(url, { Referer: originOf(url) + "/" });
                console.log(`[Vimeos] URL encontrada (${quality}): ${url.slice(0, 90)}`);
                return { url, quality, headers: { "User-Agent": USER_AGENT, Referer: originOf(url) + "/" } };
            }
        }

        // 3. Bare .m3u8 anywhere in the page.
        const bare = firstM3u8(html);
        if (bare) {
            const quality = await resolveQuality(bare, {});
            console.log(`[Vimeos] URL encontrada (${quality}): ${bare.slice(0, 90)}`);
            return { url: bare, quality, headers: { "User-Agent": USER_AGENT, Referer: originOf(bare) + "/" } };
        }

        console.log("[Vimeos] No se encontró URL");
        return null;
    } catch (e) {
        console.log(`[Vimeos] Error: ${e.message}`);
        return null;
    }
}

function base64Decode(value) {
    try {
        return typeof atob !== "undefined" ? atob(value) : Buffer.from(value, "base64").toString("utf8");
    } catch (e) {
        return null;
    }
}

// VOE's two-stage obfuscation: ROT-26-ish shift, then base64(+3 shift, reverse).
function voeDecode(encoded, keyArrayText) {
    try {
        const keys = keyArrayText
            .replace(/^\[|\]$/g, "")
            .split("','")
            .map(item => item.replace(/^'+|'+$/g, ""))
            .map(item => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        let shifted = "";
        for (const ch of encoded) {
            let code = ch.charCodeAt(0);
            if (code > 64 && code < 91) code = (code - 52) % 26 + 65;
            else if (code > 96 && code < 123) code = (code - 84) % 26 + 97;
            shifted += String.fromCharCode(code);
        }
        for (const key of keys) shifted = shifted.replace(new RegExp(key, "g"), "_");
        shifted = shifted.split("_").join("");
        const decoded = base64Decode(shifted);
        if (!decoded) return null;
        let unshifted = "";
        for (let i = 0; i < decoded.length; i++) {
            unshifted += String.fromCharCode((decoded.charCodeAt(i) - 3 + 256) % 256);
        }
        const reversed = unshifted.split("").reverse().join("");
        const json = base64Decode(reversed);
        return json ? JSON.parse(json) : null;
    } catch (e) {
        console.log("[VOE] voeDecode error:", e.message);
        return null;
    }
}

async function resolveVoe(embedUrl) {
    try {
        console.log(`[VOE] Resolviendo: ${embedUrl}`);
        const fetchVoe = (url, referer) => fetch(url, {
            headers: Object.assign({ "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, referer ? { Referer: referer } : {}),
            redirect: "follow"
        });

        let res = await fetchVoe(embedUrl, embedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let html = await res.text();

        if (/permanentToken/i.test(html)) {
            const redirect = html.match(/window\.location\.href\s*=\s*'([^']+)'/i);
            if (redirect) {
                console.log(`[VOE] Permanent token redirect -> ${redirect[1]}`);
                const next = await fetchVoe(redirect[1], embedUrl);
                if (next.ok) html = await next.text();
            }
        }

        const packed = html.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
        if (packed) {
            const encoded = packed[1];
            const loaderUrl = packed[2].startsWith("http") ? packed[2] : new URL(packed[2], embedUrl).href;
            console.log(`[VOE] Found encoded array + loader: ${loaderUrl}`);
            const loaderRes = await fetchVoe(loaderUrl, embedUrl);
            const loaderText = loaderRes.ok ? await loaderRes.text() : "";
            const keyArray = loaderText.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) ||
                             loaderText.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
            if (keyArray) {
                const data = voeDecode(encoded, keyArray[1]);
                const source = data && (data.source || data.direct_access_url);
                if (source) {
                    const quality = await resolveQuality(source, { Referer: embedUrl });
                    console.log(`[VOE] URL encontrada (${quality}): ${source.slice(0, 90)}`);
                    return { url: source, quality, headers: { "User-Agent": USER_AGENT, Referer: embedUrl } };
                }
            }
        }

        // Fallback: inline mp4/hls fields.
        const candidates = [];
        for (const re of [/(?:mp4|hls)'\s*:\s*'([^']+)'/gi, /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi]) {
            let m;
            while ((m = re.exec(html)) !== null) candidates.push(m[1]);
        }
        for (let candidate of candidates) {
            if (!candidate) continue;
            if (candidate.startsWith("aHR0")) {
                try { candidate = atob(candidate); } catch (e) { /* keep raw */ }
            }
            const quality = await resolveQuality(candidate, { Referer: embedUrl });
            console.log(`[VOE] URL encontrada (${quality}): ${candidate.slice(0, 90)}`);
            return { url: candidate, quality, headers: { "User-Agent": USER_AGENT, Referer: embedUrl } };
        }
        console.log("[VOE] No se encontró URL");
        return null;
    } catch (e) {
        console.log(`[VOE] Error: ${e.message}`);
        return null;
    }
}

async function resolveGoodstream(embedUrl) {
    try {
        console.log(`[GoodStream] Resolviendo: ${embedUrl}`);
        const res = await fetch(embedUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                Referer: "https://goodstream.one/",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            redirect: "follow"
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const match = html.match(/file:\s*"([^"]+)"/);
        if (!match) {
            console.log('[GoodStream] No se encontró patrón file:"..."');
            return null;
        }
        const url = match[1];
        const quality = qualityFromUrl(url);
        console.log(`[GoodStream] URL encontrada (${quality}): ${url.slice(0, 90)}`);
        return {
            url,
            quality,
            headers: { Referer: embedUrl, Origin: "https://goodstream.one", "User-Agent": USER_AGENT }
        };
    } catch (e) {
        console.log(`[GoodStream] Error: ${e.message}`);
        return null;
    }
}

const HLSWISH_HOST_MAP = { "hglink.to": "vibuxer.com" };

async function resolveHlswish(embedUrl) {
    try {
        let target = embedUrl;
        for (const [from, to] of Object.entries(HLSWISH_HOST_MAP)) {
            if (target.includes(from)) {
                target = target.replace(from, to);
                console.log(`[HLSWish] → Mapped to: ${target}`);
                break;
            }
        }
        const origin = (target.match(/^(https?:\/\/[^/]+)/) || [])[1] || "https://hlswish.com";
        console.log(`[HLSWish] Resolviendo: ${embedUrl}`);

        const res = await fetch(target, {
            headers: {
                "User-Agent": USER_AGENT,
                Referer: HOST + "/",
                Origin: HOST,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            redirect: "follow"
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (fileMatch) {
            let url = fileMatch[1];
            if (url.startsWith("/")) url = origin + url;
            if (url.includes("vibuxer.com/stream/")) {
                console.log(`[HLSWish] Siguiendo redirect: ${url.slice(0, 90)}`);
                try {
                    const finalUrl = (await fetch(url, { headers: { "User-Agent": USER_AGENT, Referer: origin + "/" }, redirect: "follow" })).url;
                    if (finalUrl && finalUrl.includes(".m3u8")) url = finalUrl;
                } catch (e) { /* keep original */ }
            }
            const quality = await resolveQuality(url, { "User-Agent": USER_AGENT, Referer: origin + "/" });
            console.log(`[HLSWish] URL encontrada (${quality}): ${url.slice(0, 90)}`);
            return { url, quality, headers: { "User-Agent": USER_AGENT, Referer: origin + "/" } };
        }

        const unpacked = unpackPage(html);
        if (unpacked) {
            const url = firstM3u8(unpacked);
            if (url) {
                const quality = await resolveQuality(url, { "User-Agent": USER_AGENT, Referer: origin + "/" });
                console.log(`[HLSWish] URL encontrada (${quality}): ${url.slice(0, 90)}`);
                return { url, quality, headers: { "User-Agent": USER_AGENT, Referer: origin + "/" } };
            }
        }

        const bare = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (bare) {
            const quality = await resolveQuality(bare[0], {});
            console.log(`[HLSWish] URL encontrada (${quality}): ${bare[0].slice(0, 90)}`);
            return { url: bare[0], quality, headers: { "User-Agent": USER_AGENT, Referer: origin + "/" } };
        }

        console.log("[HLSWish] No se encontró URL");
        return null;
    } catch (e) {
        console.log(`[HLSWish] Error: ${e.message}`);
        return null;
    }
}

const EMBED_RESOLVERS = {
    "vimeos.net": resolveVimeos,
    "vimeos.zip": resolveVimeos,
    "vimeos.sx": resolveVimeos,
    "vimeos.to": resolveVimeos,
    "goodstream.one": resolveGoodstream,
    "goodstream.co": resolveGoodstream,
    "hlswish.com": resolveHlswish,
    "streamwish.com": resolveHlswish,
    "streamwish.to": resolveHlswish,
    "strwish.com": resolveHlswish,
    "vibuxer.com": resolveHlswish,
    "voe.sx": resolveVoe
};

function resolverFor(embedUrl) {
    let host = "";
    try { host = new URL(embedUrl).hostname.toLowerCase(); } catch (e) { return null; }
    for (const [needle, resolver] of Object.entries(EMBED_RESOLVERS)) {
        if (host === needle || host.endsWith("." + needle)) return resolver;
    }
    return null;
}

function embedLabel(embedUrl) {
    const u = String(embedUrl || "").toLowerCase();
    if (u.includes("goodstream")) return "GoodStream";
    if (u.includes("hlswish") || u.includes("streamwish") || u.includes("vibuxer")) return "StreamWish";
    if (u.includes("voe")) return "VOE";
    if (u.includes("vimeos")) return "Vimeos";
    return "Online";
}

// The site exposes "https://hackstore.mx/wait/" ("Video en preparación") for
// posts that have no uploaded stream yet — never a media URL.
function isUsableEmbed(embedUrl) {
    if (!embedUrl || !/^https?:\/\//i.test(embedUrl)) return false;
    const lowered = embedUrl.toLowerCase();
    if (/hackstore\.mx\/wait/.test(lowered)) return false;
    if (/\/wait\/?($|\?)/.test(lowered)) return false;
    return !!resolverFor(embedUrl);
}

async function resolveEmbed(embed, postTitle) {
    const resolver = resolverFor(embed.url);
    if (!resolver) return null;
    console.log(`[Hackstore] Resolviendo: ${embed.url}`);
    const resolved = await resolver(embed.url);
    if (!resolved || !resolved.url) return null;
    const quality = resolved.quality || "HD";
    const server = embedLabel(embed.url);
    const lang = String(embed.lang || "Latino").trim() || "Latino";
    return {
        name: "Hackstore",
        title: `${quality} · ${lang} · ${server}`,
        quality,
        url: resolved.url,
        headers: resolved.headers || { "User-Agent": USER_AGENT }
    };
}

// ---------------------------------------------------------------------------
// HackStore /wp-api/v1 catalog
// ---------------------------------------------------------------------------

async function apiGet(path, params) {
    const query = new URLSearchParams(params || {}).toString();
    const url = `${API}${path}${query ? "?" + query : ""}`;
    try {
        const res = await fetch(url, { headers: API_HEADERS, redirect: "follow" });
        if (!res || !res.ok) {
            console.log(`[Hackstore] HTTP ${res && res.status} for ${url}`);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.log(`[Hackstore] API error (${url}): ${e.message}`);
        return null;
    }
}

async function searchPosts(query) {
    const json = await apiGet("/search", { postType: "any", q: query, postsPerPage: "10" });
    if (!json) return [];
    if (json.error && json.message) {
        console.log(`[Hackstore] search "${query}": ${json.message}`);
        return [];
    }
    const posts = json.data && Array.isArray(json.data.posts) ? json.data.posts : [];
    return posts.filter(p => p && p._id !== undefined && p._id !== null);
}

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
    for (const lang of ["es-MX", "es-ES", "en-US"]) {
        try {
            const kind = type === "movie" ? "movie" : "tv";
            const url = `https://api.themoviedb.org/3/${kind}/${id}?api_key=439c478a771f35c05022f9feabcca01c&language=${lang}`;
            const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(r => r.json());
            if (!res || res.success === false) continue;
            const title = type === "movie" ? res.title : res.name;
            const original = type === "movie" ? res.original_title : res.original_name;
            if (title) titles.add(title);
            if (original) titles.add(original);
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        } catch (e) {
            console.log(`[Hackstore] TMDB error (${lang}): ${e.message}`);
        }
    }
    if (!titles.size) return null;
    const list = Array.from(titles);
    return {
        id: Number(id),
        titles: list,
        titlesNorm: list.map(normalizeTitle).filter(Boolean),
        year
    };
}

function postYear(post) {
    const fromDate = String(post.release_date || "").match(/(\d{4})/);
    if (fromDate) return parseInt(fromDate[1], 10);
    const fromTitle = String(post.title || "").match(/\((\d{4})\)/);
    return fromTitle ? parseInt(fromTitle[1], 10) : 0;
}

function scorePost(post, info, wantedType) {
    const postType = String(post.type || "");
    const isEpisode = postType === "episodes";
    if (!isEpisode && postType && postType !== wantedType) return -1;
    if (isEpisode && wantedType !== "tvshows") return -1;

    let score = 0;
    if (postType === wantedType) score += 60;

    const title = normalizeTitle(post.title);
    if (!title) return -1;
    const exact = info.titlesNorm.includes(title);
    const loose = info.titlesNorm.some(t => t.length >= 3 && (title.includes(t) || t.includes(title)));
    if (exact) score += 60;
    else if (loose) score += 20;
    else return -1;

    const year = postYear(post);
    const wantedYear = Number(info.year) || 0;
    if (year && wantedYear) {
        const delta = Math.abs(year - wantedYear);
        if (delta === 0) score += 30;
        else if (delta <= 1) score += 10;
        else if (delta > 2) score -= 25;
    }
    return score;
}

async function findPosts(info, wantedType) {
    const queries = [];
    for (const title of info.titles) {
        const full = String(title || "").trim();
        if (full.length >= 3) queries.push(full);
        const short = full.split(/\s+/).filter(w => w.length > 1).slice(0, 3).join(" ");
        if (short.length >= 3 && short !== full) queries.push(short);
    }
    const seen = new Set();
    const scored = [];
    for (const query of Array.from(new Set(queries)).slice(0, 5)) {
        const posts = await searchPosts(query);
        if (posts.length) console.log(`[Hackstore] search "${query}" -> ${posts.length} post(s)`);
        for (const post of posts) {
            const key = `${post.type}|${post._id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const score = scorePost(post, info, wantedType);
            if (score > 0) scored.push({ post, score });
        }
        if (scored.some(s => s.score >= 120)) break;
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.post);
}

async function getEpisodeList(seriesId, season) {
    const params = { _id: String(seriesId), page: "1", postsPerPage: "30" };
    if (season !== null && season !== undefined && season !== "") params.season = String(season);
    const json = await apiGet("/single/episodes/list", params);
    const data = (json && json.data) || {};
    return {
        posts: Array.isArray(data.posts) ? data.posts : [],
        seasons: Array.isArray(data.seasons) ? data.seasons : []
    };
}

async function findEpisodeId(seriesId, season, episode) {
    const wantedSeason = parseInt(season, 10);
    const wantedEpisode = parseInt(episode, 10);
    const matchEpisode = (post) =>
        parseInt(post.season_number, 10) === wantedSeason &&
        parseInt(post.episode_number, 10) === wantedEpisode;

    const primary = await getEpisodeList(seriesId, wantedSeason);
    let hit = primary.posts.find(matchEpisode);
    if (hit) return hit._id;

    // Season numbering may differ — walk the seasons the API reports.
    const seasonNumbers = new Set(primary.seasons.map(v => parseInt(v, 10)).filter(n => !isNaN(n) && n !== wantedSeason));
    for (const seasonNo of seasonNumbers) {
        const list = await getEpisodeList(seriesId, seasonNo);
        hit = list.posts.find(matchEpisode);
        if (hit) {
            console.log(`[Hackstore] Episode found under season ${seasonNo} instead of ${wantedSeason}`);
            return hit._id;
        }
    }
    // Last resort: unpaginated series-wide episode list.
    const all = await getEpisodeList(seriesId);
    hit = all.posts.find(matchEpisode);
    return hit ? hit._id : null;
}

async function playerEmbeds(postId) {
    const json = await apiGet("/player", { postId: String(postId), demo: "0" });
    if (!json) return [];
    const data = json.data || {};
    if (data.error) {
        console.log(`[Hackstore] player: ${data.message || "error"}`);
        return [];
    }
    return Array.isArray(data.embeds) ? data.embeds : [];
}

// ---------------------------------------------------------------------------
// getStreams — public entrypoint
// ---------------------------------------------------------------------------

async function getStreams(id, type, season, episode) {
    const started = Date.now();
    console.log(`[Hackstore] Buscando TMDB ${id} (${type})` + (type === "tv" ? ` S${season}E${episode}` : ""));

    const info = await getTMDBInfo(id, type);
    if (!info) {
        console.log("[Hackstore] No TMDB info.");
        return [];
    }

    const wantedType = type === "tv" ? "tvshows" : "movies";
    const posts = await findPosts(info, wantedType);
    if (!posts.length) {
        console.log("[Hackstore] No catalog match on hackstore.mx.");
        return [];
    }
    console.log(`[Hackstore] ${posts.length} candidate(s); best: "${posts[0].title}" (${posts[0].type}/${posts[0]._id})`);

    const streams = [];
    for (const post of posts.slice(0, 3)) {
        console.log(`[Hackstore] Trying "${post.title}" (${post.type}/${post._id})`);

        let targetId = post._id;
        if (wantedType === "tvshows") {
            targetId = await findEpisodeId(post._id, season, episode);
            if (!targetId) {
                console.log(`[Hackstore] S${season}E${episode} not found for "${post.title}"`);
                continue;
            }
            console.log(`[Hackstore] Episode post ID: ${targetId}`);
        }

        const embeds = await playerEmbeds(targetId);
        const usable = embeds
            .map(embed => Object.assign({}, embed, {
                url: typeof embed.url === "string" ? embed.url.replace(/\\\//g, "/") : embed.url
            }))
            .filter(embed => isUsableEmbed(embed.url));

        if (!usable.length) {
            console.log(`[Hackstore] No resolvable embeds (${embeds.length} raw)`);
            continue;
        }
        console.log(`[Hackstore] Embeds resolubles: ${usable.length}/${embeds.length}`);

        const settled = await Promise.allSettled(usable.map(embed => resolveEmbed(embed, post.title)));
        for (const result of settled) {
            if (result.status === "fulfilled" && result.value && result.value.url) {
                streams.push(result.value);
            }
        }
        if (streams.length) break;
    }

    const seconds = ((Date.now() - started) / 1000).toFixed(2);
    if (streams.length) console.log(`[Hackstore] ✓ ${streams.length} streams en ${seconds}s`);
    else console.log(`[Hackstore] ✗ Sin streams (${seconds}s)`);
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
