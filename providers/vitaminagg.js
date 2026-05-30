const CryptoJS = require('crypto-js');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const AES_KEY = CryptoJS.enc.Utf8.parse('kiemtienmua911ca');
const AES_IV = CryptoJS.enc.Utf8.parse('1234567890oiuytr');

// Known hosts and their series URL path segment
const HOST_SERIES_PATH = {
    "vitaminagg.vip":       "serie",
    "anime.vitaminagg.vip": "anime",
    "hentai.vitaminagg.vip":"serie",
};

function decrypt(hexCiphertext) {
    try {
        const cleaned = (hexCiphertext.match(/[\da-f]{2}/gi) || []).join('');
        const ciphertextWords = CryptoJS.enc.Hex.parse(cleaned);
        const ciphertextBase64 = CryptoJS.enc.Base64.stringify(ciphertextWords);
        const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, AES_KEY, {
            iv: AES_IV,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("[VitaminagG] Decryption failed:", e.message);
        return null;
    }
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

/**
 * @param {string} tmdbId
 * @param {"movie"|"tv"} mediaType
 * @param {number|null} season
 * @param {number|null} episode
 * @param {string} title
 * @param {string} [host] - optional subdomain: vitaminagg.vip (default), anime.vitaminagg.vip, hentai.vitaminagg.vip
 */
async function getStreams(tmdbId, mediaType, season, episode, title, host) {
    let targetTitle = title;
    if (!targetTitle) {
        try {
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c&language=es-MX`).then(r => r.json());
            targetTitle = mediaType === "movie" ? tmdbRes.title : tmdbRes.name;
        } catch (e) {
            console.error("[VitaminagG] TMDB lookup failed:", e.message);
        }
    }
    
    if (!targetTitle) {
        console.error("[VitaminagG] Missing title");
        return [];
    }
    title = targetTitle;

    // If host is provided, only try that one. Otherwise try main then anime.
    const hostsToTry = host ? [host] : ["vitaminagg.vip", "anime.vitaminagg.vip"];
    
    for (const siteHost of hostsToTry) {
        const siteBase = `https://${siteHost}`;
        const seriesPath = HOST_SERIES_PATH[siteHost] || "serie";

        console.log(`[VitaminagG] Resolving: ${title} (${mediaType})${mediaType === 'tv' ? ` S${season}E${episode}` : ''} [host: ${siteHost}]`);

        try {
            const targetSlug = slugify(title);
            let pageUrl = "";

            // Step 1: Search the site for the title
            const searchUrl = `${siteBase}/?s=${encodeURIComponent(title)}`;
            console.log(`[VitaminagG] Searching: ${searchUrl}`);

            let searchHtml = "";
            try {
                const searchRes = await fetch(searchUrl, { headers: { "User-Agent": UA } });
                if (searchRes.ok) searchHtml = await searchRes.text();
            } catch (err) {
                console.warn(`[VitaminagG] Search failed on ${siteHost}:`, err.message);
            }

            // Build regex to match the correct content-type path on this host
            const escapedHost = siteHost.replace(/\./g, "\\.");
            const linkPattern = mediaType === "movie"
                ? new RegExp(`href="(https?:\\/\\/${escapedHost}\\/movie\\/([^/"]+)\\/?)"`, "g")
                : new RegExp(`href="(https?:\\/\\/${escapedHost}\\/${seriesPath}\\/([^/"]+)\\/?)"`, "g");

            let match;
            let matchedUrl = null;
            if (searchHtml) {
                while ((match = linkPattern.exec(searchHtml)) !== null) {
                    const url = match[1];
                    const slug = match[2];
                    if (slug.includes(targetSlug) || targetSlug.includes(slug)) {
                        matchedUrl = url;
                        break;
                    }
                }
            }

            if (matchedUrl) {
                console.log(`[VitaminagG] Found matched page via search: ${matchedUrl}`);
                pageUrl = matchedUrl;
            } else {
                // Fallback to predicted URL
                pageUrl = mediaType === "movie"
                    ? `${siteBase}/movie/${targetSlug}/`
                    : `${siteBase}/${seriesPath}/${targetSlug}/`;
                console.log(`[VitaminagG] Fallback to predicted page: ${pageUrl}`);
            }

            // Step 2: For TV shows, resolve the episode page URL
            if (mediaType === "tv") {
                const seasonPadded = String(season).padStart(2, "0");
                const episodePadded = String(episode).padStart(2, "0");
                // Extract series slug from the matched page URL (handles /serie/ and /anime/)
                const seriesSlugMatch = pageUrl.match(new RegExp(`\\/${seriesPath}\\/([^/]+)\\/?`));
                const seriesSlug = seriesSlugMatch ? seriesSlugMatch[1] : targetSlug;
                pageUrl = `${siteBase}/episodes/${seriesSlug}-s${seasonPadded}x${episodePadded}/`;
                console.log(`[VitaminagG] Resolved episode page: ${pageUrl}`);
            }

            // Step 3: Fetch the content page
            console.log(`[VitaminagG] Fetching content page: ${pageUrl}`);
            const pageRes = await fetch(pageUrl, { headers: { "User-Agent": UA } });
            if (!pageRes.ok) {
                console.log(`[VitaminagG] Page request failed with status: ${pageRes.status} on ${siteHost}`);
                continue; // Try next host
            }
            const pageHtml = await pageRes.text();

            // Extract post ID
            const playerViewMatch = pageHtml.match(/class=["'][^"']*plyer__view[^"']*["']\s+data-post-id=["'](\d+)["']/i);
            if (!playerViewMatch) {
                console.log("[VitaminagG] Player view post ID not found in page HTML.");
                continue;
            }
            const postId = playerViewMatch[1];
            console.log(`[VitaminagG] Found player post ID: ${postId}`);

            // Use the page's own host for the wstrm-player request
            const pageHost = new URL(pageUrl).origin;
            const playerUrl = `${pageHost}/wstrm-player?id=${postId}&plyer-id=opcion-1`;
            console.log(`[VitaminagG] Fetching player template page: ${playerUrl}`);
            const playerHtml = await fetch(playerUrl, { headers: { "User-Agent": UA, "Referer": pageUrl } }).then(r => r.text());

            // Extract the video URL from data-src attribute (supports all backends: uns.bio, strp2p.site, rpmhub.site, upns.online, etc.)
            const srcMatch = playerHtml.match(/data-src=["']([^"']+)["']/);
            if (!srcMatch) {
                console.log("[VitaminagG] Could not find video source (data-src) in player template HTML.");
                continue;
            }

            const [videoBackendUrlRaw, videoHash] = srcMatch[1].split('#');
            if (!videoHash) {
                console.log("[VitaminagG] Could not find video hash in data-src.");
                continue;
            }

            const videoBackendUrl = videoBackendUrlRaw.replace(/\/$/, '');
            console.log(`[VitaminagG] Found video hash: ${videoHash} (backend: ${videoBackendUrl})`);

            // Step 4: Query the backend API
            const videoApiUrl = `${videoBackendUrl}/api/v1/video?id=${videoHash}&w=1920&h=1080&r=vitaminagg.vip`;
            console.log(`[VitaminagG] Querying API: ${videoApiUrl}`);
            const videoRes = await fetch(videoApiUrl, {
                headers: {
                    "User-Agent": UA,
                    "Referer": `${videoBackendUrl}/`
                }
            });
            if (!videoRes.ok) {
                console.log(`[VitaminagG] API returned status: ${videoRes.status}`);
                continue;
            }
            const encryptedText = await videoRes.text();
            const decryptedText = decrypt(encryptedText);
            if (!decryptedText) {
                console.log("[VitaminagG] Failed to decrypt API response.");
                continue;
            }

            const videoData = JSON.parse(decryptedText);
            const streams = [];

            // Extract direct source m3u8 stream
            if (videoData.source) {
                streams.push({
                    name: "VitaminagG",
                    title: `${videoData.title || title} \xB7 Directo`,
                    url: videoData.source,
                    quality: "1080p",
                    headers: {
                        "User-Agent": UA,
                        "Referer": `${videoBackendUrl}/`,
                        "Origin": videoBackendUrl
                    }
                });
            }

            // Extract proxy cloudflare stream (cf)
            if (videoData.cf) {
                streams.push({
                    name: "VitaminagG",
                    title: `${videoData.title || title} \xB7 Cloudflare`,
                    url: videoData.cf,
                    quality: "1080p",
                    headers: {
                        "User-Agent": UA,
                        "Referer": `${videoBackendUrl}/`,
                        "Origin": videoBackendUrl
                    }
                });
            }

            if (streams.length > 0) {
                console.log(`[VitaminagG] Resolved ${streams.length} stream(s) on ${siteHost}`);
                return streams;
            }

        } catch (e) {
            console.error(`[VitaminagG] Error resolving on ${siteHost}:`, e.message);
        }
    }

    return [];
}

module.exports = { getStreams };
