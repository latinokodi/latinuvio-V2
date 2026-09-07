/**
 * fetch_policy.js — reusable retry/timeout/stealth HTTP helpers for Nuvio providers.
 *
 * Self-contained (global `fetch` + `setTimeout`, no external deps, QuickJS-safe).
 * Covers the three things a Nuvio provider's HTTP layer needs:
 *   • retry on transient failures (408/429/5xx + network) with exponential backoff + jitter
 *   • a hard abort deadline per request (QuickJS-safe AbortSignal)
 *   • a full browser "stealth" header map to pass WAFs (sec-ch-ua, Sec-Fetch-*, ...)
 *
 *   const { fetchWithRetry, fetchWithTimeout, fetchText, fetchJson, getStealthHeaders } = require("./fetch_policy.js");
 */

/** QuickJS-safe abort signal: AbortSignal.timeout → AbortController → undefined. */
function timeoutSignal(ms) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  } catch (e) {}
  try {
    if (typeof AbortController === 'function' && typeof setTimeout === 'function') {
      const c = new AbortController();
      const t = setTimeout(() => { try { c.abort(); } catch (e) {} }, ms);
      if (t && typeof t.unref === 'function') { try { t.unref(); } catch (e) {} }
      return c.signal;
    }
  } catch (e) {}
  return undefined;
}

/** Full Chrome fingerprint header set to pass WAFs / hotlink protection. */
function getStealthHeaders(extra) {
  const h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Chromium";v="120", "Not_A Brand";v="24", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
  if (extra) for (const k in extra) if (extra.hasOwnProperty(k)) h[k] = extra[k];
  return h;
}

function mergeHeaders(base, extra) {
  const out = {};
  for (const k in base) if (base.hasOwnProperty(k)) out[k] = base[k];
  if (extra) for (const k in extra) if (extra.hasOwnProperty(k)) out[k] = extra[k];
  return out;
}

/** fetch + hard timeout signal; resolves the response, throws «timeout of Nms exceeded» on abort. */
function fetchWithTimeout(url, options, timeoutMs) {
  const timeout = (timeoutMs == null) ? 15000 : timeoutMs;
  return new Promise((resolve, reject) => {
    const signal = timeoutSignal(timeout);
    if (!signal) { fetch(url, options || {}).then(resolve).catch(reject); return; }
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('timeout of ' + timeout + 'ms exceeded')); } }, timeout);
    fetch(url, Object.assign({}, options || {}, { signal })).then((res) => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
    }).catch((err) => {
      if (!settled) { settled = true; clearTimeout(timer); reject(err); }
    });
  });
}

/** retry + backoff + jitter. retryOn default: 401/429/408/5xx. */
function fetchWithRetry(url, options, retryOpts) {
  const retries = (retryOpts && retryOpts.retries != null) ? retryOpts.retries : 2;
  const baseDelay = (retryOpts && retryOpts.baseDelay != null) ? retryOpts.baseDelay : 400;
  const maxDelay = (retryOpts && retryOpts.maxDelay != null) ? retryOpts.maxDelay : 3200;
  const retryOn = (retryOpts && retryOpts.retryOn) ||
    ((status) => status === 429 || status === 408 || (status >= 500 && status < 600));

  return new Promise((resolve, reject) => {
    let attempt = 0;
    const attemptFetch = () => {
      fetch(url, options || {}).then((res) => {
        if (retryOn(res.status) && attempt < retries) {
          attempt++;
          const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150);
          setTimeout(attemptFetch, delay);
          return;
        }
        resolve(res);
      }).catch((err) => {
        if (attempt < retries) {
          attempt++;
          const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150);
          setTimeout(attemptFetch, delay);
          return;
        }
        reject(err);
      });
    };
    attemptFetch();
  });
}

/** Same as fetchWithRetry but resolves `null` on a final transient status / network error. */
function safeFetch(url, options, retryOpts) {
  const retryOn = (retryOpts && retryOpts.retryOn) ||
    ((status) => status === 429 || status === 408 || (status >= 500 && status < 600));
  return fetchWithRetry(url, options, retryOpts).then((res) => {
    if (res && typeof res.status === 'number' && retryOn(res.status)) return null;
    return res;
  }).catch(() => null);
}

/** fetchText: stealth headers + timeout + ok-check. Throws on non-ok. */
function fetchText(url, opts) {
  opts = opts || {};
  const timeout = opts.timeout != null ? opts.timeout : 15000;
  const headers = mergeHeaders(getStealthHeaders(), opts.headers);
  return fetchWithTimeout(url, { method: opts.method || 'GET', headers, ...(opts.body ? { body: opts.body } : {}) }, timeout).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + url);
    return res.text();
  });
}

/** fetchJson: same but returns parsed JSON. Throws on non-ok / bad JSON. */
function fetchJson(url, opts) {
  return fetchText(url, opts).then((t) => {
    try { return JSON.parse(t); } catch (e) { throw new Error('bad JSON from ' + url); }
  });
}

module.exports = {
  fetchWithRetry, safeFetch, fetchWithTimeout, fetchText, fetchJson,
  timeoutSignal, getStealthHeaders, mergeHeaders,
};
