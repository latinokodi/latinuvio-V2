var y = Object.defineProperty;
var D = Object.getOwnPropertyDescriptor;
var P = Object.getOwnPropertyNames, N = Object.getOwnPropertySymbols;
var O = Object.prototype.hasOwnProperty, F = Object.prototype.propertyIsEnumerable;
var T = (t, e, n) => e in t ? y(t, e, { enumerable: true, configurable: true, writable: true, value: n }) : t[e] = n, $ = (t, e) => {
  for (var n in e || (e = {}))
    O.call(e, n) && T(t, n, e[n]);
  if (N)
    for (var n of N(e))
      F.call(e, n) && T(t, n, e[n]);
  return t;
};
var j = (t, e) => {
  for (var n in e)
    y(t, n, { get: e[n], enumerable: true });
}, B = (t, e, n, o) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let r of P(e))
      !O.call(t, r) && r !== n && y(t, r, { get: () => e[r], enumerable: !(o = D(e, r)) || o.enumerable });
  return t;
};
var G = (t) => B(y({}, "__esModule", { value: true }), t);
var h = (t, e, n) => new Promise((o, r) => {
  var c = (a) => {
    try {
      l(n.next(a));
    } catch (i) {
      r(i);
    }
  }, s = (a) => {
    try {
      l(n.throw(a));
    } catch (i) {
      r(i);
    }
  }, l = (a) => a.done ? o(a.value) : Promise.resolve(a.value).then(c, s);
  l((n = n.apply(t, e)).next());
});
var we = {};
j(we, { getStreams: () => me });
module.exports = G(we);
var K = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function X(t, e) {
  return t >= 3840 || e >= 2160 ? "4K" : t >= 1920 || e >= 1080 ? "1080p" : t >= 1280 || e >= 720 ? "720p" : t >= 854 || e >= 480 ? "480p" : "360p";
}
function g(n) {
  return h(this, arguments, function* (t, e = {}) {
    try {
      let r = yield (yield fetch(t, { headers: $({ "User-Agent": K }, e), redirect: "follow" })).text();
      if (!r.includes("#EXT-X-STREAM-INF")) {
        let a = t.match(/[_-](\d{3,4})p/);
        return a ? `${a[1]}p` : "1080p";
      }
      let c = 0, s = 0, l = r.split(`
`);
      for (let a of l) {
        let i = a.match(/RESOLUTION=(\d+)x(\d+)/);
        if (i) {
          let u = parseInt(i[1]), f = parseInt(i[2]);
          f > s && (s = f, c = u);
        }
      }
      return s > 0 ? X(c, s) : "1080p";
    } catch (o) {
      return "1080p";
    }
  });
}
var U = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function _(t) {
  return h(this, null, function* () {
    try {
      console.log(`[GoodStream] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": U, Referer: "https://goodstream.one", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let o = (yield e.text()).match(/file:\s*"([^"]+)"/);
      if (!o)
        return console.log('[GoodStream] No se encontr\xF3 patr\xF3n file:"..."'), null;
      let r = o[1], c = { Referer: t, Origin: "https://goodstream.one", "User-Agent": U }, s = yield g(r, c);
      return console.log(`[GoodStream] URL encontrada (${s}): ${r.substring(0, 80)}...`), { url: r, quality: s, headers: c };
    } catch (e) {
      return console.log(`[GoodStream] Error: ${e.message}`), null;
    }
  });
}
var Q = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function k(t) {
  try {
    return typeof atob != "undefined" ? atob(t) : Buffer.from(t, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}
function J(t, e) {
  try {
    let o = e.replace(/^\[|\]$/g, "").split("','").map((i) => i.replace(/^'+|'+$/g, "")).map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), r = "";
    for (let i of t) {
      let u = i.charCodeAt(0);
      u > 64 && u < 91 ? u = (u - 52) % 26 + 65 : u > 96 && u < 123 && (u = (u - 84) % 26 + 97), r += String.fromCharCode(u);
    }
    for (let i of o)
      r = r.replace(new RegExp(i, "g"), "_");
    r = r.split("_").join("");
    let c = k(r);
    if (!c)
      return null;
    let s = "";
    for (let i = 0; i < c.length; i++)
      s += String.fromCharCode((c.charCodeAt(i) - 3 + 256) % 256);
    let l = s.split("").reverse().join(""), a = k(l);
    return a ? JSON.parse(a) : null;
  } catch (n) {
    return console.log("[VOE] voeDecode error:", n.message), null;
  }
}
function S(n) {
  return h(this, arguments, function* (t, e = {}) {
    return yield fetch(t, { method: "GET", headers: $({ "User-Agent": Q, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, e), redirect: "follow" });
  });
}
function H(t) {
  return h(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${t}`);
      let e = yield S(t, { Referer: t });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let n = yield e.text();
      if (/permanentToken/i.test(n)) {
        let a = n.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (a) {
          console.log(`[VOE] Permanent token redirect -> ${a[1]}`);
          let i = yield S(a[1], { Referer: t });
          i.ok && (n = yield i.text());
        }
      }
      let o = n.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (o) {
        let a = o[1], i = o[2].startsWith("http") ? o[2] : new URL(o[2], t).href;
        console.log(`[VOE] Found encoded array + loader: ${i}`);
        let u = yield S(i, { Referer: t }), f = u.ok ? yield u.text() : "", p = f.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || f.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (p) {
          let d = J(a, p[1]);
          if (d && (d.source || d.direct_access_url)) {
            let m = d.source || d.direct_access_url, w = yield g(m, { Referer: t });
            return console.log(`[VOE] URL encontrada: ${m.substring(0, 80)}...`), { url: m, quality: w, headers: { Referer: t } };
          }
        }
      }
      let r = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, c = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, s = [], l;
      for (; (l = r.exec(n)) !== null; )
        s.push(l);
      for (; (l = c.exec(n)) !== null; )
        s.push(l);
      for (let a of s) {
        let i = a[1];
        if (!i)
          continue;
        let u = i;
        if (u.startsWith("aHR0"))
          try {
            u = atob(u);
          } catch (f) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${u.substring(0, 80)}...`), { url: u, quality: yield g(u, { Referer: t }), headers: { Referer: t } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (e) {
      return console.log(`[VOE] Error: ${e.message}`), null;
    }
  });
}
var v = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function Y(t, e, n) {
  let o = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", r = (c) => {
    let s = 0;
    for (let l = 0; l < c.length; l++) {
      let a = o.indexOf(c[l]);
      if (a === -1)
        return NaN;
      s = s * e + a;
    }
    return s;
  };
  return t.replace(/\b([0-9a-zA-Z]+)\b/g, (c) => {
    let s = r(c);
    return isNaN(s) || s >= n.length ? c : n[s] && n[s] !== "" ? n[s] : c;
  });
}
function Z(t, e) {
  let n = t.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (n)
    try {
      let r = n[0].replace(/(\w+)\s*:/g, '"$1":'), c = JSON.parse(r), s = c.hls4 || c.hls3 || c.hls2;
      if (s)
        return s.startsWith("/") ? e + s : s;
    } catch (r) {
      let c = n[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (c) {
        let s = c[1];
        return s.startsWith("/") ? e + s : s;
      }
    }
  let o = t.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (o) {
    let r = o[1];
    return r.startsWith("/") ? e + r : r;
  }
  return null;
}
var ee = { "hglink.to": "vibuxer.com" };
function x(t) {
  return h(this, null, function* () {
    var e;
    try {
      let n = t;
      for (let [i, u] of Object.entries(ee))
        if (n.includes(i)) {
          n = n.replace(i, u);
          break;
        }
      let o = ((e = n.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : e[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${t}`), n !== t && console.log(`[HLSWish] \u2192 Mapped to: ${n}`);
      let r = yield fetch(n, { headers: { "User-Agent": v, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!r.ok)
        throw new Error(`HTTP ${r.status}`);
      let c = yield r.text(), s = c.match(/file\s*:\s*["']([^"']+)["']/i);
      if (s) {
        let i = s[1];
        if (i.startsWith("/") && (i = o + i), i.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${i.substring(0, 80)}...`);
          try {
            let f = (yield fetch(i, { headers: { "User-Agent": v, Referer: o + "/" }, redirect: "follow" })).url;
            f && f.includes(".m3u8") && (i = f);
          } catch (u) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${i.substring(0, 80)}...`), { url: i, quality: "1080p", headers: { "User-Agent": v, Referer: o + "/" } };
      }
      let l = c.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (l) {
        let i = Y(l[1], parseInt(l[2]), l[4].split("|")), u = Z(i, o);
        if (u)
          return console.log(`[HLSWish] URL encontrada: ${u.substring(0, 80)}...`), { url: u, quality: "1080p", headers: { "User-Agent": v, Referer: o + "/" } };
      }
      let a = c.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return a ? (console.log(`[HLSWish] URL encontrada: ${a[0].substring(0, 80)}...`), { url: a[0], quality: "1080p", headers: { "User-Agent": v, Referer: o + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (n) {
      return console.log(`[HLSWish] Error: ${n.message}`), null;
    }
  });
}
var q = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function I(t) {
  return h(this, null, function* () {
    try {
      console.log(`[Vimeos] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": q, Referer: "https://vimeos.net/", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!e.ok)
        throw new Error(`HTTP ${e.status}`);
      let o = (yield e.text()).match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
      if (o) {
        let r = o[1], c = parseInt(o[2]), s = o[4].split("|"), l = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", a = (f) => {
          let p = 0;
          for (let d = 0; d < f.length; d++)
            p = p * c + l.indexOf(f[d]);
          return p;
        }, u = r.replace(/\b(\w+)\b/g, (f) => {
          let p = a(f);
          return s[p] && s[p] !== "" ? s[p] : f;
        }).match(/["']([^"']+\.m3u8[^"']*)['"]/i);
        if (u) {
          let f = u[1], p = { "User-Agent": q, Referer: "https://vimeos.net/" }, d = yield g(f, p);
          return console.log(`[Vimeos] URL encontrada: ${f.substring(0, 80)}...`), { url: f, quality: d, headers: p };
        }
      }
      return console.log("[Vimeos] No se encontr\xF3 URL"), null;
    } catch (e) {
      return console.log(`[Vimeos] Error: ${e.message}`), null;
    }
  });
}
var te = "439c478a771f35c05022f9feabcca01c", R = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", E = { "User-Agent": R, Accept: "application/json" }, M = "https://la.movie", ne = ["JP", "CN", "KR"], oe = 16, re = { "goodstream.one": _, "hlswish.com": x, "streamwish.com": x, "streamwish.to": x, "strwish.com": x, "voe.sx": H, "vimeos.net": I }, se = [];
function A(n) {
  return h(this, arguments, function* (t, e = {}) {
    let o = yield fetch(t, { headers: $({ "User-Agent": R }, e.headers), redirect: "follow" });
    if (!o.ok)
      throw new Error(`HTTP ${o.status}`);
    return (o.headers.get("content-type") || "").includes("json") ? o.json() : o.text();
  });
}
var ie = (t) => {
  let e = t.toString().toLowerCase(), n = e.match(/(\d+)/);
  return n ? `${n[1]}p` : e.includes("4k") || e.includes("uhd") ? "2160p" : e.includes("full") || e.includes("fhd") ? "1080p" : e.includes("hd") ? "720p" : "SD";
}, ce = (t) => t.includes("goodstream") ? "GoodStream" : t.includes("hlswish") || t.includes("streamwish") ? "StreamWish" : t.includes("voe.sx") ? "VOE" : t.includes("filemoon") ? "Filemoon" : t.includes("vimeos.net") ? "Vimeos" : "Online", ae = (t) => {
  try {
    if (se.some((e) => t.includes(e)))
      return null;
    for (let [e, n] of Object.entries(re))
      if (t.includes(e))
        return n;
  } catch (e) {
  }
  return null;
};
function C(t, e) {
  let n = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return e ? `${n}-${e}` : n;
}
function le(t, e, n) {
  return t === "movie" ? ["peliculas"] : (e || []).includes(oe) ? (n || []).some((c) => ne.includes(c)) ? ["animes"] : ["animes", "series"] : ["series"];
}
function ue(t, e) {
  return h(this, null, function* () {
    var o;
    let n = [{ lang: "es-MX", name: "Latino" }, { lang: "en-US", name: "Ingl\xE9s" }];
    for (let { lang: r, name: c } of n)
      try {
        let s = `https://api.themoviedb.org/3/${e}/${t}?api_key=${te}&language=${r}`, l = yield A(s, { headers: E }), a = e === "movie" ? l.title : l.name, i = e === "movie" ? l.original_title : l.original_name;
        if (r === "es-MX" && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(a))
          continue;
        return console.log(`[LaMovie] TMDB (${c}): "${a}"${a !== i ? ` | Original: "${i}"` : ""}`), { title: a, originalTitle: i, year: (l.release_date || l.first_air_date || "").substring(0, 4), genres: (l.genres || []).map((u) => u.id), originCountries: l.origin_country || ((o = l.production_countries) == null ? void 0 : o.map((u) => u.iso_3166_1)) || [] };
      } catch (s) {
        console.log(`[LaMovie] Error TMDB ${c}: ${s.message}`);
      }
    return null;
  });
}
var fe = { "User-Agent": R, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9", Connection: "keep-alive", "Upgrade-Insecure-Requests": "1" };
function pe(t) {
  let e = t.match(/rel=['"]shortlink['"]\s+href=['"][^'"]*\?p=(\d+)['"]/);
  return e ? e[1] : null;
}
function V(t, e) {
  return h(this, null, function* () {
    let n = `${M}/${t}/${e}/`;
    try {
      let o = yield A(n, { headers: fe, validateStatus: (c) => c === 200 }), r = pe(o);
      return r ? (console.log(`[LaMovie] \u2713 Slug directo: /${t}/${e} \u2192 id:${r}`), { id: r }) : null;
    } catch (o) {
      return null;
    }
  });
}
function he(t, e) {
  return h(this, null, function* () {
    let { title: n, originalTitle: o, year: r, genres: c, originCountries: s } = t, l = le(e, c, s), a = [];
    n && a.push(C(n, r)), o && o !== n && a.push(C(o, r));
    for (let i of a)
      if (l.length === 1) {
        let u = yield V(l[0], i);
        if (u)
          return u;
      } else {
        let f = (yield Promise.allSettled(l.map((p) => V(p, i)))).find((p) => p.status === "fulfilled" && p.value);
        if (f)
          return f.value;
      }
    return null;
  });
}
function de(t, e, n) {
  return h(this, null, function* () {
    var r;
    let o = `${M}/wp-api/v1/single/episodes/list?_id=${t}&season=${e}&page=1&postsPerPage=50`;
    try {
      let c = yield A(o, { headers: E });
      if (!((r = c == null ? void 0 : c.data) != null && r.posts))
        return null;
      let s = c.data.posts.find((l) => l.season_number == e && l.episode_number == n);
      return (s == null ? void 0 : s._id) || null;
    } catch (c) {
      return console.log(`[LaMovie] Error episodios: ${c.message}`), null;
    }
  });
}
function ge(t) {
  return h(this, null, function* () {
    try {
      let e = ae(t.url);
      if (!e)
        return console.log(`[LaMovie] Sin resolver para: ${t.url}`), null;
      let n = yield e(t.url);
      if (!n || !n.url)
        return null;
      let o = ie(t.quality || "1080p"), r = ce(t.url);
      return { name: "LaMovie", title: `${o} \xB7 ${r}`, url: n.url, quality: o, headers: n.headers || {} };
    } catch (e) {
      return console.log(`[LaMovie] Error procesando embed: ${e.message}`), null;
    }
  });
}
function me(t, e, n, o) {
  return h(this, null, function* () {
    var c;
    if (!t || !e)
      return [];
    let r = Date.now();
    console.log(`[LaMovie] Buscando: TMDB ${t} (${e})${n ? ` S${n}E${o}` : ""}`);
    try {
      let s = yield ue(t, e);
      if (!s)
        return [];
      let l = yield he(s, e);
      if (!l)
        return console.log("[LaMovie] No encontrado por slug"), [];
      let a = l.id;
      if (e === "tv" && n && o) {
        let d = yield de(a, n, o);
        if (!d)
          return console.log(`[LaMovie] Episodio S${n}E${o} no encontrado`), [];
        a = d;
      }
      let i = yield A(`${M}/wp-api/v1/player?postId=${a}&demo=0`, { headers: E });
      if (!((c = i == null ? void 0 : i.data) != null && c.embeds))
        return console.log("[LaMovie] No hay embeds disponibles"), [];
      let u = i.data.embeds.map((d) => ge(d)), f = yield new Promise((d) => {
        let m = [], w = 0, L = u.length, b = () => d(m.filter(Boolean));
        u.forEach((z) => {
          z.then((W) => {
            W && m.push(W), w++, w === L && b();
          }).catch(() => {
            w++, w === L && b();
          });
        });
      }), p = ((Date.now() - r) / 1e3).toFixed(2);
      return console.log(`[LaMovie] \u2713 ${f.length} streams en ${p}s`), f;
    } catch (s) {
      return console.log(`[LaMovie] Error: ${s.message}`), [];
    }
  });
}
