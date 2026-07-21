const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://www3.homecine.to";

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
        
        const divRe = /<div data-movie-id="([\s\S]*?)<\/div><\/div>/gi;
        let match;
        while ((match = divRe.exec(html)) !== null) {
            const block = match[1];
            const linkMatch = /<a href="([^"]+)"/i.exec(block);
            const titleMatch = /alt="([^"]+)"/i.exec(block);
            
            if (linkMatch && titleMatch) {
                matches.push({
                    url: linkMatch[1],
                    title: titleMatch[1].replace(/&#8211;/g, '').replace(/&#8217;/g, "'").trim()
                });
            }
        }
        return matches;
    } catch (e) {
        console.log(`[HomeCine] Search Error: ${e.message}`);
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

async function extractStreams(pageUrl) {
    try {
        const html = await fetch(pageUrl, { headers: HEADERS }).then(r => r.text());
        const streams = [];
        
        // <a href="#tab1">HD - Latino</a>
        const tabsRe = /href="#tab([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const tabs = [];
        let tMatch;
        while ((tMatch = tabsRe.exec(html)) !== null) {
            const id = `tab${tMatch[1]}`;
            const labelHtml = tMatch[2];
            const label = labelHtml.replace(/<[^>]+>/g, '').trim();
            tabs.push({ id, label });
        }
        
        for (const tab of tabs) {
            // Because tabs and iframes might not be tightly coupled in the same div structure in homecine,
            // the python code actually loops tabs and then just loops ALL iframes in the page? No, it looks like it gets multiple matches.
            // Let's just extract all iframes. Actually, if homecine embeds fastream, let's just grab the iframes in the specific tab.
            const blockRe = new RegExp(`<div id="${tab.id}"[\\s\\S]*?<iframe[^>]+src="([^"]+)"`, 'i');
            const bMatch = blockRe.exec(html);
            if (bMatch) {
                const embedUrl = bMatch[1];
                let lang = 'Lat';
                
                const l = tab.label.toLowerCase();
                if (l.includes('latino')) lang = 'Lat';
                else if (l.includes('castellano') || l.includes('español')) lang = 'Esp';
                else if (l.includes('sub')) lang = 'Vose';
                
                if (embedUrl.includes('fastream.to')) {
                    const direct = await resolveFastream(embedUrl);
                    if (direct) {
                        streams.push({
                            name: "HomeCine",
                            title: `Fastream (${lang})`,
                            url: direct,
                            quality: 'HD'
                        });
                        continue;
                    }
                }
                
                streams.push({
                    name: "HomeCine",
                    title: `Fastream (${lang})`,
                    url: embedUrl,
                    isEmbed: true
                });
            }
        }
        
        // Fallback: if no tabs were parsed, just grab all iframes
        if (streams.length === 0) {
            const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            let iframeMatch;
            while ((iframeMatch = iframeRe.exec(html)) !== null) {
                const embedUrl = iframeMatch[1];
                if (embedUrl.includes('youtube')) continue;
                
                if (embedUrl.includes('fastream.to')) {
                    const direct = await resolveFastream(embedUrl);
                    if (direct) {
                        streams.push({
                            name: "HomeCine",
                            title: "Fastream (HD)",
                            url: direct,
                            quality: 'HD'
                        });
                        continue;
                    }
                }
                
                streams.push({
                    name: "HomeCine",
                    title: "Fastream (HD)",
                    url: embedUrl,
                    isEmbed: true
                });
            }
        }
        
        return streams;
    } catch (e) {
        console.log(`[HomeCine] Extract Error: ${e.message}`);
        return [];
    }
}

async function getStreams(id, type, season, episode) {
    console.log(`[HomeCine] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    let matchedPost = null;
    for (const title of info.titles) {
        const results = await search(title);
        if (results && results.length > 0) {
            matchedPost = results.find(r => {
                const isTv = r.url.includes('/series/');
                if (type === 'tv' && !isTv) return false;
                if (type === 'movie' && isTv) return false;

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
        console.log("[HomeCine] No matching post found.");
        return [];
    }

    let url = matchedPost.url;
    console.log(`[HomeCine] Matched: "${matchedPost.title}" -> ${url}`);

    if (type === 'tv') {
        const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
        // homecine episode URLs look like: ...-temporada-1-capitulo-1...
        // Format: <a href=".../episodios/NAME-1x1/"
        // Balandro: if '-capitulo-' in url
        // Let's just find the link with seasonxepisode or -temporada-Sx-capitulo-Ex
        const epRegex = new RegExp(`href="([^"]+temporada-${season}-capitulo-${episode}[^"]*)"`, 'i');
        const epMatch = epRegex.exec(html) || new RegExp(`href="([^"]+-[^"]*${season}x${episode}[^"]*)"`, 'i').exec(html);
        
        if (epMatch) {
            url = epMatch[1];
            console.log(`[HomeCine] Found episode: ${url}`);
        } else {
            // Usually /episodios/NAME-temporada-S-capitulo-E/
            const slug = url.split('/').filter(Boolean).pop();
            url = `${BASE_URL}/episodios/${slug}-temporada-${season}-capitulo-${episode}/`;
            console.log(`[HomeCine] Guessing episode url: ${url}`);
        }
    }

    return await extractStreams(url);
}

module.exports = { getStreams };
