const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://www3.seriesmetro.net";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9",
    "Connection": "keep-alive"
};

function cleanTitle(title) {
    if (!title) return "";
    return title
        .toLowerCase()
        .replace(/ver pelicula/g, "")
        .replace(/online/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/:\s*.*?$/g, "")
        .replace(/[-_]/g, " ")
        .replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function getTMDBInfo(id, type) {
    const titles = new Set();
    let year = "";
    const languages = ["es-MX", "es-ES", "en-US"];
    for (const lang of languages) {
        try {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`;
            const res = await fetch(url).then(r => r.json());
            const title = type === "movie" ? res.title : res.name;
            const original = type === "movie" ? res.original_title : res.original_name;
            if (title) titles.add(title);
            if (original) titles.add(original);
            if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
        } catch (e) { }
    }
    return titles.size > 0 ? { titles: Array.from(titles), year } : null;
}

async function search(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query).replace(/%20/g, "+")}`;
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const matches = [];
        
        const articleRe = /<article[\s\S]*?<\/article>/gi;
        let match;
        while ((match = articleRe.exec(html)) !== null) {
            const article = match[0];
            const linkMatch = /href="([^"]+)"\s*class="lnk-blk"/i.exec(article);
            const titleMatch = /<h2\s*class="entry-title">([\s\S]*?)<\/h2>/i.exec(article);
            
            if (linkMatch && titleMatch) {
                matches.push({
                    url: linkMatch[1],
                    title: titleMatch[1].replace(/<[^>]+>/g, '').trim()
                });
            }
        }
        return matches;
    } catch (e) {
        console.log(`[SeriesMetro] Search Error: ${e.message}`);
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

function evalUnpack(script) {
    try {
        const m = script.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
        if (!m) return null;
        return unpackEval(m[1], parseInt(m[2]), m[4].split("|"));
    } catch { return null; }
}

async function resolveFastream(url) {
    try {
        const html = await fetch(url, { headers: { ...HEADERS, "Referer": BASE_URL } }).then(r => r.text());
        const scriptMatch = html.match(/eval\(function[\s\S]+?split\('\|'\).*?\)/);
        if (scriptMatch) {
            const unpacked = evalUnpack(scriptMatch[0]);
            if (unpacked) {
                const m3u8Match = unpacked.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
                if (m3u8Match) return m3u8Match[0];
            }
        }
    } catch (e) {}
    return null;
}

function extractDirectUrl(text) {
    let m = text.match(/(?:sources|file)\s*:\s*\[?"?(https?:\/\/[^\s"'<>\[\]]+\.m3u8[^\s"'<>\[\]]*)/i);
    if (m) return m[1];
    m = text.match(/https?:\/\/[^\s"'<>\[\]]+\.m3u8[^\s"'<>\[\]]*/i);
    if (m) return m[0];
    m = text.match(/https?:\/\/[^\s"'<>\[\]]+\.mp4[^\s"'<>\[\]]*/i);
    if (m) return m[0];
    return null;
}

async function resolveUnpackEval(url, referer) {
    try {
        const html = await fetch(url, { headers: { ...HEADERS, "Referer": referer || url } }).then(r => r.text());
        const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
        if (evalMatch) {
            const unpacked = evalUnpack(evalMatch[0]);
            if (unpacked) {
                const direct = extractDirectUrl(unpacked);
                if (direct) return direct;
            }
        }
        const direct = extractDirectUrl(html);
        if (direct) return direct;
    } catch (e) {}
    return null;
}

async function resolveStreamWish(url, referer) {
    try {
        const html = await fetch(url, { headers: { ...HEADERS, "Referer": referer || url } }).then(r => r.text());
        let m = html.match(/sources\s*:\s*\[([^\]]+)\]/);
        if (m) {
            const direct = extractDirectUrl(m[1]);
            if (direct) return direct;
        }
        return await resolveUnpackEval(url, referer);
    } catch (e) {}
    return null;
}

async function resolveVOE(url, referer) {
    try {
        const html = await fetch(url, { headers: { ...HEADERS, "Referer": referer || url } }).then(r => r.text());
        let m = html.match(/['"]hls['"]:\s*['"](https?:[^'"]+)['"]/);
        if (m) return m[1].replace(/\\\//g, '/');
        m = html.match(/(?:file|src)\s*:\s*['"](https?:[^'"]+\.m3u8[^'"]*)['"]/);
        if (m) return m[1].replace(/\\\//g, '/');
        return await resolveUnpackEval(url, referer);
    } catch (e) {}
    return null;
}

function isMirror(url, domains) {
    const u = (url || "").toLowerCase();
    return domains.some(d => u.includes(d));
}

async function resolveEmbed(url, referer) {
    const u = url.toLowerCase();
    if (isMirror(u, ["streamwish", "vidhide", "awish", "hlswish", "hglink", "minochinos",
        "vadisov", "vaiditv", "amusemre", "callistanise", "vhaudm", "mdfury",
        "dintezuvio", "acek-cdn", "vedonm", "vidhidepro", "vidhidevip", "masukestin"])) {
        return await resolveStreamWish(url, referer);
    }
    if (/voe\.(sx|to|tv|me|cc)|voex\./i.test(u)) return await resolveVOE(url, referer);
    if (isMirror(u, ["filemoon", "moonalu", "moonembed", "bysedikamoum", "r66nv9ed", "bysejikuar", "fmoon"])) {
        return await resolveUnpackEval(url, referer);
    }
    if (isMirror(u, ["wolfstream", "waaw", "streamtape"])) return await resolveUnpackEval(url, referer);
    return await resolveUnpackEval(url, referer);
}

async function extractStreams(pageUrl) {
    try {
        const html = await fetch(pageUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];
        
        const tabsRe = /<a[^>]*href="#(options-[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const tabs = [];
        let tMatch;
        while ((tMatch = tabsRe.exec(html)) !== null) {
            const id = tMatch[1];
            const labelHtml = tMatch[2];
            const label = labelHtml.replace(/<[^>]+>/g, '').trim();
            tabs.push({ id, label });
        }
        
        for (const tab of tabs) {
            const blockRe = new RegExp(`<div id="${tab.id}"[\\s\\S]*?<iframe[^>]+(?:data-src|src)="([^"]+)"`, 'i');
            const bMatch = blockRe.exec(html);
            if (bMatch) {
                const proxyUrl = bMatch[1].replace(/&#038;/g, '&');
                let lang = 'Lat';
                let serverName = 'Fastream';
                
                const parts = tab.label.split('-');
                if (parts.length > 1) {
                    serverName = parts[0].trim() || 'Fastream';
                    lang = parts[1].trim();
                } else {
                    serverName = tab.label;
                }
                
                if (lang === 'Latino' || lang === 'Español Latino') lang = 'Lat';
                if (lang === 'Castellano' || lang === 'Español') lang = 'Esp';
                if (lang === 'VOSE' || lang === 'Sub') lang = 'Vose';
                
                // Fetch proxy URL to get real embed
                try {
                    const pRes = await fetch(proxyUrl, { headers: { ...HEADERS, 'Referer': pageUrl } });
                    const pHtml = await pRes.text();
                    const realMatch = /<iframe[^>]+src="([^"]+)"/i.exec(pHtml);
                    if (realMatch) {
                        let realUrl = realMatch[1];
                        if (realUrl.includes('cinemaupload.com')) {
                            realUrl = realUrl.replace('/cinemaupload.com/', '/embed.cload.video/');
                        }
                        
                        if (realUrl.includes('fastream.to')) {
                            const direct = await resolveFastream(realUrl);
                            if (direct) {
                                streams.push({
                                    name: "SeriesMetro",
                                    title: `${serverName} (${lang})`,
                                    url: direct,
                                    quality: 'HD',
                                    headers: { "Referer": "https://fastream.to/" }
                                });
                                continue;
                            }
                        }

                        // Try direct embed resolution before delegating
                        const resolved = await resolveEmbed(realUrl, pageUrl);
                        if (resolved) {
                            console.log(`[SeriesMetro] Resolved ${serverName} → ${resolved.substring(0, 60)}...`);
                            streams.push({
                                name: "SeriesMetro",
                                title: `${serverName} (${lang})`,
                                url: resolved,
                                quality: 'HD',
                                headers: { "Referer": realUrl }
                            });
                            continue;
                        }
                        
                        streams.push({
                            name: "SeriesMetro",
                            title: `${serverName} (${lang})`,
                            url: realUrl,
                            isEmbed: true
                        });
                    }
                } catch(e) {
                    console.log(`[SeriesMetro] Proxy fetch error: ${e.message}`);
                }
            }
        }
        
        return streams;
    } catch (e) {
        console.log(`[SeriesMetro] Extract Error: ${e.message}`);
        return [];
    }
}

async function getStreams(id, type, season, episode) {
    console.log(`[SeriesMetro] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    let matchedPost = null;
    for (const title of info.titles) {
        const results = await search(title);
        if (results && results.length > 0) {
            matchedPost = results.find(r => {
                const isTv = r.url.includes('/serie/');
                const isMovie = r.url.includes('/pelicula/');
                if (type === 'tv' && !isTv) return false;
                if (type === 'movie' && !isMovie) return false;
                
                const rt = cleanTitle(r.title);
                return info.titles.some(t => {
                    const ct = cleanTitle(t);
                    return rt === ct || rt.includes(ct) || ct.includes(rt);
                });
            });
            if (matchedPost) break;
        }
    }

    if (!matchedPost) {
        console.log("[SeriesMetro] No matching post found.");
        return [];
    }

    let url = matchedPost.url;
    console.log(`[SeriesMetro] Matched: "${matchedPost.title}" -> ${url}`);

    if (type === 'tv') {
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        const epRegex = new RegExp(`href="([^"]+-\\d+x\\d+\\/)?"[^>]*>[^<]*${season}x${episode}`, 'i');
        const epMatch = epRegex.exec(html) || new RegExp(`href="([^"]+episodio[^"]+${season}x${episode}[^"]*)"`, 'i').exec(html);
        
        if (epMatch) {
            url = epMatch[1];
            console.log(`[SeriesMetro] Found episode: ${url}`);
        } else {
            const slug = url.split('/').filter(Boolean).pop();
            const guessUrls = [
                `${BASE_URL}/capitulo/${slug}-temporada-${season}-capitulo-${episode}/`,
                `${BASE_URL}/episodio/${slug}-${season}x${episode}/`
            ];
            let foundUrl = null;
            for (const gUrl of guessUrls) {
                try {
                    const r = await fetch(gUrl, { method: 'HEAD', headers: HEADERS });
                    if (r.ok) {
                        foundUrl = gUrl;
                        break;
                    }
                } catch(e) {}
            }
            url = foundUrl || guessUrls[0];
            console.log(`[SeriesMetro] Guessed episode url: ${url}`);
        }
    }

    return await extractStreams(url);
}

module.exports = { getStreams };
