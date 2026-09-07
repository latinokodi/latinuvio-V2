#!/usr/bin/env node
/**
 * scripts/apply_fetch_retry.js
 *
 * Prepend a self-contained global-`fetch` retry/backoff wrapper to every Nuvio
 * provider in providers/. This covers ALL providers without requiring them to
 * require() a shared module (which breaks the Nuvio QuickJS runtime).
 *
 * The wrapper reassigns the global `fetch` so every bare fetch(...) call in the
 * provider automatically retries on transient failures (HTTP 408/429/5xx and
 * network errors) with exponential backoff + jitter. It's idempotent.
 *
 * Usage: node scripts/apply_fetch_retry.js
 */

const fs = require('fs');
const path = require('path');

const PROV_DIR = path.join(__dirname, '..', 'providers');

// files that are shared helpers / already-handled / backups
const SKIP = new Set([
  'fetch_policy.js',   // the explicit reusable helper
  'cdn_resolvers.js',
  'stream_labels.js',
  'embed69.js',        // already has explicit retryFetch on its HTTP paths
]);

const MARKER = '/* __FETCH_RETRY__ */';

const WRAPPER = `/* __FETCH_RETRY__ */
(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis
    : (typeof self !== 'undefined') ? self
    : (typeof global !== 'undefined') ? global
    : (typeof window !== 'undefined') ? window
    : null;
  if (!g || typeof g.fetch !== 'function' || g.fetch.__RETRY_WRAPPED__) return;
  var _f = g.fetch;
  function _retryFetch(url, options) {
    return new Promise(function (resolve, reject) {
      var attempt = 0, retries = 2, base = 400, max = 3200;
      function go() {
        _f(url, options).then(function (res) {
          if (res && (res.status === 429 || res.status === 408 || (res.status >= 500 && res.status < 600)) && attempt < retries) {
            attempt++;
            setTimeout(go, Math.min(max, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150));
          } else { resolve(res); }
        }).catch(function (err) {
          if (attempt < retries) { attempt++; setTimeout(go, Math.min(max, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150)); }
          else { reject(err); }
        });
      }
      go();
    });
  }
  _retryFetch.__RETRY_WRAPPED__ = true;
  try { g.fetch = _retryFetch; } catch (e) {}
})();
`;

let ok = 0, skip = 0, patched = 0;
for (const f of fs.readdirSync(PROV_DIR).filter(x => x.endsWith('.js')).sort()) {
  if (SKIP.has(f)) { skip++; continue; }
  const p = path.join(PROV_DIR, f);
  let code = fs.readFileSync(p, 'utf8');
  if (code.includes(MARKER)) { ok++; continue; } // idempotent
  fs.writeFileSync(p, WRAPPER + code);
  patched++;
}

console.log(`patched=${patched} already_wrapped=${ok} skipped=${skip}`);
