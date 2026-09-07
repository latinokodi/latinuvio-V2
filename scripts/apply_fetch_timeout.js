#!/usr/bin/env node
/**
 * apply_fetch_timeout.js — upgrade the inline __FETCH_RETRY__ global-fetch
 * wrapper (prepended to deployed providers) so it ALSO attaches a hard abort
 * deadline per request (QuickJS-safe AbortSignal), and does NOT retry an Aborted
 * request (so a hung host fails fast instead of stalling for retries times timeout).
 *
 * Before/after are strict supersets: before only retried; after retries + aborts.
 * Originals are backed up to scripts/.fetch_timeout_backup/<file>.
 *
 * Usage: node scripts/apply_fetch_timeout.js
 */

const fs = require('fs');
const path = require('path');

const PROVIDERS_DIR = path.join(__dirname, '..', 'providers');
const BACKUP_DIR = path.join(__dirname, '.fetch_timeout_backup');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const NEW_WRAPPER = [
  '/* __FETCH_RETRY__ */',
  '(function () {',
  "  var g = (typeof globalThis !== 'undefined') ? globalThis",
  "    : (typeof self !== 'undefined') ? self",
  "    : (typeof global !== 'undefined') ? global",
  "    : (typeof window !== 'undefined') ? window",
  '    : null;',
  "  if (!g || typeof g.fetch !== 'function' || g.fetch.__RETRY_WRAPPED__) return;",
  '  var _f = g.fetch;',
  '  function _timeoutSignal(ms) {',
  '    try {',
  "      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);",
  '    } catch (e) {}',
  '    try {',
  "      if (typeof AbortController === 'function' && typeof setTimeout === 'function') {",
  '        var c = new AbortController();',
  '        var t = setTimeout(function () { try { c.abort(); } catch (e) {} }, ms);',
  '        return c.signal;',
  '      }',
  '    } catch (e) {}',
  '    return undefined;',
  '  }',
  '  function _retryFetch(url, options) {',
  "    if (options && typeof options === 'object' && !options.signal) {",
  "      var t = (typeof options.timeout === 'number') ? options.timeout : 15000;",
  '      if (t > 0) { options = Object.assign({}, options, { signal: _timeoutSignal(t) }); delete options.timeout; }',
  '    }',
  '    return new Promise(function (resolve, reject) {',
  '      var attempt = 0, retries = 2, base = 400, max = 3200;',
  '      function go() {',
  '        _f(url, options).then(function (res) {',
  '          if (res && (res.status === 429 || res.status === 408 || (res.status >= 500 && res.status < 600)) && attempt < retries) {',
  '            attempt++;',
  '            setTimeout(go, Math.min(max, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150));',
  '          } else { resolve(res); }',
  '        }).catch(function (err) {',
  '          if (err && err.name === "AbortError") { reject(err); return; }',
  '          if (attempt < retries) { attempt++; setTimeout(go, Math.min(max, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150)); }',
  '          else { reject(err); }',
  '        });',
  '      }',
  '      go();',
  '    });',
  '  }',
  '  _retryFetch.__RETRY_WRAPPED__ = true;',
  '  try { g.fetch = _retryFetch; } catch (e) {}',
  '})();',
].join('\n');

const BLOCK_RE = /\/\* __FETCH_RETRY__ \*\/[\s\S]*?\}\)\(\);/;

let changed = 0, skipped = 0;
for (const f of fs.readdirSync(PROVIDERS_DIR)) {
  if (!f.endsWith('.js')) continue;
  const filePath = path.join(PROVIDERS_DIR, f);
  let code;
  try { code = fs.readFileSync(filePath, 'utf8'); } catch (e) { continue; }
  if (!code.includes('/* __FETCH_RETRY__ */')) { skipped++; continue; }
  if (code.includes('function _timeoutSignal')) { skipped++; continue; }   // already upgraded
  if (!BLOCK_RE.test(code)) { console.log('SKIP (no match): ' + f); skipped++; continue; }
  const bak = path.join(BACKUP_DIR, f);
  if (fs.existsSync(bak)) fs.writeFileSync(bak, code);
  const newCode = code.replace(BLOCK_RE, NEW_WRAPPER);
  fs.writeFileSync(filePath, newCode);
  changed++;
  console.log('OK: ' + f);
}
console.log('\nApplied to ' + changed + ' provider(s), skipped ' + skipped + ' (no marker / already upgraded / not js).');
