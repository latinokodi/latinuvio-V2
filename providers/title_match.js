/**
 * title_match.js — shared, QuickJS-safe title matching (ported from the
 * advanced reference providers). Self-contained: no external deps, only the
 * global `fetch` for TMDB multi-locale + alternative-title harvesting.
 *
 * Fixes the "wrong title" class of bug: naive substring matches (e.g. "Origen"
 * picking "Los miserables. El origen") are replaced by a Jaccard (word-set)
 * similarity + year/season/sequel penalty, an exact/alias match is preferred,
 * and short/generic queries stop matching much-longer unrelated titles.
 *
 * Adds (vs the original): alternative_titles + translations harvest (with CJK
 * drop for Latino sites), trailing-digit/season suffix strip, word-ratio
 * (token set) matching, and slug-variant generation for multi-locale search.
 *
 * Usage:
 *   const { getTMDBTitles, calculateTitleSimilarity, pickBestTitleMatch,
 *           stripNumberSuffix, tokenSubsetMatch, slugify, buildSlugVariants } = require("./title_match.js");
 */

function normalizeTitle(title) {
  if (!title) return "";
  return title.toLowerCase()
    .replace(/\b(the|a|an|el|la|los|las|de|del|y|un|una|le|les|un)\b/g, " ")
    .replace(/[:\-–—_]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

/** Strip a trailing all-digit token (site appends season/sequel: "The Matrix 1"). */
function stripNumberSuffix(title) {
  if (!title) return title;
  return String(title).replace(/\s*\d+\s*$/, "").trim();
}

/** Strip a trailing roman-numeral token (common for sequels in some catalogs). */
function stripRomanSuffix(title) {
  if (!title) return title;
  return String(title).replace(/\s+(?:iv|vi|iii|ii|ix|v|viii|vii|i)\s*$/i, "").trim();
}

/** Word-ratio (token set) containment: are ALL significant query words present? */
function tokenSubsetMatch(query, candidate) {
  const q = query.split(/\s+/).filter(w => w.length > 2);
  const c = new Set((candidate || "").split(/\s+/).filter(Boolean));
  if (!q.length) return false;
  return q.every(w => c.has(w));
}

/** Jaccard (word-set) similarity, in [0,1]. */
function calculateTitleSimilarity(title1, title2) {
  const n1 = normalizeTitle(title1), n2 = normalizeTitle(title2);
  if (n1 === n2) return 1;
  const w1 = n1.split(/\s+/).filter(Boolean), w2 = n2.split(/\s+/).filter(Boolean);
  if (!w1.length || !w2.length) return 0;
  const s2 = new Set(w2);
  const inter = w1.filter((w) => s2.has(w)).length;
  const union = new Set([...w1, ...w2]).size;
  const extra = w2.filter((w) => !new Set(w1).has(w)).length;
  let score = inter / union - extra * 0.05;
  if (w1.every((w) => s2.has(w))) score += 0.2; // query fully contained
  // A single-word query shouldn't grab a multi-word title (e.g. "matrix" → "matrix reloaded").
  if (w1.length === 1 && w2.length > 1) score -= 0.4;
  return score;
}

/**
 * Pick the best match from candidate objects [{title, year?, url?}] against a
 * list of media titles (+ optional year/season). Prefers exact and alias
 * matches; penalizes year mismatch, wrong season and wrong sequel.
 */
function pickBestTitleMatch(mediaTitles, year, candidates, mediaType, season) {
  if (!candidates || !candidates.length) return null;
  const titles = (mediaTitles || []).map(t => String(t)).concat((mediaTitles || []).map(t => stripNumberSuffix(t)));
  let best = null, bestScore = 0;
  for (const c of candidates) {
    if (!c.title) continue;
    let score = 0;
    for (const mt of titles) {
      let s = calculateTitleSimilarity(mt, c.title);
      // exact / full-word-subset bonus (helps cross-locale site titles)
      if (normalizeTitle(mt) === normalizeTitle(c.title)) s = 1;
      else if (tokenSubsetMatch(mt, c.title)) s = Math.max(s, 0.85);
      // trailing-digit strip equality ("the matrix 1" vs "the matrix")
      if (normalizeTitle(stripNumberSuffix(mt)) === normalizeTitle(stripNumberSuffix(c.title))) s = Math.max(s, 0.9);
      if (s > score) score = s;
    }
    if (year && c.year) {
      const dy = Math.abs(parseInt(year, 10) - parseInt(c.year, 10));
      // sequel mismatch: candidate ends with a trailing digit that isn't this year
      const trailing = String(c.title).match(/\s*(\d+)\s*$/);
      if (trailing && String(year) !== trailing[1]) score -= 0.25;
      if (dy === 0) score += 0.2;
      else if (dy <= 1) score += 0.1;
      else if (dy > 5) score -= 0.3;
    }
    if (mediaType === "tv" && season) {
      const tl = String(c.title).toLowerCase();
      if (tl.includes(`season ${season}`) || tl.includes(`s${season}`) || tl.includes(`temporada ${season}`)) score += 0.5;
      const m = tl.match(/season\s*(\d+)|s(\d+)|temporada\s*(\d+)/i);
      if (m && parseInt(m[1] || m[2] || m[3], 10) !== parseInt(season, 10)) score -= 0.8;
    }
    if (score > bestScore && score > 0.3) { bestScore = score; best = c; }
  }
  return best;
}

/** Drop CJK/Japanese rows (Latino catalogs rarely carry kanji titles; keep the localized name). */
function isCjk(s) {
  return /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(s || "");
}

/**
 * Harvest multi-locale titles (es-MX/es-ES/en-US) + original_title +
 * alternative_titles (Latin) + translations, dropping CJK rows. Returns
 * { titles:[], year, imdb_id, original } or null.
 */
async function getTMDBTitles(tmdbId, mediaType, key, ua) {
  try {
    const titles = new Set(); let year = "", imdb_id = null, original = "";
    const type = mediaType === "tv" ? "tv" : "movie";
    const langs = ["es-MX", "es-ES", "en-US"];
    for (const lang of langs) {
      const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${key}&language=${lang}`;
      const res = await fetch(url, { headers: { "User-Agent": ua } }).then(r => r.json());
      const t = type === "movie" ? (res.title || res.original_title) : (res.name || res.original_name);
      if (t && !isCjk(t)) titles.add(t);
      const orig = res.original_title || res.original_name;
      if (orig && !isCjk(orig)) { titles.add(orig); if (!original) original = orig; }
      if (!imdb_id && res.imdb_id) imdb_id = res.imdb_id;
      if (!year) year = (res.release_date || res.first_air_date || "").substring(0, 4);
    }
    // alternative_titles (Latin locales) + translations — cross-language recall
    try {
      const alt = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/alternative_titles?api_key=${key}`, { headers: { "User-Agent": ua } }).then(r => r.json());
      for (const t of (alt.titles || [])) if (t.title && !isCjk(t.title)) titles.add(t.title);
    } catch (e) {}
    try {
      const tr = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/translations?api_key=${key}`, { headers: { "User-Agent": ua } }).then(r => r.json());
      for (const t of (tr.translations || [])) {
        const d = t.data || {};
        const n = d.title || d.name;
        if (n && !isCjk(n)) titles.add(n);
      }
    } catch (e) {}
    return titles.size ? { titles: Array.from(titles), year, imdb_id, original } : null;
  } catch (e) { return null; }
}

/** Slugify a title for /movies/<slug>, /search?q= etc. */
function slugify(title) {
  return String(title || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim().replace(/\s+/g, "-");
}

/** Build a handful of candidate slugs from a set of titles (multi-locale recall). */
function buildSlugVariants(titles, year) {
  const out = [];
  const seen = new Set();
  for (const t of titles) {
    if (!t) continue;
    const base = slugify(stripNumberSuffix(t));
    const full = slugify(t);
    for (const v of [base, full]) {
      if (v && v.length > 2 && !seen.has(v)) { seen.add(v); out.push(v); }
    }
    if (year && !seen.has(slugify(t) )) out.push(slugify(t));
  }
  // also the bare original title (no year)
  return out;
}

module.exports = {
  normalizeTitle, calculateTitleSimilarity, pickBestTitleMatch, getTMDBTitles,
  stripNumberSuffix, stripRomanSuffix, tokenSubsetMatch, slugify, buildSlugVariants, isCjk,
};
