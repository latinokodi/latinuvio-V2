/**
 * Cuevana — wv3.cuevana3.eu (Next.js app; data lives in __NEXT_DATA__).
 * Verified live 2026-11-10:
 *   /search?q=<title>          -> props.pageProps.movies[] {TMDbId, titles.name, url.slug}
 *   /ver-pelicula/<slug>       -> props.pageProps.thisMovie.videos.{latino,spanish,english}
 *   <result> = /player.php?h=  -> HTML containing the real embed (voe/streamwish/...)
 */
const H = require('./provider_helpers.js');

const HOST = 'https://wv3.cuevana3.eu';
const HOSTS = /(voe\.sx|voe\.|streamwish|strwish|hlswish|awish|embedwish|vidhide|minochinos|dintezuvio|filemoon|ok\.ru|streamtape|dood|uqload|vimeos|mixdrop)/i;
const LANG_LABELS = { latino: 'Latino', spanish: 'Castellano', english: 'Inglés', japanese: 'Japonés' };
const DEBUG = false;
function log() { if (DEBUG) console.log.apply(console, ['[Cuevana]'].concat([].slice.call(arguments))); }

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

async function searchSite(query) {
  const res = await H.fetchText(`${HOST}/search?q=${encodeURIComponent(query)}`, null, 15000);
  const data = nextData(res.text);
  if (!data) return [];
  const pageProps = (data.props || {}).pageProps || {};
  return Array.isArray(pageProps.movies) ? pageProps.movies : [];
}

function pickMovie(movies, id, title) {
  const wantedId = String(id);
  for (const movie of movies) {
    if (String(movie.TMDbId) === wantedId) return movie;
  }
  const wanted = H.slugSlug(title);
  if (wanted) {
    for (const movie of movies) {
      const name = H.slugSlug(((movie.titles || {}).name) || '');
      if (name && (name.indexOf(wanted) >= 0 || wanted.indexOf(name) >= 0)) return movie;
    }
  }
  return null;
}

async function playerEmbed(playerUrl) {
  const res = await H.fetchText(playerUrl, { Referer: HOST + '/' }, 15000);
  const re = /https?:\/\/[^\s"'<>]+/g;
  let m;
  while ((m = re.exec(res.text))) {
    if (HOSTS.test(m[0])) return m[0].replace(/&amp;/g, '&');
  }
  return null;
}

async function getStreams(id, type, season, episode) {
  if (!id || !type || type !== 'movie') return [];
  const meta = await H.tmdbInfo(type, id);
  if (!meta) return [];
  let target = null;
  for (const title of meta.titles) {
    const movies = await searchSite(title);
    target = pickMovie(movies, id, title);
    if (target) break;
  }
  if (!target) return log('no match'), [];

  const slug = ((target.url || {}).slug) || '';
  const name = String(slug).split('/').filter(Boolean).pop();
  if (!name) return [];
  const detail = await H.fetchText(`${HOST}/ver-pelicula/${name}`, null, 15000);
  const data = nextData(detail.text);
  if (!data) return [];
  const movie = ((data.props || {}).pageProps || {}).thisMovie || {};
  const videos = movie.videos || {};

  const streams = [];
  for (const langKey of Object.keys(videos)) {
    const label = LANG_LABELS[langKey] || langKey;
    for (const item of (videos[langKey] || []).slice(0, 3)) {
      if (streams.length >= 6) break;
      const playerUrl = item && item.result;
      if (!playerUrl) continue;
      const embed = await playerEmbed(playerUrl);
      if (!embed) continue;
      const resolved = await H.resolveEmbed(embed);
      if (!resolved || !resolved.url) continue;
      const quality = resolved.quality || H.qualityOf(resolved.url);
      streams.push({
        name: 'Cuevana',
        title: `${quality} · ${label} · ${resolved.server || 'Online'}`,
        url: resolved.url,
        quality: quality,
        headers: resolved.headers || {},
      });
    }
  }
  log(streams.length, 'sources for', name);
  return streams;
}

module.exports = { getStreams };


