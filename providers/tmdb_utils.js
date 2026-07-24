/**
 * Shared TMDB utilities for all providers.
 *
 * Functions:
 *   buildTmdbUrl(tmdbId, type, language)  — routes IMDb IDs via /find/, TMDB IDs via /type/
 *   cachedTmdbFetch(tmdbId, type, language) — fetch with in-memory cache + safe logging
 *   getTmdbTitles(tmdbId, type, languages)  — multi-language title collection
 *   logTmdb(callname, tmdbId, lang, status) — safe logging (no API key leakage)
 */

const { TMDB_API_KEY } = require("./tmdb_config");

// ---------------------------------------------------------------------------
// In-memory cache (keyed by tmdbId:type:language)
// ---------------------------------------------------------------------------
const TMDB_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheKey(tmdbId, type, language) {
    return `${tmdbId}|${type}|${language || "no-lang"}`;
}

function cacheGet(tmdbId, type, language) {
    const entry = TMDB_CACHE.get(cacheKey(tmdbId, type, language));
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
        return entry.data;
    }
    if (entry) TMDB_CACHE.delete(cacheKey(tmdbId, type, language));
    return null;
}

function cacheSet(tmdbId, type, language, data) {
    TMDB_CACHE.set(cacheKey(tmdbId, type, language), { data, ts: Date.now() });
}

// ---------------------------------------------------------------------------
// Safe URL builder — handles both IMDb (tt*) and TMDB numeric IDs
// ---------------------------------------------------------------------------

/**
 * Build a correct TMDB API URL.
 *   - IMDb IDs (starting with "tt") → /3/find/{id}?external_source=imdb_id
 *   - TMDB numeric IDs            → /3/{type}/{id}
 */
function buildTmdbUrl(tmdbId, type, language) {
    const cleanId = String(tmdbId).split(":")[0]; // strip any suffixes
    const lang = language || "en-US";
    const key = TMDB_API_KEY;

    if (cleanId.startsWith("tt")) {
        return `https://api.themoviedb.org/3/find/${cleanId}?api_key=${key}&external_source=imdb_id&language=${lang}`;
    }
    return `https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${key}&language=${lang}`;
}

// ---------------------------------------------------------------------------
// Safe logging — never includes the API key in log output
// ---------------------------------------------------------------------------

function logTmdb(callName, tmdbId, type, lang, status) {
    const id = String(tmdbId).split(":")[0];
    const path = id.startsWith("tt")
        ? `/3/find/${id}?external_source=imdb_id`
        : `/3/${type}/${id}`;
    console.log(`[${callName}] TMDB ${status || ""} ${path}${lang ? "&language=" + lang : ""}`);
}

// ---------------------------------------------------------------------------
// Cached TMDB fetch — single language, with cache
// ---------------------------------------------------------------------------

async function cachedTmdbFetch(tmdbId, type, language, callerName) {
    const lang = language || "en-US";
    const name = callerName || "TMDB";

    const cached = cacheGet(tmdbId, type, lang);
    if (cached) {
        logTmdb(name, tmdbId, type, lang, "CACHED");
        return cached;
    }

    const url = buildTmdbUrl(tmdbId, type, lang);
    logTmdb(name, tmdbId, type, lang, "FETCH");

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json"
            }
        });
        if (!res.ok) {
            console.log(`[${name}] TMDB HTTP ${res.status} for ${tmdbId}`);
            return null;
        }
        let data = await res.json();

        // If it was a /find/ query, extract the first result
        if (String(tmdbId).startsWith("tt")) {
            data = type === "movie" ? data.movie_results?.[0] : data.tv_results?.[0] || data.movie_results?.[0];
            if (!data) {
                console.log(`[${name}] TMDB /find/ returned no results for ${tmdbId}`);
                return null;
            }
        }

        cacheSet(tmdbId, type, lang, data);
        return data;
    } catch (e) {
        console.log(`[${name}] TMDB Error: ${e.message}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Multi-language title fetch — collects titles across languages (with cache)
// ---------------------------------------------------------------------------

async function getTmdbTitles(tmdbId, type, languages, callerName) {
    const langs = languages || ["es-MX", "es-ES", "en-US"];
    const name = callerName || "TMDB";
    const titles = new Set();
    let year = "";
    let imdbId = "";

    for (const lang of langs) {
        const data = await cachedTmdbFetch(tmdbId, type, lang, name);
        if (!data) continue;

        const title = type === "movie" ? data.title : data.name;
        const original = type === "movie" ? data.original_title : data.original_name;
        if (title) titles.add(title);
        if (original) titles.add(original);
        if (!year) year = (data.release_date || data.first_air_date || "").substring(0, 4);
        if (!imdbId && data.imdb_id) imdbId = data.imdb_id;
    }

    return { titles: Array.from(titles), year, imdbId };
}

module.exports = {
    buildTmdbUrl,
    cachedTmdbFetch,
    getTmdbTitles,
    logTmdb,
    TMDB_CACHE
};
