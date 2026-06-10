var x = Object.defineProperty, I = Object.defineProperties, P = Object.getOwnPropertyDescriptor, z = Object.getOwnPropertyDescriptors, D = Object.getOwnPropertyNames, W = Object.getOwnPropertySymbols;
var H = Object.prototype.hasOwnProperty, j = Object.prototype.propertyIsEnumerable;
var b = (e, t, o) => t in e ? x(e, t, { enumerable: true, configurable: true, writable: true, value: o }) : e[t] = o, g = (e, t) => {
  for (var o in t || (t = {}))
    H.call(t, o) && b(e, o, t[o]);
  if (W)
    for (var o of W(t))
      j.call(t, o) && b(e, o, t[o]);
  return e;
}, U = (e, t) => I(e, z(t));
var C = (e, t) => {
  for (var o in t)
    x(e, o, { get: t[o], enumerable: true });
}, K = (e, t, o, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let n of D(t))
      !H.call(e, n) && n !== o && x(e, n, { get: () => t[n], enumerable: !(r = P(t, n)) || r.enumerable });
  return e;
};
var Q = (e) => K(x({}, "__esModule", { value: true }), e);
var p = (e, t, o) => new Promise((r, n) => {
  var c = (a) => {
    try {
      u(o.next(a));
    } catch (i) {
      n(i);
    }
  }, s = (a) => {
    try {
      u(o.throw(a));
    } catch (i) {
      n(i);
    }
  }, u = (a) => a.done ? r(a.value) : Promise.resolve(a.value).then(c, s);
  u((o = o.apply(e, t)).next());
});
var ge = {};
C(ge, { getStreams: () => me });
module.exports = Q(ge);
var B = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", w = { vimeos: { h: "720p", n: "480p" }, goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" }, vidhide: { n: "720p", l: "480p" }, streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" }, voe: { n: "720p", l: "360p" } }, G = ["x", "o", "h", "n", "l"];
function F(e) {
  return e.includes("vimeos") ? w.vimeos : e.includes("goodstream") ? w.goodstream : e.includes("cloudwindow-route") ? w.voe : e.includes("minochinos") || e.includes("vidhide") || e.includes("dintezuvio") || e.includes("dramiyos") ? w.vidhide : e.includes("premilkyway") || e.includes("hlswish") || e.includes("vibuxer") || e.includes("streamwish") ? w.streamwish : null;
}
function y(o) {
  return p(this, arguments, function* (e, t = {}) {
    let r = m(e);
    return r !== "Unknown" ? r : yield J(e, t);
  });
}
function m(e) {
  if (!e)
    return "Unknown";
  let t = F(e);
  if (t) {
    let r = e.match(/_,([a-z,]+),\.urlset/);
    if (r) {
      let n = r[1].split(",").filter(Boolean);
      for (let c of G)
        if (n.includes(c) && t[c])
          return t[c];
    }
  }
  let o = e.match(/[_\-\/](\d{3,4})p/);
  return o ? o[1] + "p" : "Unknown";
}
function X(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function J(o) {
  return p(this, arguments, function* (e, t = {}) {
    try {
      let n = yield (yield fetch(e, { headers: g({ "User-Agent": B }, t), redirect: "follow" })).text();
      if (!n.includes("#EXT-X-STREAM-INF")) {
        let u = e.match(/[_-](\d{3,4})p/);
        return u ? `${u[1]}p` : "Unknown";
      }
      let c = 0, s = 0;
      for (let u of n.split(`
`)) {
        let a = u.match(/RESOLUTION=(\d+)x(\d+)/);
        if (a) {
          let i = parseInt(a[2]);
          i > s && (s = i, c = parseInt(a[1]));
        }
      }
      return s > 0 ? X(c, s) : "Unknown";
    } catch (r) {
      return "Unknown";
    }
  });
}
var M = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function L(e) {
  return p(this, null, function* () {
    try {
      console.log(`[GoodStream] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": M, Referer: "https://goodstream.one", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let r = (yield t.text()).match(/file:\s*"([^"]+)"/);
      if (!r)
        return console.log('[GoodStream] No se encontr\xF3 patr\xF3n file:"..."'), null;
      let n = r[1], c = { Referer: e, Origin: "https://goodstream.one", "User-Agent": M }, s = m(n);
      return console.log(`[GoodStream] URL encontrada (${s}): ${n.substring(0, 80)}...`), { url: n, quality: s, headers: c };
    } catch (t) {
      return console.log(`[GoodStream] Error: ${t.message}`), null;
    }
  });
}
var Y = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function T(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function Z(e, t) {
  try {
    let r = t.replace(/^\[|\]$/g, "").split("','").map((i) => i.replace(/^'+|'+$/g, "")).map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), n = "";
    for (let i of e) {
      let l = i.charCodeAt(0);
      l > 64 && l < 91 ? l = (l - 52) % 26 + 65 : l > 96 && l < 123 && (l = (l - 84) % 26 + 97), n += String.fromCharCode(l);
    }
    for (let i of r)
      n = n.replace(new RegExp(i, "g"), "_");
    n = n.split("_").join("");
    let c = T(n);
    if (!c)
      return null;
    let s = "";
    for (let i = 0; i < c.length; i++)
      s += String.fromCharCode((c.charCodeAt(i) - 3 + 256) % 256);
    let u = s.split("").reverse().join(""), a = T(u);
    return a ? JSON.parse(a) : null;
  } catch (o) {
    return console.log("[VOE] voeDecode error:", o.message), null;
  }
}
function k(o) {
  return p(this, arguments, function* (e, t = {}) {
    return yield fetch(e, { method: "GET", headers: g({ "User-Agent": Y, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, t), redirect: "follow" });
  });
}
function _(e) {
  return p(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let t = yield k(e, { Referer: e });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let o = yield t.text();
      if (/permanentToken/i.test(o)) {
        let a = o.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (a) {
          console.log(`[VOE] Permanent token redirect -> ${a[1]}`);
          let i = yield k(a[1], { Referer: e });
          i.ok && (o = yield i.text());
        }
      }
      let r = o.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (r) {
        let a = r[1], i = r[2].startsWith("http") ? r[2] : new URL(r[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${i}`);
        let l = yield k(i, { Referer: e }), d = l.ok ? yield l.text() : "", f = d.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || d.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (f) {
          let h = Z(a, f[1]);
          if (h && (h.source || h.direct_access_url)) {
            let A = h.source || h.direct_access_url, V = m(A);
            return console.log(`[VOE] URL encontrada: ${A.substring(0, 80)}...`), { url: A, quality: V, headers: { Referer: e } };
          }
        }
      }
      let n = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, c = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, s = [], u;
      for (; (u = n.exec(o)) !== null; )
        s.push(u);
      for (; (u = c.exec(o)) !== null; )
        s.push(u);
      for (let a of s) {
        let i = a[1];
        if (!i)
          continue;
        let l = i;
        if (l.startsWith("aHR0"))
          try {
            l = atob(l);
          } catch (d) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${l.substring(0, 80)}...`), { url: l, quality: m(l), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[VOE] Error: ${t.message}`), null;
    }
  });
}
var $ = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function ee(e, t, o) {
  let r = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", n = (c) => {
    let s = 0;
    for (let u = 0; u < c.length; u++) {
      let a = r.indexOf(c[u]);
      if (a === -1)
        return NaN;
      s = s * t + a;
    }
    return s;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (c) => {
    let s = n(c);
    return isNaN(s) || s >= o.length ? c : o[s] && o[s] !== "" ? o[s] : c;
  });
}
function te(e, t) {
  let o = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (o)
    try {
      let n = o[0].replace(/(\w+)\s*:/g, '"$1":'), c = JSON.parse(n), s = c.hls4 || c.hls3 || c.hls2;
      if (s)
        return s.startsWith("/") ? t + s : s;
    } catch (n) {
      let c = o[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (c) {
        let s = c[1];
        return s.startsWith("/") ? t + s : s;
      }
    }
  let r = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (r) {
    let n = r[1];
    return n.startsWith("/") ? t + n : n;
  }
  return null;
}
var oe = { "hglink.to": "vibuxer.com" };
function v(e) {
  return p(this, null, function* () {
    var t;
    try {
      let o = e;
      for (let [i, l] of Object.entries(oe))
        if (o.includes(i)) {
          o = o.replace(i, l);
          break;
        }
      let r = ((t = o.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : t[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), o !== e && console.log(`[HLSWish] \u2192 Mapped to: ${o}`);
      let n = yield fetch(o, { headers: { "User-Agent": $, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!n.ok)
        throw new Error(`HTTP ${n.status}`);
      let c = yield n.text(), s = c.match(/file\s*:\s*["']([^"']+)["']/i);
      if (s) {
        let i = s[1];
        if (i.startsWith("/") && (i = r + i), i.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${i.substring(0, 80)}...`);
          try {
            let d = (yield fetch(i, { headers: { "User-Agent": $, Referer: r + "/" }, redirect: "follow" })).url;
            d && d.includes(".m3u8") && (i = d);
          } catch (l) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${i.substring(0, 80)}...`), { url: i, quality: y(i), headers: { "User-Agent": $, Referer: r + "/" } };
      }
      let u = c.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (u) {
        let i = ee(u[1], parseInt(u[2]), u[4].split("|")), l = te(i, r);
        if (l)
          return console.log(`[HLSWish] URL encontrada: ${l.substring(0, 80)}...`), { url: l, quality: y(l), headers: { "User-Agent": $, Referer: r + "/" } };
      }
      let a = c.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return a ? (console.log(`[HLSWish] URL encontrada: ${a[0].substring(0, 80)}...`), { url: a[0], quality: y(a[0]), headers: { "User-Agent": $, Referer: r + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (o) {
      return console.log(`[HLSWish] Error: ${o.message}`), null;
    }
  });
}
var O = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function N(e) {
  return p(this, null, function* () {
    try {
      console.log(`[Vimeos] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": O, Referer: "https://vimeos.net/", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let r = (yield t.text()).match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
      if (r) {
        let n = r[1], c = parseInt(r[2]), s = r[4].split("|"), u = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", a = (d) => {
          let f = 0;
          for (let h = 0; h < d.length; h++)
            f = f * c + u.indexOf(d[h]);
          return f;
        }, l = n.replace(/\b(\w+)\b/g, (d) => {
          let f = a(d);
          return s[f] && s[f] !== "" ? s[f] : d;
        }).match(/["']([^"']+\.m3u8[^"']*)['"]/i);
        if (l) {
          let d = l[1], f = { "User-Agent": O, Referer: "https://vimeos.net/" }, h = m(d);
          return console.log(`[Vimeos] URL encontrada: ${d.substring(0, 80)}...`), { url: d, quality: h, headers: f };
        }
      }
      return console.log("[Vimeos] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[Vimeos] Error: ${t.message}`), null;
    }
  });
}
var re = "439c478a771f35c05022f9feabcca01c", S = "https://hackstore2.com", E = `${S}/api/rest`, ne = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", se = { "User-Agent": ne, Accept: "application/json", Referer: `${S}/`, Origin: S }, ce = { "goodstream.one": L, "hlswish.com": v, "streamwish.com": v, "streamwish.to": v, "strwish.com": v, "voe.sx": _, "vimeos.net": N };
function ie(e) {
  for (let [t, o] of Object.entries(ce))
    if (e.includes(t))
      return o;
  return null;
}
function R(e) {
  return p(this, null, function* () {
    let t = yield fetch(e, { headers: se, redirect: "follow" });
    if (!t.ok)
      throw new Error(`HTTP ${t.status}`);
    return t.json();
  });
}
function ae(e = "") {
  return e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function q(e, t) {
  let o = ae(e).replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return t ? `${o}-${t}` : o;
}
function le(e) {
  return e.includes("goodstream") ? "GoodStream" : e.includes("hlswish") || e.includes("streamwish") ? "StreamWish" : e.includes("voe") ? "VOE" : e.includes("vimeos") ? "Vimeos" : e.includes("filemoon") ? "Filemoon" : "Online";
}
function ue(e, t) {
  return p(this, null, function* () {
    var c;
    let r = `https://api.themoviedb.org/3/${t === "movie" ? "movie" : "tv"}/${e}?api_key=${re}&language=es-MX`, n = yield R(r);
    return { title: t === "movie" ? n.title : n.name, year: (c = t === "movie" ? n.release_date : n.first_air_date) == null ? void 0 : c.slice(0, 4), seasons: n.number_of_seasons || 0 };
  });
}
function fe(e) {
  return p(this, null, function* () {
    var o;
    let t = yield R(`${E}/single?post_name=${e}&post_type=movies`);
    return ((o = t == null ? void 0 : t.data) == null ? void 0 : o._id) || null;
  });
}
function pe(e) {
  return p(this, null, function* () {
    var o, r;
    let t = yield R(`${E}/single?post_name=${e}&post_type=episodes`);
    return ((r = (o = t == null ? void 0 : t.data) == null ? void 0 : o.episode) == null ? void 0 : r._id) || null;
  });
}
function de(e) {
  return p(this, null, function* () {
    let t = yield R(`${E}/player?post_id=${e}`);
    return (t == null ? void 0 : t.data) || [];
  });
}
function he(e) {
  return p(this, null, function* () {
    try {
      let t = ie(e.url);
      if (!t)
        return console.log(`[Hackstore] No resolver: ${e.url}`), null;
      console.log(`[Hackstore] Resolviendo: ${e.url}`);
      let o = yield t(e.url);
      if (!(o != null && o.url))
        return null;
      let r = o.quality || "Unknown";
      return { name: "Hackstore", title: `${r} \xB7 ${e.lang} \xB7 ${le(e.url)}`, quality: r, url: o.url, headers: o.headers || {} };
    } catch (t) {
      return console.log(`[Hackstore] Error resolver: ${t.message}`), null;
    }
  });
}
function me(e, t, o, r) {
  return p(this, null, function* () {
    let n = Date.now();
    console.log(`[Hackstore] Buscando TMDB ${e} (${t})` + (o ? ` S${o}E${r}` : ""));
    try {
      let c = yield ue(e, t);
      if (!c)
        return [];
      let s, u;
      if (t === "movie" ? (s = q(c.title, c.year), console.log(`[Hackstore] Slug pel\xEDcula: ${s}`), u = yield fe(s)) : (s = `${q(c.title)}-temporada-${o}-episodio-${r}`, console.log(`[Hackstore] Slug episodio: ${s}`), u = yield pe(s)), !u)
        return console.log("[Hackstore] No se encontr\xF3 ID"), [];
      console.log(`[Hackstore] Post ID: ${u}`);
      let a = yield de(u);
      if (!a.length)
        return console.log("[Hackstore] No embeds"), [];
      console.log(`[Hackstore] Embeds encontrados: ${a.length}`);
      let l = (yield Promise.allSettled(a.map((f) => {
        let h = U(g({}, f), { lang: f.lang || "LAT" });
        return he(h);
      }))).filter((f) => f.status === "fulfilled" && f.value !== null).map((f) => f.value), d = ((Date.now() - n) / 1e3).toFixed(2);
      return console.log(`[Hackstore] \u2713 ${l.length} streams encontrados (${d}s)`), l;
    } catch (c) {
      return console.log(`[Hackstore] Error: ${c.message}`), [];
    }
  });
}
