const cheerio = require('cheerio');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";

// Helper functions for resolvers
function q(e, n, t) {
  let u = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", r = (l) => {
    let a = 0;
    for (let i = 0; i < l.length; i++) {
      let s = u.indexOf(l[i]);
      if (s === -1)
        return NaN;
      a = a * n + s;
    }
    return a;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (l) => {
    let a = r(l);
    return isNaN(a) || a >= t.length ? l : t[a] && t[a] !== "" ? t[a] : l;
  });
}

function X(e, n) {
  let t = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (t)
    try {
      let r = t[0].replace(/(\w+)\s*:/g, '"$1":'), l = JSON.parse(r), a = l.hls4 || l.hls3 || l.hls2;
      if (a)
        return a.startsWith("/") ? n + a : a;
    } catch (r) {
      let l = t[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (l) {
        let a = l[1];
        return a.startsWith("/") ? n + a : a;
      }
    }
  let u = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (u) {
    let r = u[1];
    return r.startsWith("/") ? n + r : r;
  }
  return null;
}

function L(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (n) {
    return null;
  }
}

function B(e, n) {
  try {
    let u = n.replace(/^\[|\]$/g, "").split("','").map((o) => o.replace(/^'+|'+$/g, "")).map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), r = "";
    for (let o of e) {
      let c = o.charCodeAt(0);
      c > 64 && c < 91 ? c = (c - 52) % 26 + 65 : c > 96 && c < 123 && (c = (c - 84) % 26 + 97), r += String.fromCharCode(c);
    }
    for (let o of u)
      r = r.replace(new RegExp(o, "g"), "_");
    r = r.split("_").join("");
    let l = L(r);
    if (!l)
      return null;
    let a = "";
    for (let o = 0; o < l.length; o++)
      a += String.fromCharCode((l.charCodeAt(o) - 3 + 256) % 256);
    let i = a.split("").reverse().join(""), s = L(i);
    return s ? JSON.parse(s) : null;
  } catch (t) {
    return console.log("[VOE] voeDecode error:", t.message), null;
  }
}

function C(e) {
  try {
    let n = e.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
    if (!n)
      return null;
    let [, t, u, r, l] = n;
    u = parseInt(u), r = parseInt(r), l = l.split("|");
    let a = (i, s) => {
      let o = "0123456789abcdefghijklmnopqrstuvwxyz", c = "";
      for (; i > 0; )
        c = o[i % s] + c, i = Math.floor(i / s);
      return c || "0";
    };
    return t = t.replace(/\b\w+\b/g, (i) => {
      let s = parseInt(i, 36);
      return s < l.length && l[s] ? l[s] : a(s, u);
    }), t;
  } catch (n) {
    return null;
  }
}

// Resolvers
async function resolveStreamwish(embedUrl) {
    try {
        let u = embedUrl.match(/^(https?:\/\/[^/]+)/)[1];
        console.log(`[StreamWish] Resolviendo: ${embedUrl}`);
        let r = await fetch(embedUrl, { headers: { "User-Agent": UA, "Referer": "https://cinemitas.org/" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        let l = await r.text();
        
        // Skip Vite SPA embeds - these require browser JS execution to load sources
        if (l.includes('id="root"') && l.includes('__vite_is_modern_browser')) {
            console.log(`[StreamWish] Skipping SPA embed (requires browser): ${embedUrl}`);
            return null;
        }
        
        let a = l.match(/file\s*:\s*["']([^"']+)["']/i);
        if (a) {
            let o = a[1];
            if (o.startsWith("/")) o = u + o;
            return { url: o, server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: u + "/" } };
        }
        let i = l.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
        if (i) {
            let o = q(i[1], parseInt(i[2]), i[4].split("|"));
            let c = X(o, u);
            if (c) return { url: c, server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: u + "/" } };
            // Also try direct m3u8 from unpacked code
            let m3 = o.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
            if (m3) return { url: m3[0], server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: u + "/" } };
        }
        let s = l.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (s) {
            return { url: s[0], server: "StreamWish", quality: "1080p", headers: { "User-Agent": UA, Referer: u + "/" } };
        }
    } catch (t) {
        console.log(`[StreamWish] Error: ${t.message}`);
    }
    return null;
}

async function resolveVoe(embedUrl) {
    try {
        console.log(`[VOE] Resolviendo: ${embedUrl}`);
        let n = await fetch(embedUrl, { headers: { "User-Agent": UA, Referer: embedUrl } });
        if (!n.ok) throw new Error(`HTTP ${n.status}`);
        let t = await n.text();
        if (/permanentToken/i.test(t)) {
            let s = t.match(/window\.location\.href\s*=\s*'([^']+)'/i);
            if (s) {
                let o = await fetch(s[1], { headers: { "User-Agent": UA, Referer: embedUrl } });
                if (o.ok) t = await o.text();
            }
        }
        let u = t.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
        if (u) {
            let s = u[1], o = u[2].startsWith("http") ? u[2] : new URL(u[2], embedUrl).href;
            let c = await fetch(o, { headers: { "User-Agent": UA, Referer: embedUrl } });
            let p = c.ok ? await c.text() : "";
            let d = p.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || p.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
            if (d) {
                let h = B(s, d[1]);
                if (h && (h.source || h.direct_access_url)) {
                    let g = h.source || h.direct_access_url;
                    return { url: g, server: "VOE", quality: "1080p", headers: { Referer: embedUrl } };
                }
            }
        }
        let r = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, l = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, a = [], i;
        while ((i = r.exec(t)) !== null) a.push(i);
        while ((i = l.exec(t)) !== null) a.push(i);
        for (let s of a) {
            let o = s[1];
            if (!o) continue;
            let c = o;
            if (c.startsWith("aHR0")) {
                try { c = L(c); } catch (p) {}
            }
            return { url: c, server: "VOE", quality: "720p", headers: { Referer: embedUrl } };
        }
    } catch (n) {
        console.log(`[VOE] Error: ${n.message}`);
    }
    return null;
}

async function resolveVidhide(embedUrl) {
    try {
        console.log(`[VidHide] Resolviendo: ${embedUrl}`);
        let t = await fetch(embedUrl, { method: "GET", headers: { "User-Agent": UA, Referer: "https://cinemitas.org/" } });
        if (!t.ok) throw new Error(`HTTP ${t.status}`);
        let text = await t.text();
        let r = text.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (!r) {
            let m3 = text.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
            if (m3) return { url: m3[0], server: "VidHide", quality: "720p", headers: { Referer: embedUrl } };
            return null;
        }
        let l = C(r[0]);
        if (!l) return null;
        let a = l.match(/"hls4"\s*:\s*"([^"]+)"/), i = l.match(/"hls2"\s*:\s*"([^"]+)"/), s = a || i;
        if (!s) return null;
        let o = s[1];
        if (!o.startsWith("http")) {
            o = `${new URL(embedUrl).origin}${o}`;
        }
        let c = new URL(embedUrl).origin;
        return { url: o, server: "VidHide", quality: "1080p", headers: { "User-Agent": UA, Referer: `${c}/`, Origin: c } };
    } catch (t) {
        console.log(`[VidHide] Error: ${t.message}`);
    }
    return null;
}

async function resolveFilemoon(embedUrl) {
    try {
        console.log(`[FileMoon] Resolviendo: ${embedUrl}`);
        let res = await fetch(embedUrl, { headers: { "User-Agent": UA, Referer: "https://cinemitas.org/" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let text = await res.text();
        let evalMatch = text.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
        if (evalMatch) {
            let unpacked = C(evalMatch[0]);
            if (unpacked) {
                let m3 = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m3) return { url: m3[0], server: "FileMoon", quality: "1080p", headers: { "User-Agent": UA, Referer: embedUrl } };
            }
        }
        let m3 = text.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3) {
            return { url: m3[0], server: "FileMoon", quality: "720p", headers: { "User-Agent": UA, Referer: embedUrl } };
        }
    } catch (err) {
        console.log(`[FileMoon] Error: ${err.message}`);
    }
    return null;
}

async function resolveCvid(embedUrl) {
    try {
        // Convert /f/ wrapper URL to /e/ actual player URL
        const playerUrl = embedUrl.replace(/\/f\//, '/e/');
        console.log(`[Cvid] Resolviendo: ${playerUrl}`);
        const r = await fetch(playerUrl, {
            headers: { "User-Agent": UA, "Referer": "https://cinemitas.org/" }
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        const m3u8 = text.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3u8) {
            return { url: m3u8[0], server: "Cvid", quality: "1080p", headers: { "User-Agent": UA, Referer: "https://cvid.lat/" } };
        }
        const mp4 = text.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/i);
        if (mp4) {
            return { url: mp4[0], server: "Cvid", quality: "1080p", headers: { "User-Agent": UA, Referer: "https://cvid.lat/" } };
        }
    } catch (t) {
        console.log(`[Cvid] Error: ${t.message}`);
    }
    return null;
}

async function resolveEmbed(embedUrl) {
    const u = embedUrl.toLowerCase();
    
    if (u.includes("voe.sx") || u.includes("/voe/")) {
        return resolveVoe(embedUrl);
    }
    if (u.includes("wish") || u.includes("bysezoxexe") || u.includes("vibuxer") || u.includes("hglink") || u.includes("hanerix")) {
        return resolveStreamwish(embedUrl);
    }
    if (u.includes("vidhide") || u.includes("ds2play") || u.includes("do7go") || u.includes("dintezuvio")) {
        return resolveVidhide(embedUrl);
    }
    if (u.includes("filemoon") || u.includes("fmoon")) {
        return resolveFilemoon(embedUrl);
    }
    if (u.includes("cvid.lat")) {
        return resolveCvid(embedUrl);
    }
    
    console.log(`[Cinemitas] No resolver found for embed: ${embedUrl}`);
    return null;
}

function slugify(title) {
    return title.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, "y")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

async function getTmdbTitles(tmdbId, type) {
    let titleEs = null;
    let titleOriginal = null;
    let titleEn = null;
    let year = null;
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-ES`).then(r => r.json());
        titleEs = type === "movie" ? res.title : res.name;
        titleOriginal = type === "movie" ? res.original_title : res.original_name;
        const dateStr = type === "movie" ? res.release_date : res.first_air_date;
        if (dateStr) {
            year = dateStr.split("-")[0];
        }
    } catch (e) {
        console.error("[Cinemitas] TMDB es-ES error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=es-MX`).then(r => r.json());
        const t = type === "movie" ? res.title : res.name;
        if (t && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(t)) {
            titleEs = titleEs || t;
        }
    } catch (e) {
        console.error("[Cinemitas] TMDB es-MX error:", e.message);
    }
    
    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`).then(r => r.json());
        titleEn = type === "movie" ? res.title : res.name;
    } catch (e) {
        console.error("[Cinemitas] TMDB en-US error:", e.message);
    }
    
    return { titleEs, titleOriginal, titleEn, year };
}

async function getStreams(tmdbId, mediaType, season, episode, title) {
    if (!tmdbId || !mediaType) {
        console.error("[Cinemitas] Missing tmdbId or mediaType");
        return [];
    }
    
    console.log(`[Cinemitas] Resolving: TMDB ${tmdbId} (${mediaType})${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`);
    const timeStart = Date.now();
    
    try {
        // Step 1: Query TMDB for titles and year
        const info = await getTmdbTitles(tmdbId, mediaType);
        if (!info.titleEs && !info.titleOriginal && !info.titleEn) {
            console.log("[Cinemitas] Failed to fetch titles from TMDB.");
            return [];
        }
        
        // Generate slug candidates
        const candidates = [];
        if (info.titleEs) {
            candidates.push(slugify(info.titleEs));
            if (info.year) candidates.push(`${slugify(info.titleEs)}-${info.year}`);
        }
        if (info.titleOriginal) {
            candidates.push(slugify(info.titleOriginal));
            if (info.year) candidates.push(`${slugify(info.titleOriginal)}-${info.year}`);
        }
        if (info.titleEn) {
            candidates.push(slugify(info.titleEn));
            if (info.year) candidates.push(`${slugify(info.titleEn)}-${info.year}`);
        }
        
        // De-duplicate candidates
        const uniqueCandidates = [...new Set(candidates)];
        
        let pageUrl = "";
        let pageHtml = "";
        
        // Probe slugs to find the correct details page URL
        for (let candidate of uniqueCandidates) {
            let testUrl = mediaType === "movie" 
                ? `https://cinemitas.org/movies/${candidate}/`
                : `https://cinemitas.org/tvshows/${candidate}/`;
                
            console.log(`[Cinemitas] Probing candidate page: ${testUrl}`);
            try {
                const res = await fetch(testUrl, { headers: { "User-Agent": UA } });
                if (res.status === 200) {
                    pageHtml = await res.text();
                    pageUrl = testUrl;
                    break;
                }
            } catch (err) {
                console.log(`[Cinemitas] Probe failed for ${testUrl}: ${err.message}`);
            }
        }
        
        if (!pageUrl) {
            console.log("[Cinemitas] No valid main page resolved via slug candidates.");
            return [];
        }
        console.log(`[Cinemitas] Resolved main page URL: ${pageUrl}`);
        
        // Step 2: For TV shows, resolve the episode page URL
        if (mediaType === "tv") {
            const slugMatch = pageUrl.match(/\/tvshows\/([^/]+)\/?/);
            const seriesSlug = slugMatch ? slugMatch[1] : null;
            
            if (!seriesSlug) {
                console.log("[Cinemitas] Could not extract series slug from page URL.");
                return [];
            }
            
            let epUrl = `https://cinemitas.org/episodes/${seriesSlug}-${season}x${episode}/`;
            console.log(`[Cinemitas] Probing predicted episode page: ${epUrl}`);
            
            try {
                let epRes = await fetch(epUrl, { headers: { "User-Agent": UA } });
                if (epRes.status === 200) {
                    pageUrl = epUrl;
                    pageHtml = await epRes.text();
                } else {
                    // Fallback: parse series page for links
                    console.log(`[Cinemitas] Predicted episode page failed. Parsing series page...`);
                    const $ = cheerio.load(pageHtml);
                    let foundUrl = null;
                    $('a[href*="/episodes/"]').each((i, el) => {
                        const href = $(el).attr('href');
                        const match = href.match(/-(\d+)x(\d+)\/?$/);
                        if (match && parseInt(match[1]) === season && parseInt(match[2]) === episode) {
                            foundUrl = href;
                            return false;
                        }
                    });
                    if (foundUrl) {
                        pageUrl = foundUrl;
                        console.log(`[Cinemitas] Found episode page via series parsing: ${pageUrl}`);
                        pageHtml = await fetch(pageUrl, { headers: { "User-Agent": UA } }).then(r => r.text());
                    } else {
                        console.log(`[Cinemitas] Episode S${season}E${episode} not found on series page.`);
                        return [];
                    }
                }
            } catch (err) {
                console.log(`[Cinemitas] TV resolution error: ${err.message}`);
                return [];
            }
        }
        
        // Step 3: Extract player options from page HTML
        const $ = cheerio.load(pageHtml);
        const options = [];
        $('.dooplay_player_option').each((i, el) => {
            const dataPost = $(el).attr('data-post');
            const dataNume = $(el).attr('data-nume');
            const dataType = $(el).attr('data-type');
            const lang = $(el).text().trim() || "Latino";
            if (dataPost && dataNume && dataType) {
                options.push({ dataPost, dataNume, dataType, lang });
            }
        });
        
        console.log(`[Cinemitas] Found ${options.length} player options`);
        const ajaxUrl = "https://cinemitas.org/wp-admin/admin-ajax.php";
        const streams = [];
        
        // Step 4: Fetch embed URLs and resolve them
        for (let opt of options) {
            try {
                console.log(`[Cinemitas] Resolving option ${opt.dataNume} (${opt.lang})...`);
                const payload = new URLSearchParams({
                    action: "doo_player_ajax",
                    post: opt.dataPost,
                    nume: opt.dataNume,
                    type: opt.dataType
                }).toString();
                
                const res = await fetch(ajaxUrl, {
                    method: "POST",
                    headers: {
                        "User-Agent": UA,
                        "Referer": pageUrl,
                        "X-Requested-With": "XMLHttpRequest",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: payload
                });
                
                if (!res.ok) continue;
                const data = await res.json();
                if (data && data.embed_url) {
                    let embedUrl = data.embed_url;
                    
                    // Some AJAX responses return a full <iframe> HTML tag — extract the src attribute
                    if (embedUrl.trim().startsWith('<')) {
                        const srcMatch = embedUrl.match(/src=["']([^"']+)["']/);
                        if (srcMatch) {
                            embedUrl = srcMatch[1];
                            console.log(`[Cinemitas] Extracted src from iframe HTML: ${embedUrl}`);
                        } else {
                            console.log(`[Cinemitas] Could not extract src from iframe response, skipping`);
                            continue;
                        }
                    }
                    
                    console.log(`[Cinemitas] Got embed URL: ${embedUrl}`);
                    const resolved = await resolveEmbed(embedUrl);
                    if (resolved && resolved.url) {
                        streams.push({
                            name: "Cinemitas",
                            title: `${resolved.quality || "1080p"} \xB7 ${opt.lang} \xB7 ${resolved.server}`,
                            url: resolved.url,
                            quality: resolved.quality || "1080p",
                            headers: resolved.headers || {}
                        });
                    }
                }
            } catch (err) {
                console.log(`[Cinemitas] Error resolving option ${opt.dataNume}: ${err.message}`);
            }
        }
        
        const timeElapsed = ((Date.now() - timeStart) / 1000).toFixed(2);
        console.log(`[Cinemitas] Resolved ${streams.length} stream(s) in ${timeElapsed}s`);
        return streams;
        
    } catch (e) {
        console.error("[Cinemitas] Error in getStreams:", e.message);
        return [];
    }
}

module.exports = { getStreams };
