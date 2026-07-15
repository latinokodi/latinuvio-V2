const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const API_URL = "https://fluxcedene.net/api/gql";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://peliculasflix.co/",
    "Content-Type": "application/json",
    "x-access-platform": "lDakkGUZx7_nX25Nv1CJVbz_ZAjMKMTcwNTQyMzU4Nw=="
};

async function getTMDBInfo(id, type) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-MX`;
        const res = await fetch(url).then(r => r.json());
        return {
            title: type === "movie" ? res.title : res.name,
            original_title: type === "movie" ? res.original_title : res.original_name,
            year: (res.release_date || res.first_air_date || "").substring(0, 4)
        };
    } catch (e) {
        console.warn(`[PeliculasFlix] TMDB Error: ${e.message}`);
        return null;
    }
}

async function getStreams(id, type, season, episode, title) {
    if (type !== "movie") return []; // PeliculasFlix is movie only

    console.warn(`[PeliculasFlix] Resolving movie: ${id} (${title})`);
    
    let movieTitle = title;
    let movieYear = "";

    const tmdbInfo = await getTMDBInfo(id, type);
    if (tmdbInfo) {
        movieTitle = tmdbInfo.title || tmdbInfo.original_title || title;
        movieYear = tmdbInfo.year;
    }

    if (!movieTitle) return [];

    try {
        // Step 1: Search movie via GraphQL
        const searchBody = {
            operationName: "searchAll",
            variables: { input: movieTitle },
            query: "query searchAll($input: String!) {\n  searchFilm(input: $input, limit: 10) {\n    _id\n    slug\n    title\n    name\n  }\n}\n"
        };

        const searchRes = await fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(searchBody)
        }).then(r => r.json());

        const items = searchRes.data?.searchFilm || [];
        if (!items.length) {
            console.warn(`[PeliculasFlix] No search results for: ${movieTitle}`);
            return [];
        }

        // Find best slug match (case insensitive match on title or name)
        let bestItem = items[0];
        const cleanTitle = movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const item of items) {
            const itemTitle = (item.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const itemName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            if (itemTitle === cleanTitle || itemName === cleanTitle) {
                bestItem = item;
                break;
            }
        }

        console.warn(`[PeliculasFlix] Found matching slug: ${bestItem.slug}`);

        // Step 2: Fetch details & streams via GraphQL
        const detailBody = {
            operationName: "detailFilm",
            variables: { slug: bestItem.slug },
            query: "query detailFilm($slug: String!) {\n  detailFilm(filter: {slug: $slug}) {\n    name\n    title\n    links_online {\n      _id\n      server\n      lang\n      link\n      page\n    }\n  }\n}\n"
        };

        const detailRes = await fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(detailBody)
        }).then(r => r.json());

        const links = detailRes.data?.detailFilm?.links_online || [];
        const streams = [];

        const LANG_MAP = {
            "38": "Latino",
            "37": "Castellano",
            "192": "VOSE"
        };

        for (const linkObj of links) {
            let link = linkObj.link;
            if (!link || typeof link !== "string") continue;

            // Some links are raw iframe HTML: <IFRAME SRC="https://..." ...>
            if (link.trim().startsWith('<') || link.includes('SRC=') || link.includes('src=')) {
                const srcMatch = link.match(/src=["']?([^"'\s>]+)["']?/i);
                if (srcMatch) link = srcMatch[1];
                else continue;
            }

            if (!link.startsWith('http')) continue;

            // Extract host name/server for nice titles
            let serverName = "Direct";
            if (link.includes("dood")) serverName = "DoodStream";
            else if (link.includes("streamtape")) serverName = "Streamtape";
            else if (link.includes("sbplay") || link.includes("sbembed") || link.includes("playersb")) serverName = "StreamPlay";
            else if (link.includes("pelisplus")) serverName = "PelisPlus";
            else if (link.includes("uqload")) serverName = "Uqload";
            else if (link.includes("fembed")) serverName = "Fembed";
            else if (link.includes("voe")) serverName = "VOE";
            else if (link.includes("filemoon")) serverName = "Filemoon";
            else if (link.includes("mixdrop")) serverName = "MixDrop";
            else {
                try {
                    const host = new URL(link).hostname.replace("www.", "");
                    serverName = host.split(".")[0];
                } catch(e) {}
            }

            const langCode = String(linkObj.lang);
            const lang = LANG_MAP[langCode] || "VOSE";

            streams.push({
                name: "PeliculasFlix",
                title: `${serverName.toUpperCase()} (${lang})`,
                url: link,
                quality: "HD",
                headers: { Referer: "https://peliculasflix.co/" }
            });
        }

        // Resolve all embeds in parallel with a per-embed timeout
        const EMBED_TIMEOUT = 15000;
        const resolveWithTimeout = async (s) => {
            try {
                const timeout = new Promise(r => setTimeout(() => r(null), EMBED_TIMEOUT));
                const directUrl = await Promise.race([resolveEmbed(s.url), timeout]);
                if (directUrl) {
                    return { name: "PeliculasFlix", title: s.title, url: directUrl, quality: s.quality, headers: { Referer: "https://peliculasflix.co/" } };
                }
            } catch(e) {}
            return null;
        };

        const results = await Promise.allSettled(streams.map(s => resolveWithTimeout(s)));
        const resolvedStreams = results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);

        console.log(`[PeliculasFlix] Resolved ${resolvedStreams.length}/${streams.length} streams`);
        return resolvedStreams;
    } catch (err) {
        console.warn(`[PeliculasFlix] Scraping Error: ${err.message}`);
        return [];
    }
}

async function resolveVoe(embedUrl) {
    try {
        let n = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, Referer: embedUrl } });
        if (!n.ok) return null;
        let t = await n.text();
        if (/permanentToken/i.test(t)) {
            let s = t.match(/window\.location\.href\s*=\s*'([^']+)'/i);
            if (s) {
                let o = await fetch(s[1], { headers: { "User-Agent": USER_AGENT, Referer: embedUrl } });
                if (o.ok) t = await o.text();
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
                try { c = Buffer.from(c, 'base64').toString('utf8'); } catch (p) {}
            }
            return c;
        }
    } catch (n) {}
    return null;
}

async function resolveUqload(embedUrl) {
    try {
        let res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, Referer: embedUrl } });
        if(!res.ok) return null;
        let t = await res.text();
        let m = t.match(/sources:\s*\[\s*['"]([^'"]+)['"]/i);
        if (m && m[1]) return m[1];
    } catch(e) {}
    return null;
}

function evalUnpack(script) {
    try {
        const m = script.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
        if (!m) return null;
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const unbase = (str) => {
            let result = 0;
            for (let i = 0; i < str.length; i++) {
                const pos = chars.indexOf(str[i]);
                if (pos === -1) return NaN;
                result = result * parseInt(m[2]) + pos;
            }
            return result;
        };
        const symtab = m[4].split("|");
        return m[1].replace(/\b([0-9a-zA-Z]+)\b/g, (match) => {
            const idx = unbase(match);
            if (isNaN(idx) || idx >= symtab.length) return match;
            return symtab[idx] && symtab[idx] !== "" ? symtab[idx] : match;
        });
    } catch { return null; }
}

async function resolveStreamwish(embedUrl) {
    try {
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" } });
        if (!res.ok) return null;
        const html = await res.text();
        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
        if (evalStr) {
            const unpacked = evalUnpack(evalStr[0]);
            if (unpacked) {
                const m = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m) return m[0];
            }
        }
        const m3 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3) return m3[0];
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (fileMatch) return fileMatch[1];
    } catch(e) {}
    return null;
}

async function resolveVidhide(embedUrl) {
    try {
        const origin = new URL(embedUrl).origin;
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" } });
        if (!res.ok) return null;
        const html = await res.text();
        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
        if (evalStr) {
            const unpacked = evalUnpack(evalStr[0]);
            if (unpacked) {
                const hlsMatch = unpacked.match(/"hls[24]"\s*:\s*"([^"]+)"/);
                if (hlsMatch) return hlsMatch[1].startsWith('http') ? hlsMatch[1] : origin + hlsMatch[1];
                const m = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m) return m[0];
            }
        }
        const m3 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3) return m3[0];
    } catch(e) {}
    return null;
}

async function resolveFilemoon(embedUrl) {
    try {
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Referer": "https://peliculasflix.co/" } });
        if (!res.ok) return null;
        const html = await res.text();
        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
        if (evalStr) {
            const unpacked = evalUnpack(evalStr[0]);
            if (unpacked) {
                const m = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m) return m[0];
            }
        }
        const m3 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
        if (m3) return m3[0];
    } catch(e) {}
    return null;
}

async function resolveDoodstream(embedUrl) {
    try {
        let url = embedUrl.replace(/\/(d|f)\//, "/e/");
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Referer": "https://peliculasflix.co/" } });
        if (!res.ok) return null;
        const html = await res.text();
        const match = html.match(/\$\.get\(['"]\/pass_md5\/([\w-]+)\/([\w-]+)['"]/i)
                   || html.match(/pass_md5\/([\w\/-]+)/i);
        if (!match) return null;
        const passPath = match[1];
        const token = match[2] || passPath.split("/").pop();
        const domain = new URL(url).origin;
        const passRes = await fetch(`${domain}${passPath}/${token}`, { headers: { "User-Agent": USER_AGENT, "Referer": url } });
        if (!passRes.ok) return null;
        const base = (await passRes.text()).trim();
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let rand = "";
        for (let i = 0; i < 10; i++) rand += chars[Math.floor(Math.random() * chars.length)];
        return `${base}${rand}?token=${token}&expiry=${Date.now()}`;
    } catch(e) {}
    return null;
}

async function resolveStreamtape(embedUrl) {
    try {
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Referer": "https://streamtape.com/" } });
        if (!res.ok) return null;
        const html = await res.text();
        const linkMatch = html.match(/innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*(?:["'][^"']*["']\s*\+\s*)?["']([^"']+)["']/i);
        if (linkMatch) return `https:${linkMatch[1]}${linkMatch[2]}`;
        const mp4 = html.match(/https?:\/\/(?:cdn|streamtape)\.streamtape\.com\/[^"'<\s]+\.mp4[^"'<\s]*/i);
        if (mp4) return mp4[0];
    } catch(e) {}
    return null;
}

async function resolveEsplayPlayer(embedUrl) {
    // pelisplus.esplay.io/player.html#HASH or /player.html?id=HASH
    try {
        const hash = embedUrl.split('#').pop().split('?').pop();

        // Approach 1: Try known esplay/pelisplus API endpoints with the hash
        const apiEndpoints = [
            `https://pelisplus.esplay.io/api/video/${hash}`,
            `https://pelisplus.esplay.io/video?hash=${hash}`,
            `https://pelisplus.esplay.io/api/stream/${hash}`,
        ];
        for (const apiUrl of apiEndpoints) {
            try {
                const apiRes = await fetch(apiUrl, {
                    headers: { "User-Agent": USER_AGENT, "Referer": embedUrl }
                });
                if (apiRes.ok) {
                    const text = await apiRes.text();
                    const data = JSON.parse(text);
                    const url = data?.url || data?.file || data?.hls || data?.source;
                    if (url && url.startsWith('http')) return url;
                }
            } catch(e) {}
        }

        // Approach 2: Fetch the player HTML and scan for m3u8/mp4
        const res = await fetch(embedUrl, {
            headers: { "User-Agent": USER_AGENT, "Referer": "https://peliculasflix.co/" }
        });
        if (res.ok) {
            const html = await res.text();
            const m3 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
            if (m3) return m3[0];
            const mp4 = html.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/i);
            if (mp4) return mp4[0];
        }
    } catch(e) {}
    return null;
}

async function resolveUqloadDirect(embedUrl) {
    // uqload exposes a /ajax endpoint for stream data
    try {
        const fileId = embedUrl.split('/').pop().replace(/\.html$/, '').replace(/^embed-/, '');
        const apiRes = await fetch(`https://uqload.com/api/video/${fileId}`, {
            headers: { "User-Agent": USER_AGENT, "Referer": embedUrl }
        });
        if (apiRes.ok) {
            const data = await apiRes.json().catch(() => null);
            if (data?.url) return data.url;
        }
        // Fallback: fetch the embed page and scan for sources
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Referer": "https://peliculasflix.co/" } });
        if (!res.ok) return null;
        const html = await res.text();
        const m = html.match(/sources:\s*\[\s*['"]([^'"]+)['"]/i)
              || html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (m && m[1]) return m[1];
    } catch(e) {}
    return null;
}

async function resolveOkru(embedUrl) {
    // Combined approach: gnula's flashvars pattern + src/resolvers/okru.js name/url pattern
    try {
        const res = await fetch(embedUrl, { headers: { "User-Agent": USER_AGENT, "Accept": "text/html", "Referer": "https://ok.ru/" } });
        const html = await res.text();

        // Check for restricted/deleted videos
        if (html.includes("copyrightsRestricted") || html.includes("COPYRIGHTS_RESTRICTED") ||
            html.includes("LIMITED_ACCESS") || html.includes("notFound") || html.includes("not found")) {
            return null;
        }

        // Approach 1: gnula.js style — data-options with flashvars.metadata (double JSON.parse)
        const dataMatch = html.match(/data-options="([^"]+)"/);
        if (dataMatch) {
            try {
                const dataStr = dataMatch[1].replace(/&quot;/g, '"');
                const data = JSON.parse(dataStr);
                if (data.flashvars?.metadata) {
                    const metadata = JSON.parse(data.flashvars.metadata);
                    if (metadata.hlsManifestUrl) return metadata.hlsManifestUrl;
                    if (metadata.videos?.length > 0) {
                        const video = metadata.videos.reduce((prev, cur) => (prev.size > cur.size) ? prev : cur);
                        return video.url;
                    }
                }
            } catch(e) {}
        }

        // Approach 2: src/resolvers/okru.js style — "name":"...","url":"..." in HTML
        const cleaned = html.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "");
        const matches = [...cleaned.matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)];
        if (matches.length > 0) {
            const QUALITY_ORDER = ["full", "hd", "sd", "low", "lowest"];
            const videos = matches.map(m => ({ type: m[1], url: m[2] }))
                .filter(v => !v.type.toLowerCase().includes("mobile") && v.url.startsWith("http"));
            if (videos.length > 0) {
                const sorted = videos.sort((a, b) => {
                    const ai = QUALITY_ORDER.findIndex(q => a.type.toLowerCase().includes(q));
                    const bi = QUALITY_ORDER.findIndex(q => b.type.toLowerCase().includes(q));
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                });
                return sorted[0].url;
            }
        }
    } catch(e) {}
    return null;
}

async function resolveVudeo(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://peliculasflix.co/' }
        });
        if (!res.ok) return null;
        const html = await res.text();
        // Vudeo often has packed JS with m3u8
        const evalStr = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('[\s\S]+?',\s*\d+,\s*\d+,\s*'[\s\S]+?'\.split\('\|'\)/);
        if (evalStr) {
            const unpacked = evalUnpack(evalStr[0]);
            if (unpacked) {
                const m = unpacked.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
                if (m) return m[0];
                const mp4 = unpacked.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/i);
                if (mp4) return mp4[0];
            }
        }
        const m3 = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3) return m3[0];
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (fileMatch) return fileMatch[1];
    } catch(e) {}
    return null;
}

async function resolveStreamSB(embedUrl) {
    // Handles watchsb.com, sbfast.live, sbchill.com, streamsb.com variants
    try {
        const origin = new URL(embedUrl).origin;
        const videoId = embedUrl.split('/e/').pop().split('/').shift();
        if (!videoId) return null;
        const apiRes = await fetch(`${origin}/api/source/${videoId}`, {
            method: 'POST',
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': origin + '/',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `r=&d=${new URL(origin).hostname}`
        });
        if (!apiRes.ok) return null;
        const data = await apiRes.json();
        if (data?.data?.[0]?.file) return data.data[0].file;
    } catch(e) {}
    return null;
}

async function resolveOkruLink(embedUrl) {
    // okru.link/v2/embed_vf.html?t=TOKEN wraps ok.ru content
    try {
        const res = await fetch(embedUrl, { headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://peliculasflix.co/' } });
        if (!res.ok) return null;
        const html = await res.text();
        // Look for embedded HLS manifest
        const m3 = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3) return m3[0];
        // Look for ok.ru source iframe
        const okruSrc = html.match(/src=["'](https?:\/\/ok\.ru[^"']+)["']/i);
        if (okruSrc) {
            const okRes = await fetch(okruSrc[1], { headers: { 'User-Agent': USER_AGENT, 'Referer': embedUrl } });
            if (okRes.ok) {
                const okHtml = await okRes.text();
                const dataOpts = okHtml.match(/data-options=["']({[^"']+})["']/i);
                if (dataOpts) {
                    const opts = JSON.parse(decodeURIComponent(dataOpts[1]));
                    const videos = opts?.flashvars?.metadata?.videos;
                    if (videos?.length) {
                        const hls = videos.find(v => v.name === 'hls');
                        if (hls?.url) return hls.url;
                        return videos[videos.length - 1].url;
                    }
                }
            }
        }
    } catch(e) {}
    return null;
}

async function resolveStreamlare(embedUrl) {
    try {
        // Extract video ID from embed URL
        const parts = embedUrl.split('/');
        const videoId = parts[parts.length - 1] || parts[parts.length - 2];
        if (!videoId) return null;
        const apiRes = await fetch(`https://streamlare.com/api/video/stream/get`, {
            method: 'POST',
            headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json', 'Referer': embedUrl },
            body: JSON.stringify({ id: videoId })
        });
        if (apiRes.ok) {
            const data = await apiRes.json();
            const streamUrl = data?.data?.['360p'] || data?.data?.['480p'] || data?.data?.['720p'];
            if (streamUrl) return streamUrl;
        }
    } catch(e) {}
    return null;
}

async function resolveEmbed(link) {
    const u = link.toLowerCase();
    let directUrl = null;
    try {
        if (u.includes('esplay.io')) directUrl = await resolveEsplayPlayer(link);
        else if (u.includes('uqload')) directUrl = await resolveUqloadDirect(link) || await resolveUqload(link);
        else if (u.includes('voe')) directUrl = await resolveVoe(link);
        else if (u.includes('filemoon') || u.includes('fmoon')) directUrl = await resolveFilemoon(link);
        else if (u.includes('wish') || u.includes('hglink') || u.includes('hlswish')) directUrl = await resolveStreamwish(link);
        else if (u.includes('vidhide') || u.includes('dintezuvio') || u.includes('do7go') || u.includes('ds2play')) directUrl = await resolveVidhide(link);
        else if (u.includes('dood') || u.includes('d000d') || u.includes('doodstream')) directUrl = await resolveDoodstream(link);
        else if (u.includes('streamtape')) directUrl = await resolveStreamtape(link);
        else if (u.includes('watchsb') || u.includes('sbfast') || u.includes('sbchill') || u.includes('streamsb')) directUrl = await resolveStreamSB(link);
        else if (u.includes('okru.link')) directUrl = await resolveOkruLink(link);
        else if (u.includes('ok.ru')) directUrl = await resolveOkru(link);
        else if (u.includes('streamlare')) directUrl = await resolveStreamlare(link);
        else if (u.includes('vudeo')) directUrl = await resolveVudeo(link);
        else if (u.includes('fembed')) {
            const apiRes = await fetch(link.replace('/v/', '/api/source/'), {
                method: 'POST', headers: { 'User-Agent': USER_AGENT, 'Referer': link }
            }).catch(() => null);
            if (apiRes?.ok) {
                const data = await apiRes.json().catch(() => null);
                directUrl = data?.data?.[0]?.file || null;
            }
        }
    } catch(e) {
        // silent fail per embed
    }
    return directUrl;
}

module.exports = { getStreams };
