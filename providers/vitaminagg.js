/**
 * VitaminagG — vitaminagg.vip (wstrm original theme).
 *
 * Verified live 2026-11-10: the player is built server-side by
 *   /wstrm-player/?id=<post_id>&plyer-id=<opcion-N>&format=<fmt>
 * and returns a signed direct MP4, so no embed resolver is involved.
 * Series pages only list the newest season, so episode URLs are predicted:
 *   /episodes/<slug>-s<SS>x<EE>/
 */
const H = require('./provider_helpers.js');

const HOST = 'https://vitaminagg.vip';
const DEBUG = false;
function log() { if (DEBUG) console.log.apply(console, ['[VitaminagG]'].concat([].slice.call(arguments))); }

function pick(links, titles, type) {
  const wantTv = type === 'tv';
  const typed = links.filter(l => (l.indexOf('/serie/') >= 0) === wantTv);
  for (const url of typed) {
    const slug = H.slugSlug(url.replace(/\/$/, '').split('/').pop());
    for (const title of titles) {
      const wanted = H.slugSlug(title);
      if (wanted && (slug.indexOf(wanted) >= 0 || wanted.indexOf(slug) >= 0)) return url;
    }
  }
  return typed.length ? typed[0] : null;
}

async function searchSite(query) {
  const res = await H.fetchText(`${HOST}/?s=${encodeURIComponent(query)}`, null, 15000);
  const links = [];
  const re = /href="(https?:\/\/vitaminagg\.vip\/(?:movie|serie)\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(res.text))) links.push(m[1]);
  return H.uniq(links);
}

async function episodeUrl(seriesUrl, season, episode) {
  const list = String(seriesUrl).replace(/\/$/, '').split('/');
  const slug = list[list.length - 1];
  const s = parseInt(season, 10) || 1;
  const e = parseInt(episode, 10) || 1;
  const pad = n => (n < 10 ? '0' + n : String(n));
  const candidates = [
    `${HOST}/episodes/${slug}-s${pad(s)}x${pad(e)}/`,
    `${HOST}/episodes/${slug}-s${pad(s)}x${e}/`,
    `${HOST}/episodes/${slug}-s${s}x${pad(e)}/`,
    `${HOST}/episodes/${slug}-s${s}x${e}/`,
  ];
  for (const url of candidates) {
    const res = await H.fetchText(url, null, 12000);
    if (res.status === 200 && res.text.indexOf('data-post-id') >= 0 && res.text.indexOf('plyer__view') >= 0) return { url: url, html: res.text };
  }
  return null;
}

async function playerSources(postId, optionId, format, referer) {
  const url = `${HOST}/wstrm-player/?id=${encodeURIComponent(postId)}&plyer-id=${encodeURIComponent(optionId)}&format=${encodeURIComponent(format || 'embed')}`;
  const res = await H.fetchText(url, { Referer: referer }, 15000);
  if (res.status !== 200 || !res.text) return null;
  const body = res.text;
  let m = body.match(/<video[^>]+src="([^"]+)"/i)
    || body.match(/<source[^>]+src="([^"]+)"/i)
    || body.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i)
    || body.match(/file\s*:\s*["']([^"']+)["']/i);
  if (!m) return null;
  let stream = H.unescapeHtml(m[1]);
  if (stream.indexOf('//') === 0) stream = 'https:' + stream;
  return stream;
}

async function getStreams(id, type, season, episode) {
  if (!id || !type) return [];
  const meta = await H.tmdbInfo(type, id);
  if (!meta) return [];
  const titles = meta.titles;
  let target = null;
  let pageHtml = null;
  for (const title of titles) {
    const links = await searchSite(title);
    target = pick(links, titles, type);
    if (target) break;
  }
  if (!target) return log('no match'), [];

  let pageUrl = target;
  if (type === 'tv') {
    const ep = await episodeUrl(target, season, episode);
    if (!ep) return log('episode not found'), [];
    pageUrl = ep.url;
    pageHtml = ep.html;
  } else {
    const res = await H.fetchText(pageUrl, null, 15000);
    pageHtml = res.text;
  }
  if (!pageHtml) return [];

  const view = pageHtml.match(/class="[^"]*plyer__view[^"]*"([^>]*)>/i);
  if (!view) return log('no player config'), [];
  const postId = (view[1].match(/data-post-id="(\d+)"/i) || [])[1];
  if (!postId) return [];

  const options = [];
  const re = /<button[^>]*data-id="(opcion-\d+)"[^>]*data-format="([^"]*)"/gi;
  let m;
  while ((m = re.exec(pageHtml))) options.push([m[1], m[2]]);
  if (!options.length) options.push(['opcion-1', (view[1].match(/data-pformat="([^"]*)"/i) || [])[1] || 'embed']);

  const streams = [];
  for (const [optionId, format] of options.slice(0, 5)) {
    const stream = await playerSources(postId, optionId, format, pageUrl);
    if (!stream) continue;
    const quality = H.qualityOf(stream);
    streams.push({
      name: 'VitaminagG',
      title: `${quality} · Latino · ${optionId.replace('-', ' ')}`,
      url: stream,
      quality: quality,
      headers: { Referer: HOST + '/', 'User-Agent': H.UA },
    });
  }
  log(streams.length, 'sources from', pageUrl);
  return streams;
}

module.exports = { getStreams };
