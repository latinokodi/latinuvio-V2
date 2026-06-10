var x = Object.defineProperty;
var R = Object.getOwnPropertyDescriptor;
var b = Object.getOwnPropertyNames, y = Object.getOwnPropertySymbols;
var N = Object.prototype.hasOwnProperty, F = Object.prototype.propertyIsEnumerable;
var S = (n, e, t) => e in n ? x(n, e, { enumerable: true, configurable: true, writable: true, value: t }) : n[e] = t, U = (n, e) => {
  for (var t in e || (e = {}))
    N.call(e, t) && S(n, t, e[t]);
  if (y)
    for (var t of y(e))
      F.call(e, t) && S(n, t, e[t]);
  return n;
};
var H = (n, e) => {
  for (var t in e)
    x(n, t, { get: e[t], enumerable: true });
}, M = (n, e, t, l) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let r of b(e))
      !N.call(n, r) && r !== t && x(n, r, { get: () => e[r], enumerable: !(l = R(e, r)) || l.enumerable });
  return n;
};
var D = (n) => M(x({}, "__esModule", { value: true }), n);
var d = (n, e, t) => new Promise((l, r) => {
  var o = (a) => {
    try {
      i(t.next(a));
    } catch (c) {
      r(c);
    }
  }, s = (a) => {
    try {
      i(t.throw(a));
    } catch (c) {
      r(c);
    }
  }, i = (a) => a.done ? l(a.value) : Promise.resolve(a.value).then(o, s);
  i((t = t.apply(n, e)).next());
});
var K = {};
H(K, { getStreams: () => q });
module.exports = D(K);
var k = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function L(n, e) {
  return n >= 3840 || e >= 2160 ? "4K" : n >= 1920 || e >= 1080 ? "1080p" : n >= 1280 || e >= 720 ? "720p" : n >= 854 || e >= 480 ? "480p" : "360p";
}
function A(t) {
  return d(this, arguments, function* (n, e = {}) {
    try {
      let r = yield (yield fetch(n, { headers: U({ "User-Agent": k }, e), redirect: "follow" })).text();
      if (!r.includes("#EXT-X-STREAM-INF")) {
        let i = n.match(/[_-](\d{3,4})p/);
        return i ? `${i[1]}p` : "Unknown";
      }
      let o = 0, s = 0;
      for (let i of r.split(`
`)) {
        let a = i.match(/RESOLUTION=(\d+)x(\d+)/);
        if (a) {
          let c = parseInt(a[2]);
          c > s && (s = c, o = parseInt(a[1]));
        }
      }
      return s > 0 ? L(o, s) : "Unknown";
    } catch (l) {
      return "Unknown";
    }
  });
}
var E = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", _ = "https://nupload.me";
function z(n, e) {
  return d(this, null, function* () {
    if (typeof XMLHttpRequest != "undefined")
      return new Promise((t, l) => {
        let r = new XMLHttpRequest();
        r.open("GET", n), r.responseType = "text";
        for (let [o, s] of Object.entries(e))
          r.setRequestHeader(o, s);
        r.onload = () => {
          t(r.responseURL || n);
        }, r.onerror = () => l(new Error("Network error via XHR")), r.send();
      });
    {
      let t = yield fetch(n, { headers: e, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status} al seguir redirecci\xF3n`);
      return t.url;
    }
  });
}
function T(n) {
  return d(this, null, function* () {
    var e;
    try {
      console.log(`[Nupload] Resolviendo: ${n}`);
      let t = yield fetch(n, { headers: { "User-Agent": E, Referer: _ + "/" } }), l = yield t.text();
      if (!t.ok)
        throw new Error(`HTTP ${t.status} al cargar el embed`);
      let r = l.match(/([A-Za-z]+)\.forEach\s*\(function\s+\w+\s*\(value\)\s*\{[^}]+atob/);
      if (!r)
        return console.log("[Nupload] No se encontr\xF3 patr\xF3n de ofuscaci\xF3n ni iframe."), null;
      let o = r[1], s = l.match(new RegExp(o + "\\.forEach[^-]+-\\s*(\\d+)"));
      if (!s)
        return console.log("[Nupload] No se pudo extraer el offset num\xE9rico"), null;
      let i = parseInt(s[1]), a = l.match(new RegExp("var\\s+" + o + "\\s*=\\s*(\\[[^\\]]+\\])"));
      if (!a)
        return console.log("[Nupload] No se encontr\xF3 el array de valores ofuscados"), null;
      let c = JSON.parse(a[1]), u = "";
      c.forEach((w) => {
        u += String.fromCharCode(parseInt(atob(w).replace(/\D/g, "")) - i);
      });
      let h = (e = l.match(/var sesz\s*=\s*"([^"]+)"/)) == null ? void 0 : e[1];
      if (!h)
        return console.log("[Nupload] No se encontr\xF3 el token sesz"), null;
      let v = u + "?s=" + h;
      console.log("[Nupload] Siguiendo redirecci\xF3n de la URL construida...");
      let f = yield z(v, { "User-Agent": E }), g = { "User-Agent": E, Referer: "https://nupload.me/", Origin: "https://nupload.me" }, $ = yield A(f, { Referer: "https://nupload.me/", "User-Agent": E });
      return console.log("[Nupload] Quality detectada:", $), console.log(`[Nupload] URL encontrada (${$}): ${f.substring(0, 80)}...`), { url: f, quality: $, headers: g };
    } catch (t) {
      return console.log(`[Nupload] Error: ${t.message}`), null;
    }
  });
}
var I = "439c478a771f35c05022f9feabcca01c", P = "https://seriesflixhd.best", W = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function m(n) {
  return n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function B(n, e) {
  return d(this, null, function* () {
    let [t, l, r] = yield Promise.all(["es-ES", "es-MX", "en-US"].map((u) => fetch(`https://api.themoviedb.org/3/${e}/${n}?api_key=${I}&language=${u}`).then((h) => h.json()).catch(() => null))), o = t ? e === "movie" ? t.title : t.name : null, s = l && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(e === "movie" ? l.title : l.name) ? l : r;
    if (!s)
      return null;
    let i = e === "movie" ? s.title : s.name, a = e === "movie" ? s.original_title : s.original_name, c = (s.release_date || s.first_air_date || "").substring(0, 4);
    return console.log(`[SeriesFlixHD] TMDB: "${i}" (${c})`), { title: i, originalTitle: a, year: c, titleEs: o };
  });
}
function C(n) {
  return d(this, null, function* () {
    let e = `${P}/episodio/${n}`;
    try {
      let t = yield fetch(e, { headers: { "User-Agent": W, Accept: "text/html" } });
      return t.ok ? yield t.text() : null;
    } catch (t) {
      return console.log(`[SeriesFlixHD] fetch error: ${t.message}`), null;
    }
  });
}
function O(n) {
  let e = { latino: [], castellano: [] }, t = n.match(/LATINO[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/), l = n.match(/CASTELLANO[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/), r = (o) => o ? [...o.matchAll(/data-url="([^"]+)"/g)].map((s) => {
    try {
      return atob(s[1]);
    } catch (i) {
      return console.log(`[SeriesFlixHD] Error decodificando base64: ${i.message}`), null;
    }
  }).filter(Boolean).filter((s) => s.includes("nupload.me/watch/")) : [];
  return e.latino = r(t == null ? void 0 : t[1]), e.castellano = r(l == null ? void 0 : l[1]), e;
}
function q(n, e, t, l) {
  return d(this, null, function* () {
    if (!n || e !== "tv")
      return [];
    let r = Date.now();
    console.log(`[SeriesFlixHD] Buscando: TMDB ${n} S${t}E${l}`);
    try {
      let o = yield B(n, e);
      if (!o)
        return [];
      let s = String(l), i = parseInt(t), a = [];
      o.title && (a.push(`${m(o.title)}-${i}x${s}`), a.push(`${m(o.title)}-${o.year}-${i}x${s}`)), o.originalTitle && o.originalTitle !== o.title && (a.push(`${m(o.originalTitle)}-${i}x${s}`), a.push(`${m(o.originalTitle)}-${o.year}-${i}x${s}`)), o.titleEs && o.titleEs !== o.title && (a.push(`${m(o.titleEs)}-${i}x${s}`), a.push(`${m(o.titleEs)}-${o.year}-${i}x${s}`));
      let c = null;
      try {
        c = yield Promise.any(a.map((f) => C(f).then((g) => {
          if (!g || !g.includes("data-url"))
            throw new Error("not found");
          return console.log("[SeriesFlixHD] \u2713 Slug encontrado"), g;
        })));
      } catch (f) {
        c = null;
      }
      let u = O(c);
      console.log(`[SeriesFlixHD] Latino: ${u.latino.length} | Castellano: ${u.castellano.length}`);
      let h = [];
      for (let [f, g] of [[u.latino, "Latino"], [u.castellano, "Castellano"]]) {
        if (f.length === 0)
          continue;
        let w = (yield Promise.allSettled(f.map((p) => T(p)))).filter((p) => p.status === "fulfilled" && p.value).map((p, X) => ({ name: "SeriesFlixHD", title: `${p.value.quality} \xB7 ${g} \xB7 Nupload`, url: p.value.url, quality: p.value.quality, headers: p.value.headers }));
        if (h.push(...w), w.length > 0)
          break;
      }
      let v = ((Date.now() - r) / 1e3).toFixed(2);
      return console.log(`[SeriesFlixHD] \u2713 ${h.length} streams en ${v}s`), h;
    } catch (o) {
      return console.log(`[SeriesFlixHD] Error: ${o.message}`), [];
    }
  });
}
