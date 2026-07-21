const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://mirandogratis.com";

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
        
        const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
        let match;
        while ((match = articleRe.exec(html)) !== null) {
            const article = match[1];
            const linkMatch = /<a href="([^"]+)"/.exec(article);
            const titleMatch = /title="([^"]+)"/.exec(article);
            
            if (linkMatch && titleMatch) {
                matches.push({
                    url: linkMatch[1],
                    title: titleMatch[1]
                });
            }
        }
        return matches;
    } catch (e) {
        console.log(`[MirandoGratis] Search Error: ${e.message}`);
        return [];
    }
}

async function resolveWaaw(embedUrl) {
    try {
        const eUrl = embedUrl.replace(/\/f\//, "/e/");
        const res = await fetch(eUrl, {
            headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
        });
        if (!res.ok) return null;
        const html = await res.text();
        const m3 = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
        if (m3) return m3[0];
        const file = html.match(/file\s*:\s*["']([^"']+)["']/i);
        if (file) return file[1];
    } catch (e) {
    }
    return null;
}

async function extractStreams(pageUrl) {
    try {
        const html = await fetch(pageUrl, { headers: HEADERS }).then(r => r.text());
        
        const streams = [];
        const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
        let iframeMatch;
        while ((iframeMatch = iframeRe.exec(html)) !== null) {
            const embedUrl = iframeMatch[1];
            let serverName = "Unknown";
            if (embedUrl.includes('waaw')) serverName = "Waaw";
            else if (embedUrl.includes('uptostream')) serverName = "Uptostream";
            else if (embedUrl.includes('youtube')) continue; // Skip youtube trailers
            else serverName = new URL(embedUrl).hostname;
            
            let audio = 'Lat';
            if (html.includes('<strong>Audio</strong>: Español Latino')) audio = 'Lat';
            else if (html.includes('<strong>Audio</strong>: Castellano')) audio = 'Esp';
            else if (html.includes('<strong>Audio</strong>: Subtitulado')) audio = 'Vose';
            
            if (serverName === "Waaw") {
                const direct = await resolveWaaw(embedUrl);
                if (direct) {
                    streams.push({
                        provider: "MirandoGratis",
                        title: `Waaw (${audio})`,
                        url: direct,
                        quality: '720p',
                        headers: { 'Referer': embedUrl, 'User-Agent': HEADERS["User-Agent"] }
                    });
                    continue;
                }
            }

            streams.push({
                name: "MirandoGratis",
                title: `${serverName} (${audio})`,
                url: embedUrl,
                isEmbed: true // Indicate this needs resolving
            });
        }
        
        return streams;
    } catch (e) {
        console.log(`[MirandoGratis] Extract Error: ${e.message}`);
        return [];
    }
}

async function getStreams(id, type, season, episode) {
    if (type !== "movie") return []; // Site seems to be movies only based on balandro script
    
    console.log(`[MirandoGratis] Resolving: ${type} ${id}`);
    const info = await getTMDBInfo(id, type);
    if (!info) return [];

    let matchedPost = null;
    for (const title of info.titles) {
        const results = await search(title);
        if (results && results.length > 0) {
            matchedPost = results.find(r => {
                const rt = cleanTitle(r.title);
                return info.titles.some(t => {
                    const ct = cleanTitle(t);
                    return rt.includes(ct) || ct.includes(rt);
                });
            });
            if (matchedPost) break;
        }
    }

    if (!matchedPost) {
        console.log("[MirandoGratis] No matching post found.");
        return [];
    }

    console.log(`[MirandoGratis] Matched: "${matchedPost.title}" -> ${matchedPost.url}`);
    return await extractStreams(matchedPost.url);
}

module.exports = { getStreams };
