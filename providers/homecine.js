/**
 * HomeCine — www3.homecine.to (series-first catalogue).
 * Verified live 2026-11-10:
 *   /?s=<q>                                       -> /series/<slug> cards
 *   /series/<slug>                                -> /episode/<slug>-temporada-<S>-capitulo-<E>
 *   episode page                                  -> <iframe src="fastream.to/...">
 *   resolve: fastream (Accept-Language), voe, streamwish, ...
 */
const H = require('./provider_helpers.js');

const HOST = 'https://www3.homecine.to';
const DEBUG = false;
function log() { if (DEBUG) console.log.apply(console, ['[HomeCine]'].concat([].slice.call(arguments))); }

async function searchSite(query) {
  const res = await H.fetchText(`${HOST}/?s=${encodeURIComponent(query).replace(/%20/g, '+')}`, null, 15000);
  const out = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi;
  let m;
  while ((m = re.exec(res.text))) {
    const href = m[1];
    if (!/\/(series|serie|pelicula|movie|episode)\//i.test(href)) continue;
    if (/\/genre\/|\/category\/|\?s=/i.test(href)) continue;
    out.push({ url: href.indexOf('http') === 0 ? href : HOST + href, text: H.clean(m[2]) });
  }
  return out;
}

function pick(matches, titles, type) {
  const wantTv = type === 'tv';
  const typed = matches.filter(m => (/episode/i.test(m.url) ? false : true) && (wantTv ? /\/series|\/serie/i.test(m.url) : /\/pelicula|\/movie/i.test(m.url)));
  const pool = typed.length ? typed : matches;
  for (const match of pool) {
    const haystack = H.slugSlug(match.url.split('/').filter(Boolean).pop()) + ' ' + H.slugSlug(match.text);
    for (const title of titles) {
      const wanted = H.slugSlug(title);
      if (wanted && haystack.indexOf(wanted) >= 0) return match.url;
    }
  }
  return pool.length ? pool[0].url : null;
}

async function episodeUrl(seriesUrl, season, episode) {
  const res = await H.fetchText(seriesUrl, null, 15000);
  if (res.status !== 200) return null;
  const s = parseInt(season, 10) || 1;
  const e = parseInt(episode, 10) || 1;
  const re = /href="([^"]*\/episode\/[^"]*temporada[\s-]*0*(\d+)[\s-]*capitulo[\s-]*0*(\d+)[^"]*)"/gi;
  let m;
  while ((m = re.exec(res.text))) {
    if (parseInt(m[2], 10) === s && parseInt(m[3], 10) === e) return m[1].indexOf('http') === 0 ? m[1] : HOST + m[1];
  }
  return null;
}

async function pageSources(pageUrl) {
  const page = await H.fetchText(pageUrl, { Referer: HOST + '/' }, 15000);
  if (page.status !== 200) return [];
  const embeds = [];
  const re = /<iframe[^>]+src="([^"]+)"/gi;
  let m;
  while ((m = re.exec(page.text))) {
    const src = H.unescapeHtml(m[1]).replace(/^\/\//, 'https://');
    if (/youtube|youtu\.be/i.test(src)) continue;
    embeds.push(src);
  }
  const streams = await H.streamsFromEmbeds('HomeCine', embeds, 'Latino');
  log(streams.length, 'sources from', pageUrl);
  return streams;
}

async function getStreams(id, type, season, episode) {
  if (!id || !type) return [];
  const meta = await H.tmdbInfo(type, id);
  if (!meta) return [];
  for (const title of meta.titles) {
    const matches = await searchSite(title);
    const target = pick(matches, meta.titles, type);
    if (!target) continue;
    let pageUrl = target;
    if (type === 'tv') {
      const ep = await episodeUrl(pageUrl, season, episode);
      if (!ep) continue;
      pageUrl = ep;
    }
    const streams = await pageSources(pageUrl);
    if (streams.length) return streams;
  }
  return [];
}

module.exports = { getStreams };
