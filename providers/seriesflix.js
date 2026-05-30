var E = Object.defineProperty;
var v = Object.getOwnPropertyDescriptor;
var A = Object.getOwnPropertyNames;
var b = Object.prototype.hasOwnProperty;
var F = (n, o) => {
  for (var t in o)
    E(n, t, { get: o[t], enumerable: true });
}, T = (n, o, t, s) => {
  if (o && typeof o == "object" || typeof o == "function")
    for (let r of A(o))
      !b.call(n, r) && r !== t && E(n, r, { get: () => o[r], enumerable: !(s = v(o, r)) || s.enumerable });
  return n;
};
var H = (n) => T(E({}, "__esModule", { value: true }), n);
var p = (n, o, t) => new Promise((s, r) => {
  var e = (a) => {
    try {
      i(t.next(a));
    } catch (c) {
      r(c);
    }
  }, l = (a) => {
    try {
      i(t.throw(a));
    } catch (c) {
      r(c);
    }
  }, i = (a) => a.done ? s(a.value) : Promise.resolve(a.value).then(e, l);
  i((t = t.apply(n, o)).next());
});
var W = {};
F(W, { getStreams: () => _ });
module.exports = H(W);
var S = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", U = "https://nupload.me";
function D(n, o) {
  return p(this, null, function* () {
    if (typeof XMLHttpRequest != "undefined")
      return new Promise((t, s) => {
        let r = new XMLHttpRequest();
        r.open("GET", n), r.responseType = "text";
        for (let [e, l] of Object.entries(o))
          r.setRequestHeader(e, l);
        r.onload = () => {
          t(r.responseURL || n);
        }, r.onerror = () => s(new Error("Network error via XHR")), r.send();
      });
    {
      let t = yield fetch(n, { headers: o, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status} al seguir redirecci\xF3n`);
      return t.url;
    }
  });
}
function y(n) {
  return p(this, null, function* () {
    var o;
    try {
      console.log(`[Nupload] Resolviendo: ${n}`);
      let t = yield fetch(n, { headers: { "User-Agent": S, Referer: U + "/" } }), s = yield t.text();
      if (!t.ok)
        throw new Error(`HTTP ${t.status} al cargar el embed`);
      let r = s.match(/([A-Za-z]+)\.forEach\s*\(function\s+\w+\s*\(value\)\s*\{[^}]+atob/);
      if (!r)
        return console.log("[Nupload] No se encontr\xF3 patr\xF3n de ofuscaci\xF3n ni iframe."), null;
      let e = r[1], l = s.match(new RegExp(e + "\\.forEach[^-]+-\\s*(\\d+)"));
      if (!l)
        return console.log("[Nupload] No se pudo extraer el offset num\xE9rico"), null;
      let i = parseInt(l[1]), a = s.match(new RegExp("var\\s+" + e + "\\s*=\\s*(\\[[^\\]]+\\])"));
      if (!a)
        return console.log("[Nupload] No se encontr\xF3 el array de valores ofuscados"), null;
      let c = JSON.parse(a[1]), d = "";
      c.forEach(($) => {
        d += String.fromCharCode(parseInt(atob($).replace(/\D/g, "")) - i);
      });
      let g = (o = s.match(/var sesz\s*=\s*"([^"]+)"/)) == null ? void 0 : o[1];
      if (!g)
        return console.log("[Nupload] No se encontr\xF3 el token sesz"), null;
      let m = d + "?s=" + g;
      console.log("[Nupload] Siguiendo redirecci\xF3n de la URL construida...");
      let f = yield D(m, { "User-Agent": S }), x = { "User-Agent": S, Referer: "https://nupload.me/", Origin: "https://nupload.me" }, w = "Unknown";
      return console.log(`[Nupload] URL encontrada (${w}): ${f.substring(0, 80)}...`), { url: f, quality: w, headers: x };
    } catch (t) {
      return console.log(`[Nupload] Error: ${t.message}`), null;
    }
  });
}
var N = "439c478a771f35c05022f9feabcca01c", R = "https://seriesflixhd.buzz", L = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function h(n) {
  return n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function M(n, o) {
  return p(this, null, function* () {
    let t = null;
    try {
      let s = `https://api.themoviedb.org/3/${o}/${n}?api_key=${N}&language=es-ES`, r = yield fetch(s).then((e) => e.json());
      t = o === "movie" ? r.title : r.name;
    } catch (s) {
    }
    for (let s of ["es-MX", "en-US"])
      try {
        let r = `https://api.themoviedb.org/3/${o}/${n}?api_key=${N}&language=${s}`, e = yield fetch(r).then((c) => c.json()), l = o === "movie" ? e.title : e.name, i = o === "movie" ? e.original_title : e.original_name;
        if (s === "es-MX" && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(l))
          continue;
        let a = (e.release_date || e.first_air_date || "").substring(0, 4);
        return console.log(`[SeriesFlixHD] TMDB (${s}): "${l}" (${a})`), { title: l, originalTitle: i, year: a, titleEs: t };
      } catch (r) {
      }
    return null;
  });
}
function k(n) {
  return p(this, null, function* () {
    let o = `${R}/episodio/${n}`;
    try {
      let t = yield fetch(o, { headers: { "User-Agent": L, Accept: "text/html" } });
      return t.ok ? yield t.text() : null;
    } catch (t) {
      return console.log(`[SeriesFlixHD] fetch error: ${t.message}`), null;
    }
  });
}
function z(n) {
  let o = { latino: [], castellano: [] }, t = n.match(/LATINO[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/), s = n.match(/CASTELLANO[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/), r = (e) => e ? [...e.matchAll(/data-url="([^"]+)"/g)].map((l) => {
    try {
      return atob(l[1]);
    } catch (i) {
      return console.log(`[SeriesFlixHD] Error decodificando base64: ${i.message}`), null;
    }
  }).filter(Boolean).filter((l) => l.includes("nupload.me/watch/")) : [];
  return o.latino = r(t == null ? void 0 : t[1]), o.castellano = r(s == null ? void 0 : s[1]), o;
}
function _(n, o, t, s) {
  return p(this, null, function* () {
    if (!n || o !== "tv")
      return [];
    let r = Date.now();
    console.log(`[SeriesFlixHD] Buscando: TMDB ${n} S${t}E${s}`);
    try {
      let e = yield M(n, o);
      if (!e)
        return [];
      let l = String(s), i = parseInt(t), a = [];
      e.title && (a.push(`${h(e.title)}-${i}x${l}`), a.push(`${h(e.title)}-${e.year}-${i}x${l}`)), e.originalTitle && e.originalTitle !== e.title && (a.push(`${h(e.originalTitle)}-${i}x${l}`), a.push(`${h(e.originalTitle)}-${e.year}-${i}x${l}`)), e.titleEs && e.titleEs !== e.title && (a.push(`${h(e.titleEs)}-${i}x${l}`), a.push(`${h(e.titleEs)}-${e.year}-${i}x${l}`));
      let c = null;
      for (let f of a)
        if (console.log(`[SeriesFlixHD] Probando: /episodio/${f}`), c = yield k(f), c && c.includes("data-url"))
          break;
      if (!c || !c.includes("data-url"))
        return console.log("[SeriesFlixHD] No encontrado"), [];
      let d = z(c);
      console.log(`[SeriesFlixHD] Latino: ${d.latino.length} | Castellano: ${d.castellano.length}`);
      let g = [];
      for (let [f, x] of [[d.latino, "Latino"], [d.castellano, "Castellano"]]) {
        if (f.length === 0)
          continue;
        let $ = (yield Promise.allSettled(f.map((u) => y(u)))).filter((u) => u.status === "fulfilled" && u.value).map((u, B) => ({ name: "SeriesFlixHD", title: `${u.value.quality} \xB7 ${x} \xB7 Nupload`, url: u.value.url, quality: u.value.quality, headers: u.value.headers }));
        if (g.push(...$), $.length > 0)
          break;
      }
      let m = ((Date.now() - r) / 1e3).toFixed(2);
      return console.log(`[SeriesFlixHD] \u2713 ${g.length} streams en ${m}s`), g;
    } catch (e) {
      return console.log(`[SeriesFlixHD] Error: ${e.message}`), [];
    }
  });
}
