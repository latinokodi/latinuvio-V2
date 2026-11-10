/**
 * MegaDedeOficial — megadede.mobi.
 *
 * Verified live 2026-11-10:
 *   GET /vidurl/<imdb>/                (movie)
 *   GET /vidurl/<imdb>-<S>x<EE>/       (episode, two-digit episode)
 *   -> page contains POW_CHALLENGE, POW_DIFFICULTY, POW_SALT and
 *      `const dataLink = [...]` with AES-CBC encrypted embed links.
 *   PoW: sha256(challenge+nonce) hex starts with `difficulty` zeros;
 *        key = sha256(challenge+nonce+salt), iv = first 16 bytes of link.
 *   resolve the decrypted embeds with cdn_resolvers.
 */
const H = require('./provider_helpers.js');
const CryptoJS = require('crypto-js');

const HOST = 'https://megadede.mobi';
const DEBUG = false;
function log() { if (DEBUG) console.log.apply(console, ['[MegaDede]'].concat([].slice.call(arguments))); }

const LANG = { LAT: 'Latino', ESP: 'Castellano', CAST: 'Castellano', SUB: 'Subtitulado', VOSE: 'Subtitulado' };

async function imdbId(id, type) {
  if (String(id).indexOf('tt') === 0) return String(id);
  const data = await H.fetchJson(`https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${H.TMDB_KEY}`, null, 8000);
  return data && data.imdb_id ? data.imdb_id : null;
}

function solvePow(challenge, difficulty, salt) {
  const prefix = new Array(difficulty + 1).join('0');
  let nonce = 0;
  for (;;) {
    const hash = CryptoJS.SHA256(challenge + nonce).toString(CryptoJS.enc.Hex);
    if (hash.indexOf(prefix) === 0) {
      return { nonce: nonce, key: CryptoJS.SHA256(challenge + nonce + salt) };
    }
    nonce += 1;
    if (nonce > 20000000) return null;
  }
}

function aesDecrypt(encLink, key) {
  try {
    const raw = CryptoJS.enc.Base64.parse(encLink);
    const iv = CryptoJS.lib.WordArray.create(raw.words.slice(0, 4), 16);
    const ciphertext = CryptoJS.lib.WordArray.create(raw.words.slice(4), raw.sigBytes - 16);
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return /^https?:\/\//i.test(text) ? text : null;
  } catch (e) { return null; }
}

async function getStreams(id, type, season, episode) {
  if (!id || !type) return [];
  const imdb = await imdbId(id, type);
  if (!imdb) return log('no imdb id'), [];

  let path = `/vidurl/${imdb}/`;
  if (type === 'tv') {
    const ep = String(parseInt(episode, 10) || 1).padStart(2, '0');
    path = `/vidurl/${imdb}-${parseInt(season, 10) || 1}x${ep}/`;
  }
  const page = await H.fetchText(HOST + path, { Referer: HOST + '/' }, 15000);
  if (page.status !== 200) return log('page', page.status), [];

  const challenge = (page.text.match(/POW_CHALLENGE\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const difficulty = parseInt((page.text.match(/POW_DIFFICULTY\s*=\s*(\d+)/) || [])[1], 10);
  const salt = (page.text.match(/POW_SALT\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const dataLinkRaw = (page.text.match(/(?:const|let)\s+dataLink\s*=\s*(\[[\s\S]*?\]);/) || [])[1];
  if (!challenge || !difficulty || !salt || !dataLinkRaw) return log('no pow payload'), [];

  const solution = solvePow(challenge, difficulty, salt);
  if (!solution) return [];
  let dataLink = [];
  try { dataLink = JSON.parse(dataLinkRaw); } catch (e) { return []; }

  const streams = [];
  const seen = new Set();
  for (const item of dataLink) {
    const lang = LANG[String(item.video_language || '').toUpperCase()] || 'Latino';
    for (const embed of item.sortedEmbeds || []) {
      if (embed.type && embed.type !== 'video') continue;
      if (!embed.link) continue;
      const url = aesDecrypt(embed.link, solution.key);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const resolved = await H.resolveEmbed(url);
      if (!resolved || !resolved.url) continue;
      const quality = resolved.quality || H.qualityOf(resolved.url);
      streams.push({
        name: 'MegaDedeOficial',
        title: `${quality} · ${lang} · ${embed.servername || resolved.server || 'Online'}`,
        url: resolved.url,
        quality: quality,
        headers: resolved.headers || {},
      });
      if (streams.length >= 8) break;
    }
  }
  log(streams.length, 'sources for', path);
  return streams;
}

module.exports = { getStreams };
