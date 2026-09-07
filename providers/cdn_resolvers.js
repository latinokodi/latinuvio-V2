/**
 * Embed resolvers for uqload, goodstream, vimeos, voe, streamwish, vidhide, dood, ok.ru.
 *
 * NUVIO-SAFE — uses only the global `fetch` (QuickJS), never require('https')/Buffer/axios/process.
 * Self-contained (no local file requires). Resolves embed -> direct m3u8/mp4 and validates the
 * result (probe cache + fake/sample URL pruning) so providers surface only playable links.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

/** QuickJS-safe AbortSignal.timeout → AbortController → undefined. */
function timeoutSignal(ms) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  } catch (e) {}
  try {
    if (typeof AbortController === 'function' && typeof setTimeout === 'function') {
      const c = new AbortController();
      const t = setTimeout(() => { try { c.abort(); } catch (e) {} }, ms);
      return c.signal;
    }
  } catch (e) {}
  return undefined;
}

/** Fetch a page, return its text or null on failure. Global fetch + optional referer. */
async function fetchPage(url, referer = '') {
  try {
    const r = await fetch(url, { headers: referer ? { ...HEADERS, 'Referer': referer } : HEADERS, redirect: 'follow', signal: timeoutSignal(12000) });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
}

/** Dean Edwards packer unpacker, base-62 aware (radix >36). Pure string, no eval. */
function unpackEval(script) {
  const m = script.match(/\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
  if (!m) return null;
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const radix = parseInt(m[2], 10);
  const symtab = m[4].split('|');
  const unbase = (s) => { let v = 0; for (const c of s) { const i = chars.indexOf(c); if (i === -1) return NaN; v = v * radix + i; } return v; };
  return m[1].replace(/\b([0-9a-zA-Z]+)\b/g, (w) => {
    const idx = unbase(w);
    return (!isNaN(idx) && idx < symtab.length && symtab[idx] && symtab[idx] !== '') ? symtab[idx] : w;
  });
}

function extractM3u8(text) {
  const m = text.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
  return m ? m[0].replace(/\\u0026/g, '&').replace(/\\\//g, '/') : null;
}

function isPlayableMediaUrl(u) {
  const s = (u || '').toLowerCase();
  return /\.m3u8(\?|$)/.test(s) || /\.mp4(\?|$)/.test(s) || /\.mpd(\?|$)/.test(s) || /\.mkv(\?|$)/.test(s) || /\/hls2?\//.test(s) || /\/master\.m3u8/.test(s);
}

/** Reject known sample/test/fake/analytics URLs so a bogus "good-looking" link never surfaces. */
function isKnownFakeDirectUrl(u) {
  const s = (u || '').toLowerCase();
  return s.includes('test-videos.co.uk') || s.includes('big_buck_bunny') || s.includes('bigbuckbunny') ||
    s.includes('sample-videos.com') || s.includes('example.com') || s.includes('localhost') ||
    s.includes('.cryptojobss') || s.includes('google-analytics') || s.includes('doubleclick') ||
    s.includes('/troll/master.m3u8');
}

// ── validation cache (url -> {verified, quality, isReal}) ──────────────────
const VALIDATION_CACHE = new Map();
const V_CACHE_MAX = 200, V_CACHE_TTL = 30 * 60 * 1000;
function vGet(k) { const e = VALIDATION_CACHE.get(k); if (!e) return undefined; if (Date.now() > e.exp) { VALIDATION_CACHE.delete(k); return undefined; } return e.value; }
function vSet(k, v) { if (VALIDATION_CACHE.size >= V_CACHE_MAX) VALIDATION_CACHE.delete(VALIDATION_CACHE.keys().next().value); VALIDATION_CACHE.set(k, { value: v, exp: Date.now() + V_CACHE_TTL }); }

/** Infer quality from a master playlist (RESOLUTION, letterbox-aware) or URL. */
function detectHlsQuality(content, url) {
  let best = 0;
  const re = /RESOLUTION=(\d+)x(\d+)/gi; let m;
  while ((m = re.exec(content))) { const w = +m[1], h = +m[2]; const eq = Math.max(h, Math.round(w * 9 / 16)); if (eq > best) best = eq; }
  if (best >= 2160) return '4K';
  if (best >= 1080) return '1080p';
  if (best >= 720) return '720p';
  const um = (url || '').match(/[_-](\d{3,4})p/i);
  return um ? um[1] + 'p' : (best ? best + 'p' : '1080p');
}

/**
 * Validate a resolved stream: Range-probe the URL (cheap), sniff HLS quality,
 * mark expired/403 as not verified. Cached per url. Never throws.
 */
async function validateStream(stream) {
  const u = stream && stream.url;
  if (!u) return stream;
  if (isKnownFakeDirectUrl(u)) return { ...stream, verified: false, isReal: false };
  const cached = vGet(u);
  if (cached) return { ...stream, ...cached };
  let verified = false, quality = '1080p', isReal = false;
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Range': 'bytes=0-0', ...(stream.headers || {}) }, redirect: 'follow', signal: timeoutSignal(6000) });
    if (r.ok || r.status === 206) {
      verified = true; isReal = true;
      if (/\.m3u8(\?|$)/.test(u)) { const t = await r.text().catch(() => ''); const q = detectHlsQuality(t, u); if (q) quality = q; }
    }
  } catch (e) {}
  const verdict = { verified, quality, isReal };
  vSet(u, verdict);
  return { ...stream, ...verdict };
}

// ── per-host resolvers (embedUrl -> stream | null) ─────────────────────────

async function resolveUqload(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  let sm = html.match(/sources\s*:\s*\[([^\]]+)\]/);
  if (!sm) {
    const pm = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
    if (pm) { const up = unpackEval(pm[0]); if (up) sm = up.match(/sources\s*:\s*\[([^\]]+)\]/); }
  }
  if (!sm) return null;
  const url = extractM3u8(sm[1]) || sm[1].match(/https?:\/\/[^\s"'<>]+/)?.[0];
  if (!url || !url.startsWith('http')) return null;
  return { url, server: 'Uqload', quality: '1080p', headers: { 'Referer': 'https://uqload.com/', 'User-Agent': UA } };
}

async function resolveGoodstream(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const fm = html.match(/file\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i);
  if (fm) return { url: fm[1], server: 'GoodStream', quality: '1080p', headers: { 'Referer': 'https://goodstream.one/', 'Origin': 'https://goodstream.one', 'User-Agent': UA } };
  const m3 = extractM3u8(html);
  return m3 ? { url: m3, server: 'GoodStream', quality: '1080p', headers: { 'Referer': 'https://goodstream.one/', 'User-Agent': UA } } : null;
}

async function resolveVimeos(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const pm = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
  if (pm) { const up = unpackEval(pm[0]); if (up) { const url = extractM3u8(up); if (url) return { url, server: 'Vimeos', quality: '1080p', headers: { 'Referer': 'https://vimeos.net/', 'Origin': 'https://vimeos.net', 'User-Agent': UA } }; } }
  const m3 = extractM3u8(html);
  return m3 ? { url: m3, server: 'Vimeos', quality: '1080p', headers: { 'Referer': 'https://vimeos.net/', 'User-Agent': UA } } : null;
}

async function resolveAudinifer(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const pm = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
  if (pm) {
    const up = unpackEval(pm[0]);
    if (up) {
      const m3u8 = extractM3u8(up);
      if (m3u8) return { url: m3u8, server: 'Audinifer', quality: '1080p', headers: { Referer: embedUrl, 'User-Agent': UA } };
      const f = up.match(/(?:file|src)\s*[:=]\s*["']([^"']+)["']/i);
      if (f && f[1] && f[1].startsWith('http')) return { url: f[1], server: 'Audinifer', quality: '1080p', headers: { Referer: embedUrl, 'User-Agent': UA } };
    }
  }
  const m3 = extractM3u8(html);
  return m3 ? { url: m3, server: 'Audinifer', quality: '1080p', headers: { Referer: embedUrl, 'User-Agent': UA } } : null;
}

/** VOE / voe-unblocker: ROT13 -> strip noise -> base64 -> -3 shift -> reverse -> base64 -> JSON.source */
async function resolveVoe(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  if (html.includes('window.location.href') && html.length < 2000) {
    const rm = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
    if (rm) return resolveVoe(rm[1]);
  }
  const m = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
  let enc = null;
  if (m) { try { enc = JSON.parse(m[1].trim()); enc = Array.isArray(enc) ? enc[0] : enc; } catch (e) { enc = null; } }
  if (typeof enc === 'string') {
    try {
      let d = enc.replace(/[a-zA-Z]/g, (c) => { const code = c.charCodeAt(0), lim = c <= 'Z' ? 90 : 122, s = code + 13; return String.fromCharCode(lim >= s ? s : s - 26); });
      ['@$', '^^', '~@', '%?', '*~', '!!', '#&'].forEach((n) => { d = d.split(n).join(''); });
      const s1 = atob(d);
      let sh = '';
      for (let i = 0; i < s1.length; i++) sh += String.fromCharCode(s1.charCodeAt(i) - 3);
      const data = JSON.parse(atob(sh.split('').reverse().join('')));
      const u = data && (data.source || data.direct_access_url);
      if (u) return { url: u, server: 'VOE', quality: '1080p', headers: { 'User-Agent': UA, Referer: embedUrl } };
    } catch (e) {}
  }
  const raw = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
  return raw ? { url: raw[1], server: 'VOE', quality: '1080p', headers: { 'User-Agent': UA, Referer: embedUrl } } : null;
}

/** StreamWish/hlswish/wishfast/awish/filelions: 32-hex MD5 beacon `/dl?op=view&...&hls4=1`. */
async function resolveStreamWish(embedUrl) {
  const rawId = ((embedUrl.match(/\/e\/([^/]+)/i) || [])[1] || embedUrl.split('/').pop() || '').replace(/\.html$/, '');
  const host = (embedUrl.match(/^(https?:\/\/[^/]+)/) || [])[1] || 'https://hlswish.com';
  const mirrors = [host, 'https://streamwish.to', 'https://awish.pro', 'https://wishfast.top', 'https://hanerix.com'];
  for (const base of mirrors) {
    try {
      const mirror = `${base}/e/${rawId}`;
      const html = await fetchPage(mirror, mirror);
      if (!html) continue;
      let m3u8 = null;
      const hash = html.match(/[0-9a-f]{32}/i);
      if (hash) {
        const dl = `${new URL(mirror).origin}/dl?op=view&file_code=${rawId}&hash=${hash[0]}&embed=1&referer=&adb=1&hls4=1`;
        try { const t = await fetchPage(dl, mirror); if (t) { const mm = t.match(/https?:\/\/[^"']+\.m3u8[^"']*/); if (mm) m3u8 = mm[0]; } } catch (e) {}
      }
      if (!m3u8) {
        const pm = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[a-z]\)[\s\S]*?\.split\('\|'\)[^)]*\)\)/);
        if (pm) { const up = unpackEval(pm[0]); if (up) m3u8 = extractM3u8(up); }
      }
      if (!m3u8) { const fm = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i); if (fm) m3u8 = fm[1]; }
      if (!m3u8) m3u8 = extractM3u8(html);
      if (m3u8) return { url: m3u8, server: 'StreamWish', quality: '1080p', headers: { 'User-Agent': UA, Referer: mirror, 'Origin': new URL(mirror).origin } };
    } catch (e) {}
  }
  return null;
}

/** VidHide/dintezuvio/minochinos: packer -> hls4/hls2. */
async function resolveVidHide(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const block = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^)]*\)\s*\)/);
  if (block) {
    const up = unpackEval(block[0]);
    if (up) {
      const hls = (up.match(/"hls4"\s*:\s*"([^"]+)"/) || up.match(/"hls2"\s*:\s*"([^"]+)"/))[1];
      if (hls) { const origin = new URL(embedUrl).origin; return { url: hls.startsWith('http') ? hls : origin + hls, server: 'VidHide', quality: '1080p', headers: { 'User-Agent': UA, Referer: origin + '/' } }; }
    }
  }
  const m3 = extractM3u8(html);
  return m3 ? { url: m3, server: 'VidHide', quality: '1080p', headers: { 'User-Agent': UA, Referer: embedUrl } } : null;
}

/** Dood/ds2play: MD5 pass_md5 challenge. */
async function resolveDood(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const host = (embedUrl.match(/^(https?:\/\/[^/]+)/) || [])[1] || 'https://dood.to';
  const m = html.match(/\$\.get\(\s*["']\/pass_md5\/([^"']+)["']/);
  if (!m) { const m3 = extractM3u8(html); return m3 ? { url: m3, server: 'Dood', quality: '1080p', headers: { 'User-Agent': UA, Referer: embedUrl } } : null; }
  try {
    const token = (await fetchPage(`${host}/pass_md5/${m[1]}`, embedUrl) || '').trim();
    if (token) return { url: `${token}${Math.random().toString(36).substring(2, 12)}?token=${m[1]}&expiry=${Date.now()}`, server: 'Dood', quality: '1080p', headers: { 'User-Agent': UA, Referer: `${host}/` } };
  } catch (e) {}
  return null;
}

/** OK.ru / odnoklassniki: videoPlayerMetadata POST. */
async function resolveOkru(embedUrl) {
  const id = (embedUrl.match(/(?:ok\.ru|odnoklassniki\.ru)\/(?:videoembed|video|live)\/(\d+)/i) || [])[1];
  const mid = id || (embedUrl.match(/[?&]mid=(\d+)/i) || [])[1];
  if (!mid) return null;
  try {
    const res = await fetch('https://www.ok.ru/dk', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': `https://ok.ru/videoembed/${mid}`, 'Origin': 'https://ok.ru', 'X-Requested-With': 'XMLHttpRequest' },
      body: `cmd=videoPlayerMetadata&mid=${mid}`,
      signal: timeoutSignal(8000),
    });
    const data = await res.json().catch(() => null);
    if (!data || data.error) return null;
    const u = data.hlsManifestUrl || data.hlsMasterPlaylistUrl || (data.videos && data.videos[0] && data.videos[0].url);
    return u ? { url: u, server: 'OK.ru', quality: '1080p', headers: { 'User-Agent': UA, 'Referer': 'https://ok.ru/' } } : null;
  } catch (e) { return null; }
}

/** Bysezoxexe resolver: SPA with an embedded token; probe API endpoints for the stream. */
async function resolveBysezoxexe(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const token = ((html.match(/["']token["']\s*:\s*["']([^"']+)["']/) || [])[1])
    || ((html.match(/["'](?:fileId|videoId|file_code|hash)["']\s*:\s*["']([^"']+)["']/) || [])[1])
    || ((embedUrl.match(/\/([a-z0-9]{8,})$/i) || [])[1]);
  if (!token) return null;
  const origin = 'https://bysezoxexe.com';
  const can = [`${origin}/api/video/${token}`, `${origin}/api/play/${token}`, `${origin}/api/stream/${token}`, `${origin}/api/get/${token}`];
  for (const u of can) {
    const t = await fetchPage(u, origin + '/');
    if (!t) continue;
    const m3 = extractM3u8(t);
    if (m3) return { url: m3, server: 'Bysezoxexe', quality: '1080p', headers: { Referer: origin + '/', 'User-Agent': UA } };
    try {
      const j = JSON.parse(t);
      const f = j.url || j.file || j.stream_url || j.streaming_url || (j.data && (j.data.url || j.data.file || j.data.streaming_url));
      if (f && f.startsWith('http')) return { url: f, server: 'Bysezoxexe', quality: '1080p', headers: { Referer: origin + '/', 'User-Agent': UA } };
    } catch (e) {}
  }
  return null;
}

/** Vidara resolver: jwplayer loads streaming_url from /api/stream?filecode=<id>. */
async function resolveVidara(embedUrl) {
  const html = await fetchPage(embedUrl);
  if (!html) return null;
  const id = ((embedUrl.match(/\/e\/([^/]+)/i) || [])[1]) || ((embedUrl.match(/\/player\/([^/]+)/i) || [])[1]);
  if (!id) return null;
  const api = `https://vidara.so/api/stream?filecode=${encodeURIComponent(id)}`;
  try {
    const r = await fetch(api, { headers: { 'User-Agent': UA, 'Referer': embedUrl, 'Accept': 'application/json' }, signal: timeoutSignal(8000) });
    if (!r.ok) return null;
    const j = await r.json();
    const f = j.streaming_url || j.file || j.url || j.source || (j.data && (j.data.streaming_url || j.data.url || j.data.file));
    if (f && f.startsWith('http')) return { url: f, server: 'Vidara', quality: '1080p', headers: { Referer: embedUrl, 'User-Agent': UA } };
  } catch (e) {}
  return null;
}

/**
 * Generic dispatcher: detects host and calls the matching resolver, validates the result.
 */
async function resolveEmbed(embedUrl) {
  const u = (embedUrl || '').toLowerCase();
  let s = null;
  if (u.includes('uqload') || u.includes('oneupload')) s = await resolveUqload(embedUrl);
  else if (u.includes('goodstream')) s = await resolveGoodstream(embedUrl);
  else if (u.includes('vimeos')) s = await resolveVimeos(embedUrl);
  else if (u.includes('bysezoxexe')) s = await resolveBysezoxexe(embedUrl);
  else if (u.includes('audinifer')) s = await resolveAudinifer(embedUrl);
  else if (u.includes('vidara')) s = await resolveVidara(embedUrl);
  else if (u.includes('voe')) s = await resolveVoe(embedUrl);
  else if (u.includes('streamwish') || u.includes('hlswish') || u.includes('wishfast') || u.includes('awish') || u.includes('filelions') || u.includes('wishembed')) s = await resolveStreamWish(embedUrl);
  else if (u.includes('vidhide') || u.includes('dintezuvio') || u.includes('minochinos')) s = await resolveVidHide(embedUrl);
  else if (u.includes('dood') || u.includes('ds2play')) s = await resolveDood(embedUrl);
  else if (u.includes('ok.ru') || u.includes('odnoklassniki')) s = await resolveOkru(embedUrl);
  if (s && s.url && s.url !== embedUrl && !isKnownFakeDirectUrl(s.url)) return await validateStream(s);
  return null;
}

module.exports = {
  resolveUqload, resolveGoodstream, resolveVimeos, resolveBysezoxexe, resolveAudinifer,
  resolveVidara, resolveVoe, resolveStreamWish, resolveVidHide, resolveDood, resolveOkru,
  resolveEmbed, validateStream, isPlayableMediaUrl, isKnownFakeDirectUrl, detectHlsQuality, fetchPage,
};
