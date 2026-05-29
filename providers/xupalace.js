var x = Object.defineProperty;
var k = Object.getOwnPropertyDescriptor;
var P = Object.getOwnPropertyNames, E = Object.getOwnPropertySymbols;
var W = Object.prototype.hasOwnProperty, U = Object.prototype.propertyIsEnumerable;
var b = (e, n, t) => n in e ? x(e, n, { enumerable: true, configurable: true, writable: true, value: t }) : e[n] = t, v = (e, n) => {
  for (var t in n || (n = {}))
    W.call(n, t) && b(e, t, n[t]);
  if (E)
    for (var t of E(n))
      U.call(n, t) && b(e, t, n[t]);
  return e;
};
var O = (e, n) => {
  for (var t in n)
    x(e, t, { get: n[t], enumerable: true });
}, _ = (e, n, t, u) => {
  if (n && typeof n == "object" || typeof n == "function")
    for (let r of P(n))
      !W.call(e, r) && r !== t && x(e, r, { get: () => n[r], enumerable: !(u = k(n, r)) || u.enumerable });
  return e;
};
var T = (e) => _(x({}, "__esModule", { value: true }), e);
var f = (e, n, t) => new Promise((u, r) => {
  var l = (s) => {
    try {
      i(t.next(s));
    } catch (o) {
      r(o);
    }
  }, a = (s) => {
    try {
      i(t.throw(s));
    } catch (o) {
      r(o);
    }
  }, i = (s) => s.done ? u(s.value) : Promise.resolve(s.value).then(l, a);
  i((t = t.apply(e, n)).next());
});
var Z = {};
O(Z, { getStreams: () => Y });
module.exports = T(Z);
var w = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function q(e, n, t) {
  let u = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", r = (l) => {
    let a = 0;
    for (let i = 0; i < l.length; i++) {
      let s = u.indexOf(l[i]);
      if (s === -1)
        return NaN;
      a = a * n + s;
    }
    return a;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (l) => {
    let a = r(l);
    return isNaN(a) || a >= t.length ? l : t[a] && t[a] !== "" ? t[a] : l;
  });
}
function X(e, n) {
  let t = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (t)
    try {
      let r = t[0].replace(/(\w+)\s*:/g, '"$1":'), l = JSON.parse(r), a = l.hls4 || l.hls3 || l.hls2;
      if (a)
        return a.startsWith("/") ? n + a : a;
    } catch (r) {
      let l = t[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (l) {
        let a = l[1];
        return a.startsWith("/") ? n + a : a;
      }
    }
  let u = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (u) {
    let r = u[1];
    return r.startsWith("/") ? n + r : r;
  }
  return null;
}
var I = { "hglink.to": "vibuxer.com" };
function R(e) {
  return f(this, null, function* () {
    var n;
    try {
      let t = e;
      for (let [o, c] of Object.entries(I))
        if (t.includes(o)) {
          t = t.replace(o, c);
          break;
        }
      let u = ((n = t.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : n[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), t !== e && console.log(`[HLSWish] \u2192 Mapped to: ${t}`);
      let r = yield fetch(t, { headers: { "User-Agent": w, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!r.ok)
        throw new Error(`HTTP ${r.status}`);
      let l = yield r.text(), a = l.match(/file\s*:\s*["']([^"']+)["']/i);
      if (a) {
        let o = a[1];
        if (o.startsWith("/") && (o = u + o), o.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${o.substring(0, 80)}...`);
          try {
            let p = (yield fetch(o, { headers: { "User-Agent": w, Referer: u + "/" }, redirect: "follow" })).url;
            p && p.includes(".m3u8") && (o = p);
          } catch (c) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${o.substring(0, 80)}...`), { url: o, quality: "1080p", headers: { "User-Agent": w, Referer: u + "/" } };
      }
      let i = l.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (i) {
        let o = q(i[1], parseInt(i[2]), i[4].split("|")), c = X(o, u);
        if (c)
          return console.log(`[HLSWish] URL encontrada: ${c.substring(0, 80)}...`), { url: c, quality: "1080p", headers: { "User-Agent": w, Referer: u + "/" } };
      }
      let s = l.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return s ? (console.log(`[HLSWish] URL encontrada: ${s[0].substring(0, 80)}...`), { url: s[0], quality: "1080p", headers: { "User-Agent": w, Referer: u + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (t) {
      return console.log(`[HLSWish] Error: ${t.message}`), null;
    }
  });
}
var D = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function j(e, n) {
  return e >= 3840 || n >= 2160 ? "4K" : e >= 1920 || n >= 1080 ? "1080p" : e >= 1280 || n >= 720 ? "720p" : e >= 854 || n >= 480 ? "480p" : "360p";
}
function y(t) {
  return f(this, arguments, function* (e, n = {}) {
    try {
      let r = yield (yield fetch(e, { headers: v({ "User-Agent": D }, n), redirect: "follow" })).text();
      if (!r.includes("#EXT-X-STREAM-INF")) {
        let s = e.match(/[_-](\d{3,4})p/);
        return s ? `${s[1]}p` : "1080p";
      }
      let l = 0, a = 0, i = r.split(`
`);
      for (let s of i) {
        let o = s.match(/RESOLUTION=(\d+)x(\d+)/);
        if (o) {
          let c = parseInt(o[1]), p = parseInt(o[2]);
          p > a && (a = p, l = c);
        }
      }
      return a > 0 ? j(l, a) : "1080p";
    } catch (u) {
      return "1080p";
    }
  });
}
var z = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function L(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (n) {
    return null;
  }
}
function B(e, n) {
  try {
    let u = n.replace(/^\[|\]$/g, "").split("','").map((o) => o.replace(/^'+|'+$/g, "")).map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), r = "";
    for (let o of e) {
      let c = o.charCodeAt(0);
      c > 64 && c < 91 ? c = (c - 52) % 26 + 65 : c > 96 && c < 123 && (c = (c - 84) % 26 + 97), r += String.fromCharCode(c);
    }
    for (let o of u)
      r = r.replace(new RegExp(o, "g"), "_");
    r = r.split("_").join("");
    let l = L(r);
    if (!l)
      return null;
    let a = "";
    for (let o = 0; o < l.length; o++)
      a += String.fromCharCode((l.charCodeAt(o) - 3 + 256) % 256);
    let i = a.split("").reverse().join(""), s = L(i);
    return s ? JSON.parse(s) : null;
  } catch (t) {
    return console.log("[VOE] voeDecode error:", t.message), null;
  }
}
function S(t) {
  return f(this, arguments, function* (e, n = {}) {
    return yield fetch(e, { method: "GET", headers: v({ "User-Agent": z, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, n), redirect: "follow" });
  });
}
function M(e) {
  return f(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let n = yield S(e, { Referer: e });
      if (!n.ok)
        throw new Error(`HTTP ${n.status}`);
      let t = yield n.text();
      if (/permanentToken/i.test(t)) {
        let s = t.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (s) {
          console.log(`[VOE] Permanent token redirect -> ${s[1]}`);
          let o = yield S(s[1], { Referer: e });
          o.ok && (t = yield o.text());
        }
      }
      let u = t.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (u) {
        let s = u[1], o = u[2].startsWith("http") ? u[2] : new URL(u[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${o}`);
        let c = yield S(o, { Referer: e }), p = c.ok ? yield c.text() : "", d = p.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || p.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (d) {
          let h = B(s, d[1]);
          if (h && (h.source || h.direct_access_url)) {
            let g = h.source || h.direct_access_url, m = yield y(g, { Referer: e });
            return console.log(`[VOE] URL encontrada: ${g.substring(0, 80)}...`), { url: g, quality: m, headers: { Referer: e } };
          }
        }
      }
      let r = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, l = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, a = [], i;
      for (; (i = r.exec(t)) !== null; )
        a.push(i);
      for (; (i = l.exec(t)) !== null; )
        a.push(i);
      for (let s of a) {
        let o = s[1];
        if (!o)
          continue;
        let c = o;
        if (c.startsWith("aHR0"))
          try {
            c = atob(c);
          } catch (p) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${c.substring(0, 80)}...`), { url: c, quality: yield y(c, { Referer: e }), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (n) {
      return console.log(`[VOE] Error: ${n.message}`), null;
    }
  });
}
var H = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function C(e) {
  try {
    let n = e.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
    if (!n)
      return null;
    let [, t, u, r, l] = n;
    u = parseInt(u), r = parseInt(r), l = l.split("|");
    let a = (i, s) => {
      let o = "0123456789abcdefghijklmnopqrstuvwxyz", c = "";
      for (; i > 0; )
        c = o[i % s] + c, i = Math.floor(i / s);
      return c || "0";
    };
    return t = t.replace(/\b\w+\b/g, (i) => {
      let s = parseInt(i, 36);
      return s < l.length && l[s] ? l[s] : a(s, u);
    }), t;
  } catch (n) {
    return null;
  }
}
function $(e) {
  return f(this, null, function* () {
    var n;
    try {
      console.log(`[VidHide] Resolviendo: ${e}`);
      let t = yield fetch(e, { method: "GET", headers: { "User-Agent": H, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", Referer: "https://embed69.org/" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let r = (yield t.text()).match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!r)
        return console.log("[VidHide] No se encontr\xF3 bloque eval"), null;
      let l = C(r[0]);
      if (!l)
        return console.log("[VidHide] No se pudo desempacar"), null;
      let a = l.match(/"hls4"\s*:\s*"([^"]+)"/), i = l.match(/"hls2"\s*:\s*"([^"]+)"/), s = (n = a || i) == null ? void 0 : n[1];
      if (!s)
        return console.log("[VidHide] No se encontr\xF3 hls4/hls2"), null;
      let o = s;
      s.startsWith("http") || (o = `${new URL(e).origin}${s}`), console.log(`[VidHide] URL encontrada: ${o.substring(0, 80)}...`);
      let c = new URL(e).origin;
      return { url: o, headers: { "User-Agent": H, Referer: `${c}/`, Origin: c } };
    } catch (t) {
      return console.log(`[VidHide] Error: ${t.message}`), null;
    }
  });
}
var K = "439c478a771f35c05022f9feabcca01c", N = "https://xupalace.org", V = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", F = { "User-Agent": V, Accept: "text/html", "Accept-Language": "es-MX,es;q=0.9", Connection: "keep-alive" }, G = { "hglink.to": { fn: R, name: "StreamWish" }, "vibuxer.com": { fn: R, name: "StreamWish" }, "voe.sx": { fn: M, name: "VOE" }, "vidhidepro.com": { fn: $, name: "VidHide" }, "vidhide.com": { fn: $, name: "VidHide" }, "dintezuvio.com": { fn: $, name: "VidHide" }, "filelions.to": { fn: $, name: "VidHide" } };
function J(e, n) {
  return f(this, null, function* () {
    try {
      let t = `https://api.themoviedb.org/3/${n}/${e}/external_ids?api_key=${K}`;
      return (yield fetch(t, { headers: { "User-Agent": V } }).then((r) => r.json())).imdb_id || null;
    } catch (t) {
      return console.log(`[XuPalace] Error IMDB ID: ${t.message}`), null;
    }
  });
}
function Q(e, n, t, u) {
  return f(this, null, function* () {
    try {
      let r;
      n === "movie" ? r = `/video/${e}/` : r = `/video/${e}-${t}x${String(u).padStart(2, "0")}/`, console.log(`[XuPalace] Fetching: ${N}${r}`);
      let l = yield fetch(`${N}${r}`, { headers: F }).then((s) => s.text()), a = [...l.matchAll(/go_to_playerVast\('(https?:\/\/[^']+)'[^)]+\)[^<]*data-lang="(\d+)"/g)];
      if (a.length === 0) {
        let s = [...l.matchAll(/go_to_playerVast\('(https?:\/\/[^']+)'/g)];
        return { 0: [...new Set(s.map((o) => o[1]))] };
      }
      let i = {};
      for (let s of a) {
        let o = s[1], c = parseInt(s[2]);
        i[c] || (i[c] = []), i[c].includes(o) || i[c].push(o);
      }
      return i;
    } catch (r) {
      return console.log(`[XuPalace] Error fetch: ${r.message}`), {};
    }
  });
}
function Y(e, n, t, u) {
  return f(this, null, function* () {
    if (!e)
      return [];
    let r = Date.now();
    console.log(`[XuPalace] Buscando: TMDB ${e} (${n})`);
    let l = { 0: "Latino", 1: "Espa\xF1ol", 2: "Subtitulado" };
    try {
      let a = yield J(e, n);
      if (!a)
        return console.log("[XuPalace] No se encontr\xF3 IMDB ID"), [];
      console.log(`[XuPalace] IMDB ID: ${a}`);
      let i = yield Q(a, n, t, u);
      if (Object.keys(i).length === 0)
        return console.log("[XuPalace] No hay embeds"), [];
      for (let s of [0, 1, 2]) {
        let o = i[s];
        if (!o || o.length === 0)
          continue;
        let c = l[s];
        console.log(`[XuPalace] Resolviendo ${o.length} embeds (${c})...`);
        let d = (yield Promise.allSettled(o.map((h) => f(this, null, function* () {
          let g = new URL(h).hostname.replace("www.", ""), m = G[g];
          if (!m)
            return console.log(`[XuPalace] Sin resolver para: ${g} \u2192 ${h}`), null;
          let A = yield m.fn(h);
          return A && (A.server = m.name), A;
        })))).filter((h) => h.status === "fulfilled" && h.value).map((h) => ({ name: "XuPalace", title: `${h.value.quality || "1080p"} \xB7 ${c} \xB7 ${h.value.server}`, url: h.value.url, quality: h.value.quality || "1080p", headers: h.value.headers || {} }));
        if (d.length > 0) {
          console.log(`[XuPalace] \u2713 Streams encontrados en ${c}, omitiendo idiomas de menor prioridad`);
          let h = ((Date.now() - r) / 1e3).toFixed(2);
          return console.log(`[XuPalace] \u2713 ${d.length} streams en ${h}s`), d;
        }
      }
      return console.log("[XuPalace] No se encontraron streams en ning\xFAn idioma"), [];
    } catch (a) {
      return console.log(`[XuPalace] Error: ${a.message}`), [];
    }
  });
}
