var $ = Object.defineProperty;
var q = Object.getOwnPropertyDescriptor;
var V = Object.getOwnPropertyNames, E = Object.getOwnPropertySymbols;
var W = Object.prototype.hasOwnProperty, z = Object.prototype.propertyIsEnumerable;
var k = (t, e, o) => e in t ? $(t, e, { enumerable: true, configurable: true, writable: true, value: o }) : t[e] = o, x = (t, e) => {
  for (var o in e || (e = {}))
    W.call(e, o) && k(t, o, e[o]);
  if (E)
    for (var o of E(e))
      z.call(e, o) && k(t, o, e[o]);
  return t;
};
var D = (t, e) => {
  for (var o in e)
    $(t, o, { get: e[o], enumerable: true });
}, I = (t, e, o, c) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let n of V(e))
      !W.call(t, n) && n !== o && $(t, n, { get: () => e[n], enumerable: !(c = q(e, n)) || c.enumerable });
  return t;
};
var j = (t) => I($({}, "__esModule", { value: true }), t);
var p = (t, e, o) => new Promise((c, n) => {
  var a = (i) => {
    try {
      u(o.next(i));
    } catch (s) {
      n(s);
    }
  }, r = (i) => {
    try {
      u(o.throw(i));
    } catch (s) {
      n(s);
    }
  }, u = (i) => i.done ? c(i.value) : Promise.resolve(i.value).then(a, r);
  u((o = o.apply(t, e)).next());
});
var le = {};
D(le, { getStreams: () => ie });
module.exports = j(le);
var P = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function C(t, e) {
  return t >= 3840 || e >= 2160 ? "4K" : t >= 1920 || e >= 1080 ? "1080p" : t >= 1280 || e >= 720 ? "720p" : t >= 854 || e >= 480 ? "480p" : "360p";
}
function g(o) {
  return p(this, arguments, function* (t, e = {}) {
    try {
      let n = yield (yield fetch(t, { headers: x({ "User-Agent": P }, e), redirect: "follow" })).text();
      if (!n.includes("#EXT-X-STREAM-INF")) {
        let i = t.match(/[_-](\d{3,4})p/);
        return i ? `${i[1]}p` : "1080p";
      }
      let a = 0, r = 0, u = n.split(`
`);
      for (let i of u) {
        let s = i.match(/RESOLUTION=(\d+)x(\d+)/);
        if (s) {
          let l = parseInt(s[1]), f = parseInt(s[2]);
          f > r && (r = f, a = l);
        }
      }
      return r > 0 ? C(a, r) : "1080p";
    } catch (c) {
      return "1080p";
    }
  });
}
var H = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function b(t) {
  return p(this, null, function* () {
    try {
      console.log(`[GoodStream] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": H, Referer: "https://goodstream.one", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let c = (yield e.text()).match(/file:\s*"([^"]+)"/);
      if (!c)
        return console.log('[GoodStream] No se encontr\xF3 patr\xF3n file:"..."'), null;
      let n = c[1], a = { Referer: t, Origin: "https://goodstream.one", "User-Agent": H }, r = yield g(n, a);
      return console.log(`[GoodStream] URL encontrada (${r}): ${n.substring(0, 80)}...`), { url: n, quality: r, headers: a };
    } catch (e) {
      return console.log(`[GoodStream] Error: ${e.message}`), null;
    }
  });
}
var K = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function L(t) {
  try {
    return typeof atob != "undefined" ? atob(t) : Buffer.from(t, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}
function G(t, e) {
  try {
    let c = e.replace(/^\[|\]$/g, "").split("','").map((s) => s.replace(/^'+|'+$/g, "")).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), n = "";
    for (let s of t) {
      let l = s.charCodeAt(0);
      l > 64 && l < 91 ? l = (l - 52) % 26 + 65 : l > 96 && l < 123 && (l = (l - 84) % 26 + 97), n += String.fromCharCode(l);
    }
    for (let s of c)
      n = n.replace(new RegExp(s, "g"), "_");
    n = n.split("_").join("");
    let a = L(n);
    if (!a)
      return null;
    let r = "";
    for (let s = 0; s < a.length; s++)
      r += String.fromCharCode((a.charCodeAt(s) - 3 + 256) % 256);
    let u = r.split("").reverse().join(""), i = L(u);
    return i ? JSON.parse(i) : null;
  } catch (o) {
    return console.log("[VOE] voeDecode error:", o.message), null;
  }
}
function R(o) {
  return p(this, arguments, function* (t, e = {}) {
    return yield fetch(t, { method: "GET", headers: x({ "User-Agent": K, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, e), redirect: "follow" });
  });
}
function M(t) {
  return p(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${t}`);
      let e = yield R(t, { Referer: t });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let o = yield e.text();
      if (/permanentToken/i.test(o)) {
        let i = o.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (i) {
          console.log(`[VOE] Permanent token redirect -> ${i[1]}`);
          let s = yield R(i[1], { Referer: t });
          s.ok && (o = yield s.text());
        }
      }
      let c = o.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (c) {
        let i = c[1], s = c[2].startsWith("http") ? c[2] : new URL(c[2], t).href;
        console.log(`[VOE] Found encoded array + loader: ${s}`);
        let l = yield R(s, { Referer: t }), f = l.ok ? yield l.text() : "", h = f.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || f.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (h) {
          let d = G(i, h[1]);
          if (d && (d.source || d.direct_access_url)) {
            let y = d.source || d.direct_access_url, T = yield g(y, { Referer: t });
            return console.log(`[VOE] URL encontrada: ${y.substring(0, 80)}...`), { url: y, quality: T, headers: { Referer: t } };
          }
        }
      }
      let n = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, a = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, r = [], u;
      for (; (u = n.exec(o)) !== null; )
        r.push(u);
      for (; (u = a.exec(o)) !== null; )
        r.push(u);
      for (let i of r) {
        let s = i[1];
        if (!s)
          continue;
        let l = s;
        if (l.startsWith("aHR0"))
          try {
            l = atob(l);
          } catch (f) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${l.substring(0, 80)}...`), { url: l, quality: yield g(l, { Referer: t }), headers: { Referer: t } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (e) {
      return console.log(`[VOE] Error: ${e.message}`), null;
    }
  });
}
var m = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function B(t, e, o) {
  let c = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", n = (a) => {
    let r = 0;
    for (let u = 0; u < a.length; u++) {
      let i = c.indexOf(a[u]);
      if (i === -1)
        return NaN;
      r = r * e + i;
    }
    return r;
  };
  return t.replace(/\b([0-9a-zA-Z]+)\b/g, (a) => {
    let r = n(a);
    return isNaN(r) || r >= o.length ? a : o[r] && o[r] !== "" ? o[r] : a;
  });
}
function F(t, e) {
  let o = t.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (o)
    try {
      let n = o[0].replace(/(\w+)\s*:/g, '"$1":'), a = JSON.parse(n), r = a.hls4 || a.hls3 || a.hls2;
      if (r)
        return r.startsWith("/") ? e + r : r;
    } catch (n) {
      let a = o[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (a) {
        let r = a[1];
        return r.startsWith("/") ? e + r : r;
      }
    }
  let c = t.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (c) {
    let n = c[1];
    return n.startsWith("/") ? e + n : n;
  }
  return null;
}
var Q = { "hglink.to": "vibuxer.com" };
function w(t) {
  return p(this, null, function* () {
    var e;
    try {
      let o = t;
      for (let [s, l] of Object.entries(Q))
        if (o.includes(s)) {
          o = o.replace(s, l);
          break;
        }
      let c = ((e = o.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : e[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${t}`), o !== t && console.log(`[HLSWish] \u2192 Mapped to: ${o}`);
      let n = yield fetch(o, { headers: { "User-Agent": m, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!n.ok)
        throw new Error(`HTTP ${n.status}`);
      let a = yield n.text(), r = a.match(/file\s*:\s*["']([^"']+)["']/i);
      if (r) {
        let s = r[1];
        if (s.startsWith("/") && (s = c + s), s.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${s.substring(0, 80)}...`);
          try {
            let f = (yield fetch(s, { headers: { "User-Agent": m, Referer: c + "/" }, redirect: "follow" })).url;
            f && f.includes(".m3u8") && (s = f);
          } catch (l) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${s.substring(0, 80)}...`), { url: s, quality: "1080p", headers: { "User-Agent": m, Referer: c + "/" } };
      }
      let u = a.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (u) {
        let s = B(u[1], parseInt(u[2]), u[4].split("|")), l = F(s, c);
        if (l)
          return console.log(`[HLSWish] URL encontrada: ${l.substring(0, 80)}...`), { url: l, quality: "1080p", headers: { "User-Agent": m, Referer: c + "/" } };
      }
      let i = a.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return i ? (console.log(`[HLSWish] URL encontrada: ${i[0].substring(0, 80)}...`), { url: i[0], quality: "1080p", headers: { "User-Agent": m, Referer: c + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (o) {
      return console.log(`[HLSWish] Error: ${o.message}`), null;
    }
  });
}
var N = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function O(t) {
  return p(this, null, function* () {
    try {
      console.log(`[Vimeos] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": N, Referer: "https://vimeos.net/", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let c = (yield e.text()).match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
      if (c) {
        let n = c[1], a = parseInt(c[2]), r = c[4].split("|"), u = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", i = (f) => {
          let h = 0;
          for (let d = 0; d < f.length; d++)
            h = h * a + u.indexOf(f[d]);
          return h;
        }, l = n.replace(/\b(\w+)\b/g, (f) => {
          let h = i(f);
          return r[h] && r[h] !== "" ? r[h] : f;
        }).match(/["']([^"']+\.m3u8[^"']*)['"]/i);
        if (l) {
          let f = l[1], h = { "User-Agent": N, Referer: "https://vimeos.net/" }, d = yield g(f, h);
          return console.log(`[Vimeos] URL encontrada: ${f.substring(0, 80)}...`), { url: f, quality: d, headers: h };
        }
      }
      return console.log("[Vimeos] No se encontr\xF3 URL"), null;
    } catch (e) {
      return console.log(`[Vimeos] Error: ${e.message}`), null;
    }
  });
}
var X = "439c478a771f35c05022f9feabcca01c", A = "https://hackstore2.com", S = `${A}/api/rest`, J = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Y = { "User-Agent": J, Accept: "application/json", Referer: `${A}/`, Origin: A }, Z = { "goodstream.one": b, "hlswish.com": w, "streamwish.com": w, "streamwish.to": w, "strwish.com": w, "voe.sx": M, "vimeos.net": O };
function ee(t) {
  for (let [e, o] of Object.entries(Z))
    if (t.includes(e))
      return o;
  return null;
}
function v(t) {
  return p(this, null, function* () {
    let e = yield fetch(t, { headers: Y, redirect: "follow" });
    if (!e.ok)
      throw new Error(`HTTP ${e.status}`);
    return e.json();
  });
}
function te(t = "") {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function U(t, e) {
  let o = te(t).replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return e ? `${o}-${e}` : o;
}
function _(t = "") {
  let e = t.toLowerCase();
  return e.includes("4k") ? "2160p" : e.includes("full") || e.includes("1080") ? "1080p" : e.includes("720") || e.includes("hd") ? "720p" : "SD";
}
function oe(t) {
  return t.includes("goodstream") ? "GoodStream" : t.includes("hlswish") || t.includes("streamwish") ? "StreamWish" : t.includes("voe") ? "VOE" : t.includes("vimeos") ? "Vimeos" : t.includes("filemoon") ? "Filemoon" : "Online";
}
function re(t, e) {
  return p(this, null, function* () {
    var a;
    let c = `https://api.themoviedb.org/3/${e === "movie" ? "movie" : "tv"}/${t}?api_key=${X}&language=es-MX`, n = yield v(c);
    return { title: e === "movie" ? n.title : n.name, year: (a = e === "movie" ? n.release_date : n.first_air_date) == null ? void 0 : a.slice(0, 4), seasons: n.number_of_seasons || 0 };
  });
}
function se(t) {
  return p(this, null, function* () {
    var o;
    let e = yield v(`${S}/single?post_name=${t}&post_type=movies`);
    return ((o = e == null ? void 0 : e.data) == null ? void 0 : o._id) || null;
  });
}
function ne(t) {
  return p(this, null, function* () {
    var o, c;
    let e = yield v(`${S}/single?post_name=${t}&post_type=episodes`);
    return ((c = (o = e == null ? void 0 : e.data) == null ? void 0 : o.episode) == null ? void 0 : c._id) || null;
  });
}
function ce(t) {
  return p(this, null, function* () {
    let e = yield v(`${S}/player?post_id=${t}`);
    return (e == null ? void 0 : e.data) || [];
  });
}
function ae(t) {
  return p(this, null, function* () {
    try {
      let e = ee(t.url);
      if (!e)
        return console.log(`[Hackstore] No resolver: ${t.url}`), null;
      console.log(`[Hackstore] Resolviendo: ${t.url}`);
      let o = yield e(t.url);
      return o != null && o.url ? { name: "Hackstore", title: `${_(t.quality)} \xB7 ${t.lang} \xB7 ${oe(t.url)}`, quality: _(t.quality), url: o.url, headers: o.headers || {} } : null;
    } catch (e) {
      return console.log(`[Hackstore] Error resolver: ${e.message}`), null;
    }
  });
}
function ie(t, e, o, c) {
  return p(this, null, function* () {
    let n = Date.now();
    console.log(`[Hackstore] Buscando TMDB ${t} (${e})` + (o ? ` S${o}E${c}` : ""));
    try {
      let a = yield re(t, e);
      if (!a)
        return [];
      let r, u;
      if (e === "movie" ? (r = U(a.title, a.year), console.log(`[Hackstore] Slug pel\xEDcula: ${r}`), u = yield se(r)) : (r = `${U(a.title)}-temporada-${o}-episodio-${c}`, console.log(`[Hackstore] Slug episodio: ${r}`), u = yield ne(r)), !u)
        return console.log("[Hackstore] No se encontr\xF3 ID"), [];
      console.log(`[Hackstore] Post ID: ${u}`);
      let i = yield ce(u);
      if (!i.length)
        return console.log("[Hackstore] No embeds"), [];
      console.log(`[Hackstore] Embeds encontrados: ${i.length}`);
      let s = [];
      for (let f of i) {
        let h = yield ae(f);
        h && s.push(h);
      }
      let l = ((Date.now() - n) / 1e3).toFixed(2);
      return console.log(`[Hackstore] \u2713 ${s.length} streams encontrados (${l}s)`), s;
    } catch (a) {
      return console.log(`[Hackstore] Error: ${a.message}`), [];
    }
  });
}
