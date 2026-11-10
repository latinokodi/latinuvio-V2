/**
 * PelisPlusHD — pelisplushd.la (PelisPlusHD theme).
 *
 * Verified live 2026-11-10:
 *   search   GET /search?s=<q>            -> cards /pelicula/<slug> or /serie/<slug>
 *   movie    content page                -> <li class="playurl" data-url="<embed>" data-name="Español Latino">
 *   tv ep    /serie/<slug>/temporada/<S>/capitulo/<E>
 *            -> player tabs + the active embed inside an HTML comment:
 *               <!-- <iframe src="https://streamwish.to/e/..."> -->
 *   resolve  cdn_resolvers (streamwish, vidhide, voe, fastream, ...)
 */
const H = require('./provider_helpers.js');

const HOST = 'https://pelisplushd.la';
const DEBUG = false;
function log() { if (DEBUG) console.log.apply(console, ['[PelisPlus]'].concat([].slice.call(arguments))); }

async function searchSite(query) {
  const res = await H.fetchText(`${HOST}/search?s=${encodeURIComponent(query)}`, { Referer: HOST + '/' }, 15000);
  if (res.status !== 200) return [];
  const out = [];
  const seen = new Set();
  const re = /href="(\/(?:pelicula|serie)\/[^"#?]+)"/gi;
  let m;
  while ((m = re.exec(res.text))) {
    const href = m[1];
    if (seen.has(href)) continue;
    seen.add(href);
    const windowText = res.text.slice(Math.max(0, m.index - 300), m.index + 600);
    const title = (windowText.match(/data-title="([^"]+)"/i) || [])[1]
      || (windowText.match(/<p[^>]*>([\s\S]{0,120}?)<\/p>/i) || [])[1]
      || '';
    out.push({ url: HOST + href, text: H.clean(title), isTv: /\/serie\//i.test(href) });
  }
  return out;
}

function pick(matches, titles, type) {
  const wantTv = type === 'tv';
  const typed = matches.filter(item => item.isTv === wantTv);
  for (const item of typed) {
    const haystack = H.slugSlug(item.text) + ' ' + H.slugSlug(item.url.split('/').filter(Boolean).pop());
    for (const title of titles) {
      const wanted = H.slugSlug(title);
      if (wanted && haystack.indexOf(wanted) >= 0) return item;
    }
  }
  return typed.length ? typed[0] : null;
}

function embedsFromPage(html) {
  const embeds = [];
  // Movie pages: playurl list with the real embed in data-url.
  const liRe = /<li[^>]*data-url="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = liRe.exec(html))) {
    const tag = m[0];
    const lang = (tag.match(/data-name="([^"]*)"/i) || [])[1] || '';
    embeds.push({ url: H.unescapeHtml(m[1]), lang: /latino/i.test(lang) ? 'Latino' : lang || 'Online' });
  }
  // TV pages: the active player lives in an HTML comment.
  const commentRe = /<!--\s*<iframe[^>]+src="([^"]+)"/gi;
  while ((m = commentRe.exec(html))) embeds.push({ url: H.unescapeHtml(m[1]), lang: 'Latino' });
  // Plain iframes as a last resort.
  const iframeRe = /<iframe[^>]+src="(https?:\/\/[^"]+)"/gi;
  while ((m = iframeRe.exec(html))) {
    const src = H.unescapeHtml(m[1]);
    if (!/youtube|youtu\.be/i.test(src)) embeds.push({ url: src, lang: 'Latino' });
  }
  return embeds;
}

async function getStreams(id, type, season, episode) {
  if (!id || !type) return [];
  const meta = await H.tmdbInfo(type, id);
  if (!meta) return [];
  let target = null;
  for (const title of meta.titles) {
    const matches = await searchSite(title);
    target = pick(matches, meta.titles, type);
    if (target) break;
  }
  if (!target) return log('no match'), [];

  let pageUrl = target.url.replace(/\/$/, '');
  if (type === 'tv') pageUrl += `/temporada/${parseInt(season, 10) || 1}/capitulo/${parseInt(episode, 10) || 1}`;
  const page = await H.fetchText(pageUrl, { Referer: HOST + '/' }, 15000);
  if (page.status !== 200) return [];

  const streams = [];
  const seen = new Set();
  for (const embed of embedsFromPage(page.text)) {
    if (seen.has(embed.url)) continue;
    seen.add(embed.url);
    // Skip hosts no resolver can handle (avoids wasted requests).
    if (!/(streamwish|strwish|hlswish|awish|embedwish|hanerix|vidhide|minochinos|dintezuvio|voe\.sx|voe\.|fastream|dood|uqload|vimeos|goodstream|ok\.ru|filemoon|bysesukior)/i.test(embed.url)) continue;
    const resolved = await H.resolveEmbed(embed.url);
    if (!resolved || !resolved.url) continue;
    const quality = resolved.quality || H.qualityOf(resolved.url);
    streams.push({
      name: 'PelisPlusHD',
      title: `${quality} · ${embed.lang} · ${resolved.server || 'Online'}`,
      url: resolved.url,
      quality: quality,
      headers: resolved.headers || {},
    });
    if (streams.length >= 8) break;
  }
  log(streams.length, 'sources from', pageUrl);
  return streams;
}

module.exports = { getStreams };

