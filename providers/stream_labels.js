/**
 * stream_labels.js — Rich stream metadata parser for Latinuvio V2
 *
 * Parses video URLs and stream metadata to produce premium two-line labels
 * showing codec, audio, HDR, source, bit depth, and more.
 *
 * Integration point: call buildStreamLabel(stream, providerName) where
 * the stream object has { url, quality, serverName/serverLabel, lang/language }.
 */

// ── Quality weight map for Nuvio's built-in sorter ──
var Q_WEIGHTS = {
  '4K': 100, '2160p': 95, '1440p': 85, '1080p': 80,
  '720p': 70, '480p': 60, '360p': 50, 'Auto': 30, 'HD': 40, 'Unknown': 0
};

// ── URL-based metadata extraction ──

function parseQuality(url, fallback) {
  var t = (url || '').toLowerCase();
  if (/2160|4k|uhd/i.test(t)) return '2160p';
  if (/1440|2k/i.test(t)) return '1440p';
  if (/1080/i.test(t)) return '1080p';
  if (/720/i.test(t)) return '720p';
  if (/480/i.test(t)) return '480p';
  if (/360/i.test(t)) return '360p';
  return fallback || 'HD';
}

function parseCodec(url, text) {
  var t = ((text || '') + ' ' + (url || '')).toLowerCase();
  if (/av1/i.test(t)) return 'AV1';
  if (/hevc|x265|h\.?265/i.test(t)) return 'x265';
  if (/x264|h\.?264/i.test(t)) return 'H.264';
  if (/vp9/i.test(t)) return 'VP9';
  return '';
}

function parseAudio(text) {
  var t = (text || '').toLowerCase();
  if (/dolby\s*atmos|atmos/i.test(t)) return 'Atmos';
  if (/truehd/i.test(t)) {
    var ch = t.match(/truehd\s*(7\.1|5\.1)/i);
    return 'TrueHD' + (ch ? ' ' + ch[1] : '');
  }
  if (/dts[\s.-]?hd/i.test(t)) return 'DTS-HD';
  if (/dts[\s.-]?x/i.test(t)) return 'DTS:X';
  if (/dts/i.test(t)) return 'DTS';
  if (/ddp|eac3|e-ac3/i.test(t)) {
    var ch2 = t.match(/(7\.1|5\.1|2\.0)/);
    return 'EAC3' + (ch2 ? ' ' + ch2[1] : '');
  }
  if (/dd\s*5\.1|ac3\s*5\.1|dolby\s*digital|dolby\s*5/i.test(t)) return 'DD 5.1';
  if (/dd\s*2\.0|ac3\s*2\.0/i.test(t)) return 'DD 2.0';
  if (/aac/i.test(t)) {
    var ch3 = t.match(/(7\.1|5\.1|2\.0)/);
    return 'AAC' + (ch3 ? ' ' + ch3[1] : '');
  }
  if (/opus/i.test(t)) return 'Opus';
  if (/mp3|mpeg/i.test(t)) return 'MP3';
  return '';
}

function parseHDR(text) {
  var t = (text || '').toLowerCase();
  if (/dolby\s*vision|dovi/i.test(t)) return 'DV';
  if (/hdr10\+/i.test(t)) return 'HDR10+';
  if (/hdr10/i.test(t)) return 'HDR10';
  if (/hdr/i.test(t)) return 'HDR';
  if (/sdr/i.test(t)) return 'SDR';
  if (/10[\s.-]?bit|hi10/i.test(t)) return '10-bit';
  return '';
}

function parseSource(text) {
  var t = (text || '').toLowerCase();
  if (/web[\s.-]?dl|webdl/i.test(t)) return 'WEB-DL';
  if (/webrip/i.test(t)) return 'WEBRip';
  if (/blu[\s.-]?ray|bluray|bdrip|brrip/i.test(t)) return 'BluRay';
  if (/hdrip/i.test(t)) return 'HDRip';
  if (/hdtv/i.test(t)) return 'HDTV';
  if (/dvdrip/i.test(t)) return 'DVDRip';
  if (/camrip|cam\b/i.test(t)) return 'CAM';
  if (/ts\b|telesync/i.test(t)) return 'TS';
  return '';
}

function parseSize(text) {
  var m = (text || '').match(/\[?([\d.]+)\s*(GB|MB|gb|mb)\]?/i);
  if (!m) return '';
  return parseFloat(m[1]).toFixed(1) + ' ' + m[2].toUpperCase();
}

function parseLanguage(text) {
  var t = (text || '').toLowerCase();
  var langs = [];
  if (/latino|español\s*latino|esp\s*lat|audio\s*latino/i.test(t)) langs.push('Latino');
  else if (/castellano|español|spanish|espa/i.test(t)) langs.push('Castellano');
  if (/subtitulado|vose|sub\b/i.test(t) && !/dub/i.test(t)) langs.push('Subtitulado');
  if (/english|inglés|eng\b/i.test(t)) langs.push('English');
  if (/dual\s*audio/i.test(t)) langs = ['Dual Audio'];
  if (/multi\s*audio/i.test(t)) langs = ['Multi Audio'];
  return langs;
}

function parseService(text) {
  var t = (text || '').toLowerCase();
  if (/netflix|nf\b/i.test(t)) return 'Netflix';
  if (/amazon|amzn|prime\s*video/i.test(t)) return 'Prime Video';
  if (/disney\+|disney\s*plus/i.test(t)) return 'Disney+';
  if (/apple\s*tv\+?|aptv/i.test(t)) return 'Apple TV+';
  if (/hbo\s*max/i.test(t)) return 'Max';
  if (/\bhbo\b/i.test(t)) return 'HBO';
  if (/hulu/i.test(t)) return 'Hulu';
  if (/paramount\+?/i.test(t)) return 'Paramount+';
  if (/peacock/i.test(t)) return 'Peacock';
  return '';
}

function parseIMAX(text) {
  return /\bimax\b/i.test(text || '') ? 'IMAX' : '';
}

function parseFPS(text) {
  var m = (text || '').match(/\b(60|50|30|25|24)\s*fps\b/i);
  return m ? m[1] + 'FPS' : '';
}

function parseHost(url, server) {
  var u = (url || '').toLowerCase();
  var s = (server || '').toLowerCase();
  if (/goodstream|gs\.one/i.test(u + s)) return 'GoodStream';
  if (/vimeos|vms\.sh/i.test(u + s)) return 'Vimeos';
  if (/streamwish|hlswish|hglink|embedwish|awish|strwish|wishfast|dwish|filelions|wishembed/i.test(u + s)) return 'StreamWish';
  if (/filemoon|moonalu|moonembed|bysedikamoum|fmoon/i.test(u + s)) return 'Filemoon';
  if (/vidhide|vidhidepro|vidhidevip|vadisov|vaiditv|vhaudm|dintezuvio|vedonm/i.test(u + s)) return 'VidHide';
  if (/voe\.sx|voe-sx|voex|marissashare|cloudwindow/i.test(u + s)) return 'VOE';
  if (/doodstream|dood\.|ds2video/i.test(u + s)) return 'DoodStream';
  if (/uqload/i.test(u + s)) return 'Uqload';
  if (/ok\.ru|okru/i.test(u + s)) return 'OK.ru';
  if (/pixeldrain/i.test(u + s)) return 'Pixeldrain';
  return s || server || '';
}

// ── Label builder ──

function buildStreamLabel(stream, providerName) {
  var url = stream.url || '';
  var quality = stream.quality || parseQuality(url, 'HD');
  var server = stream.serverName || stream.serverLabel || stream.servername || '';
  var language = stream.lang || stream.language || stream.audio || '';
  var rawText = stream.rawText || stream.description || stream.label || '';
  var combined = url + ' ' + rawText + ' ' + (server || '');
  var isReal = stream.isReal === true;
  var isVerified = stream.verified === true;
  var checkMark = isReal ? ' \u2705' : '';

  // Parse metadata
  var codec = parseCodec(url, combined);
  var audio = parseAudio(combined);
  var hdr = parseHDR(combined);
  var source = parseSource(combined);
  var size = parseSize(combined);
  var imax = parseIMAX(combined);
  var fps = parseFPS(combined);
  var service = parseService(combined);
  var host = parseHost(url, server);
  var langs = parseLanguage(language || combined);

  // Both lines actually empty means we fall back
  if (!langs.length) langs = ['Latino'];

  // ── Build line 1 (name): Provider • Quality • IMAX • Service ──
  var nameParts = [providerName, quality.toUpperCase()];
  if (imax) nameParts.push(imax);
  if (service) nameParts.push(service);
  if (host) nameParts.push(host);
  var name = nameParts.join(' • ') + checkMark;

  // ── Build line 2 (title): multi-line with metadata ──
  var line1Parts = [];
  if (langs.length) line1Parts.push(langs.join(' • '));
  if (size) line1Parts.push(size);
  var line1 = line1Parts.join(' • ');

  var line2Parts = [];
  if (source) line2Parts.push(source);
  if (codec) line2Parts.push(codec);
  if (hdr) line2Parts.push(hdr);
  if (audio) line2Parts.push(audio);
  if (fps) line2Parts.push(fps);
  var line2 = line2Parts.join(' • ');

  var title;
  if (line1 && line2) title = line1 + '\n' + line2;
  else if (line1) title = line1;
  else if (line2) title = line2;
  else title = langs.join(' • ') + ' - ' + (host || server || 'Server');

  // Quality weight for Nuvio's sorter
  var qNorm = quality.toLowerCase().replace(/p$/i, '');
  var resWeight = Q_WEIGHTS[quality] || Q_WEIGHTS['HD'];

  return {
    name: name,
    title: title,
    quality: quality,
    _resWeight: resWeight,
    _sizeWeight: size ? parseFloat(size) * (size.toUpperCase().includes('GB') ? 1024 : 1) : 0
  };
}

// Export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildStreamLabel: buildStreamLabel,
    parseQuality: parseQuality,
    parseCodec: parseCodec,
    parseAudio: parseAudio,
    parseHDR: parseHDR,
    parseSource: parseSource,
    parseSize: parseSize,
    parseLanguage: parseLanguage,
    parseService: parseService,
    Q_WEIGHTS: Q_WEIGHTS
  };
}
