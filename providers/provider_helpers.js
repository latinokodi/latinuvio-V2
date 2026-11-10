/**
 * provider_helpers.js — shared helpers for the latinuvio providers added in
 * 2026-11 (VitaminagG, RetroTve, SeriesGato, HomeCine, Cuevana).
 *
 * Self-contained: global fetch + the sibling cdn_resolvers.js module.
 */
const cdn = require('./cdn_resolvers.js');

const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const STEALTH = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

function timeoutSignal(ms) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  } catch (e) {}
  try {
    if (typeof AbortController === 'function' && typeof setTimeout === 'function') return new AbortController().signal;
  } catch (e) {}
  return undefined;
}

async function fetchText(url, headers, timeout) {
  try {
    const res = await fetch(url, {
      headers: Object.assign({}, STEALTH, headers || {}),
      redirect: 'follow',
      signal: timeoutSignal(timeout || 15000),
    });
    const text = await res.text();
    return { status: res.status, text: text, url: res.url };
  } catch (err) {
    return { status: 0, text: '', error: String((err && err.message) || err) };
  }
}

async function fetchJson(url, headers, timeout) {
  const res = await fetchText(url, Object.assign({ 'Accept': 'application/json' }, headers || {}), timeout);
  try { return JSON.parse(res.text); } catch (e) { return null; }
}

async function tmdbInfo(type, id) {
  const titles = [];
  let year = '';
  for (const lang of ['es-MX', 'es-ES', 'en-US']) {
    const data = await fetchJson(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=${lang}`, null, 8000);
    if (!data) continue;
    for (const key of ['title', 'name', 'original_title', 'original_name']) {
      const value = data[key];
      if (value && titles.indexOf(value) === -1) titles.push(value);
    }
    if (!year) year = String(data.release_date || data.first_air_date || '').slice(0, 4);
  }
  return titles.length ? { titles: titles, year: year, raw: null } : null;
}

function clean(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugSlug(text) {
  return String(text || '').toLowerCase().replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function hyphenSlug(text) {
  return slugSlug(text).replace(/\s+/g, '-');
}

function qualityOf(url) {
  const u = String(url || '').toLowerCase();
  if (u.indexOf('2160') >= 0 || u.indexOf('4k') >= 0) return '4K';
  if (u.indexOf('1080') >= 0) return '1080p';
  if (u.indexOf('720') >= 0) return '720p';
  if (u.indexOf('480') >= 0) return '480p';
  if (u.indexOf('360') >= 0) return '360p';
  return 'HD';
}

function unescapeHtml(text) {
  return String(text || '')
    .replace(/&#0?38;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/');
}

function uniq(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Try every suitable cdn_resolver for an embed URL; returns a stream or null. */
async function resolveEmbed(embedUrl) {
  const url = String(embedUrl || '');
  if (!/^https?:\/\//i.test(url)) return null;
  const tries = [];
  if (/(voe\.sx|voe\.)/i.test(url)) tries.push(cdn.resolveVoe);
  if (/(streamwish|strwish|hlswish|awish|wishfast|embedwish|hanerix)/i.test(url)) tries.push(cdn.resolveStreamWish);
  if (/(vidhide|minochinos|dintezuvio|morencius|movearnpre|luluvdo)/i.test(url)) tries.push(cdn.resolveVidHide);
  if (/(ok\.ru|odnoklassniki)/i.test(url)) tries.push(cdn.resolveOkru);
  if (/fastream/i.test(url)) tries.push(cdn.resolveFastream);
  if (/(doodstream|dood\.|ds2play)/i.test(url)) tries.push(cdn.resolveDood);
  if (/uqload/i.test(url)) tries.push(cdn.resolveUqload);
  if (/(vimeos|vms\.sh)/i.test(url)) tries.push(cdn.resolveVimeos);
  if (/goodstream/i.test(url)) tries.push(cdn.resolveGoodstream);
  if (/bysezoxexe/i.test(url)) tries.push(cdn.resolveBysezoxexe);
  tries.push(cdn.resolvePrimeload, cdn.resolveGenericPage, cdn.resolveEmbed);
  for (const fn of tries) {
    if (typeof fn !== 'function') continue;
    try {
      const result = await fn(url);
      if (result && result.url) return result;
    } catch (e) {}
  }
  return null;
}

/** Build Nuvio stream objects from a list of embed URLs. */
async function streamsFromEmbeds(providerName, embeds, language) {
  const streams = [];
  for (const embed of uniq(embeds).slice(0, 8)) {
    const resolved = await resolveEmbed(embed);
    if (!resolved || !resolved.url) continue;
    const server = resolved.server || String(embed).split('/')[2] || 'Online';
    const quality = resolved.quality || qualityOf(resolved.url);
    const label = language ? ` · ${language}` : '';
    streams.push({
      name: providerName,
      title: `${quality}${label} · ${server}`,
      url: resolved.url,
      quality: quality,
      headers: resolved.headers || {},
    });
  }
  return streams;
}

module.exports = {
  TMDB_KEY, UA, STEALTH, timeoutSignal, fetchText, fetchJson, tmdbInfo,
  clean, slugSlug, hyphenSlug, qualityOf, unescapeHtml, uniq, resolveEmbed, streamsFromEmbeds,
};
