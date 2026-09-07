#!/usr/bin/env node
/**
 * Inject a fetch-backed axios shim into esbuild-bundled providers.
 *
 * The Nuvio Mobile QuickJS runtime only supports require("cheerio") and
 * require("crypto-js"). Any require("axios") crashes the module load, so a
 * bundled provider that carries `var axios3 = require("axios")` is unusable.
 *
 * This script:
 *   1. Pre-pends a self-contained `var __axios = (function(){...})()` shim that
 *      implements the axios surface these providers actually use (get/head,
 *      response.data/status/headers, validateStatus, maxRedirects:0, timeout,
 *      params, headers) on top of the global `fetch` that Nuvio provides.
 *   2. Replaces every `require("axios")` (either quote style) with `__axios`.
 *
 * Usage: node scripts/inject_axios_shim.js [provider...]
 *   (no args => process the default list below)
 */

const fs = require('fs');
const path = require('path');

const PROVIDERS_DIR = path.join(__dirname, '..', 'providers');

const DEFAULT_TARGETS = [
  'cuevana.js',
  'fuegocine.js',
  'pelisgo.js',
  'pelispanda.js',
  'pelisplus.js',
  'playhubmax.js',
  'tioplus.js'
];

const AXIOS_SHIM = String.raw`/* __AXIOS_SHIM__ */
var __axios = (function () {
  function encodeQuery(params) {
    if (!params) return "";
    var keys = Object.keys(params), parts = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v = params[k];
      if (v === null || v === undefined) continue;
      if (Array.isArray(v)) v = v.join(",");
      else if (typeof v === "object") v = JSON.stringify(v);
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    }
    return parts.join("&");
  }
  function buildHeaders(resHeaders) {
    var out = Object.create(null);
    try {
      if (resHeaders && typeof resHeaders.forEach === "function") {
        resHeaders.forEach(function (v, k) {
          var key = String(k).toLowerCase();
          if (key === "set-cookie") {
            if (!out[key]) out[key] = [];
            out[key].push(v);
          } else {
            out[key] = v;
          }
        });
      }
    } catch (e) {}
    try {
      if (resHeaders && typeof resHeaders.getSetCookie === "function") {
        var sc = resHeaders.getSetCookie();
        if (sc && sc.length) out["set-cookie"] = Array.prototype.slice.call(sc);
      }
    } catch (e) {}
    var obj = Object.create(null);
    for (var key in out) obj[key] = out[key];
    obj.get = function (name) {
      var k = String(name).toLowerCase(), val = obj[k];
      if (val === undefined) return null;
      return Array.isArray(val) ? val[0] : val;
    };
    obj.has = function (name) { return obj[String(name).toLowerCase()] !== undefined; };
    return obj;
  }
  function request(config) {
    if (typeof config === "string") config = { url: config };
    config = config || {};
    return new Promise(function (resolve, reject) {
      var url = config.url;
      if (!url) { reject(new Error("Request is missing url")); return; }
      if (config.params) {
        var q = encodeQuery(config.params);
        if (q) url += (url.indexOf("?") >= 0 ? "&" : "?") + q;
      }
      var method = (config.method || "get").toUpperCase();
      var opts = { method: method };
      var headers = {};
      var h = config.headers || {};
      if (typeof h.forEach === "function") {
        h.forEach(function (v, k) { headers[String(k)] = v; });
      } else {
        for (var hk in h) if (h.hasOwnProperty(hk)) headers[hk] = h[hk];
      }
      if (config.data !== undefined && config.data !== null) {
        if (typeof config.data === "object" && !ArrayBuffer.isView(config.data)) {
          opts.body = JSON.stringify(config.data);
          if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = "application/json";
        } else if (typeof config.data === "string" || typeof config.data === "number" || typeof config.data === "boolean") {
          opts.body = config.data;
        }
      }
      opts.headers = headers;
      opts.redirect = (config.maxRedirects === 0) ? "manual" : "follow";

      var settled = false;
      var timer = null;
      if (config.timeout) {
        timer = setTimeout(function () {
          if (!settled) { settled = true; reject(new Error("timeout of " + config.timeout + "ms exceeded")); }
        }, config.timeout);
      }
      function settle(fn, val) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        fn(val);
      }

      var f = (typeof fetch === "function") ? fetch : null;
      if (!f) { settle(reject, new Error("fetch unavailable")); return; }

      f(url, opts).then(function (res) {
        res.text().then(function (text) {
          var status = res.status;
          var okStatus = config.validateStatus ? config.validateStatus(status) : (status >= 200 && status < 300);
          var ct = "";
          try { ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : ""; } catch (e) {}
          var data = text, wantsJson;
          if (config.responseType === "json" || config.responseType === "text") {
            wantsJson = config.responseType === "json";
          } else {
            wantsJson = ct.indexOf("application/json") >= 0 || ct.indexOf("text/json") >= 0;
          }
          if (wantsJson) {
            try { data = JSON.parse(text); } catch (e) { data = text; }
          }
          var response = {
            data: data,
            status: status,
            statusText: res.statusText || "",
            headers: buildHeaders(res.headers),
            config: config,
            request: null
          };
          if (okStatus) settle(resolve, response);
          else {
            var err = new Error("Request failed with status code " + status);
            err.response = response;
            err.config = config;
            settle(reject, err);
          }
        }).catch(function (e) { settle(reject, e); });
      }).catch(function (e) { settle(reject, new Error("Network Error")); });
    });
  }
  function make(method) {
    return function (url, cfg) {
      cfg = cfg || {};
      cfg.method = method;
      cfg.url = url;
      return request(cfg);
    };
  }
  var instance = {
    request: request,
    get: make("get"),
    post: make("post"),
    put: make("put"),
    delete: make("delete"),
    head: make("head"),
    options: make("options"),
    patch: make("patch"),
    create: function () { return instance; },
    all: function (arr) { return Promise.all(arr); },
    spread: function (fn) { return function (arr) { return fn.apply(null, arr); }; },
    defaults: {},
    interceptors: { request: { use: function () {} }, response: { use: function () {} } },
    isAxiosError: function () { return false; },
    CancelToken: { source: function () { return { token: null, cancel: function () {} }; } },
    Cancel: function () {},
    AxiosError: function (m) { this.message = m; }
  };
  instance.default = instance;
  return instance;
})();`;

function processFile(filename) {
  const filePath = path.join(PROVIDERS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (missing): ${filename}`);
    return;
  }
  const code = fs.readFileSync(filePath, 'utf-8');

  if (!/require\s*\(\s*["']axios["']\s*\)/.test(code)) {
    console.log(`SKIP (no axios): ${filename}`);
    return;
  }

  const bak = filePath + '.axios.bak';
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, code);
  }

  const newCode = AXIOS_SHIM + '\n' + code.replace(/require\s*\(\s*["']axios["']\s*\)/g, '__axios');
  fs.writeFileSync(filePath, newCode);

  const remaining = (newCode.match(/require\s*\(\s*["']axios["']\s*\)/g) || []).length;
  console.log(`OK: ${filename}  (axios requires remaining: ${remaining})`);
}

const args = process.argv.slice(2);
const targets = args.length ? args : DEFAULT_TARGETS;
console.log('Injecting fetch-backed axios shim...\n');
for (const t of targets) {
  processFile(t.endsWith('.js') ? t : t + '.js');
}
console.log('\nDone.');
