/**
 * RetroTve — retrotve.com (Tema Retro).
 *
 * Verified live 2026-11-10:
 *   search   GET /wp-json/wp/v2/search?search=<q>&per_page=10
 *              -> [{title, subtype: "movies"|"series", url: /pelicula/... | /serie/...}]
 *            (the HTML ?s= page no longer lists results)
 *   TV ep    series page -> /seriestv/<slug>-<S>x<E>/
 *   player   content page -> iframe ?trembed=<n>&trid=<id>&trtype=<t>
 *            that page embeds the real host (ok.ru, filemoon, ...)
 */
const H = require('./provider_helpers.js');

const HOST = 'https://retrotve.com';
const DEBUG = false;
function log() { if (DEBUG) console.log.apply(console, ['[RetroTve]'].concat([].slice.call(arguments))); }

async function searchSite(query) {
  const data = await H.fetchJson(`${HOST}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=10`, null, 15000);
  if (!Array.isArray(data)) return [];
  return data.filter(item => item && item.url);
}

function isTvItem(item) {
  return /\/serie\//i.test(item.url) || String(item.subtype || '').toLowerCase() === 'series';
}

function pick(items, titles, type) {
  const wantTv = type === 'tv';
  const typed = items.filter(item => isTvItem(item) === wantTv);
  for (const item of typed) {
    const haystack = H.slugSlug(item.title) + ' ' + H.slugSlug(String(item.url).split('/').filter(Boolean).pop());
    for (const title of titles) {
      const wanted = H.slugSlug(title);
      if (wanted && haystack.indexOf(wanted) >= 0) return item;
    }
  }
  return typed.length ? typed[0] : null;
}

async function episodeUrl(seriesUrl, season, episode) {
  const res = await H.fetchText(seriesUrl, { Referer: HOST + '/' }, 15000);
  if (res.status !== 200) return null;
  const s = parseInt(season, 10) || 1;
  const e = parseInt(episode, 10) || 1;
  const want = new RegExp(`-${s}x${e}/?(?:[?#]|$)`, 'i');
  const re = /href="([^"]*\/seriestv\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(res.text))) {
    if (want.test(m[1])) return m[1].indexOf('http') === 0 ? m[1] : HOST + m[1];
  }
  return null;
}

async function resolvePage(pageUrl) {
  const page = await H.fetchText(pageUrl, { Referer: HOST + '/' }, 15000);
  if (page.status !== 200) return [];
  const embeds = [];
  const trembedRe = /trembed=(\d+)(?:&#0?38;|&amp;|&)trid=(\d+)(?:&#0?38;|&amp;|&)trtype=(\d+)/gi;
  let m;
  while ((m = trembedRe.exec(page.text))) {
    const embedPage = `${HOST}/?trembed=${m[1]}&trid=${m[2]}&trtype=${m[3]}`;
    const res = await H.fetchText(embedPage, { Referer: pageUrl }, 12000);
    const iframe = (res.text.match(/<iframe[^>]+src="([^"]+)"/i) || [])[1];
    if (iframe) embeds.push(H.unescapeHtml(iframe).replace(/^\/\//, 'https://'));
  }
  if (!embeds.length) {
    const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
    let im;
    while ((im = iframeRe.exec(page.text))) embeds.push(H.unescapeHtml(im[1]).replace(/^\/\//, 'https://'));
  }
  const streams = await H.streamsFromEmbeds('RetroTve', embeds, 'Latino');
  log(streams.length, 'sources from', pageUrl);
  return streams;
}

async function getStreams(id, type, season, episode) {
  if (!id || !type) return [];
  const meta = await H.tmdbInfo(type, id);
  if (!meta) return [];
  for (const title of meta.titles) {
    const items = await searchSite(title);
    const target = pick(items, meta.titles, type);
    if (!target) continue;
    let pageUrl = target.url;
    if (type === 'tv') {
      const ep = await episodeUrl(pageUrl, season, episode);
      if (!ep) continue;
      pageUrl = ep;
    }
    const streams = await resolvePage(pageUrl);
    if (streams.length) return streams;
  }
  return [];
}

module.exports = { getStreams };
