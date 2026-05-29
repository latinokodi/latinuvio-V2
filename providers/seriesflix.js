var S = Object.defineProperty;
var A = Object.getOwnPropertyDescriptor;
var v = Object.getOwnPropertyNames;
var b = Object.prototype.hasOwnProperty;
var F = (n, o) => {
  for (var t in o)
    S(n, t, { get: o[t], enumerable: true });
}, T = (n, o, t, r) => {
  if (o && typeof o == "object" || typeof o == "function")
    for (let l of v(o))
      !b.call(n, l) && l !== t && S(n, l, { get: () => o[l], enumerable: !(r = A(o, l)) || r.enumerable });
  return n;
};
var D = (n) => T(S({}, "__esModule", { value: true }), n);
var d = (n, o, t) => new Promise((r, l) => {
  var e = (s) => {
    try {
      i(t.next(s));
    } catch (c) {
      l(c);
    }
  }, a = (s) => {
    try {
      i(t.throw(s));
    } catch (c) {
      l(c);
    }
  }, i = (s) => s.done ? r(s.value) : Promise.resolve(s.value).then(e, a);
  i((t = t.apply(n, o)).next());
});
var W = {};
F(W, { getStreams: () => M });
module.exports = D(W);
var E = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", U = "https://nupload.me";
function N(n) {
  return d(this, null, function* () {
    var o;
    try {
      console.log(`[Nupload] Resolviendo: ${n}`);
      let t = yield fetch(n, { headers: { "User-Agent": E, Referer: U + "/" } }), r = yield t.text();
      if (!t.ok)
        throw new Error(`HTTP ${t.status} al cargar el embed`);
      let l = r.match(/([A-Za-z]+)\.forEach\s*\(function\s+\w+\s*\(value\)\s*\{[^}]+atob/);
      if (!l)
        return console.log("[Nupload] No se encontr\xF3 patr\xF3n de ofuscaci\xF3n ni iframe."), null;
      let e = l[1], a = r.match(new RegExp(e + "\\.forEach[^-]+-\\s*(\\d+)"));
      if (!a)
        return console.log("[Nupload] No se pudo extraer el offset num\xE9rico"), null;
      let i = parseInt(a[1]), s = r.match(new RegExp("var\\s+" + e + "\\s*=\\s*(\\[[^\\]]+\\])"));
      if (!s)
        return console.log("[Nupload] No se encontr\xF3 el array de valores ofuscados"), null;
      let c = JSON.parse(s[1]), p = "";
      c.forEach((u) => {
        p += String.fromCharCode(parseInt(atob(u).replace(/\D/g, "")) - i);
      });
      let g = (o = r.match(/var sesz\s*=\s*"([^"]+)"/)) == null ? void 0 : o[1];
      if (!g)
        return console.log("[Nupload] No se encontr\xF3 el token sesz"), null;
      let x = p + "?s=" + g;
      console.log("[Nupload] Siguiendo redirecci\xF3n de la URL construida...");
      let f = yield fetch(x, { headers: { "User-Agent": E }, redirect: "follow" });
      if (!f.ok)
        throw new Error(`HTTP ${f.status} al seguir la redirecci\xF3n final`);
      let m = f.url, w = { "User-Agent": E, Referer: "https://nupload.me/", Origin: "https://nupload.me" }, $ = "Calidad desconocida";
      return console.log(`[Nupload] URL encontrada (${$}): ${m.substring(0, 80)}...`), { url: m, quality: $, headers: w };
    } catch (t) {
      return console.log(`[Nupload] Error: ${t.message}`), null;
    }
  });
}
var y = "439c478a771f35c05022f9feabcca01c", H = "https://seriesflixhd.buzz", L = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function h(n) {
  return n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function z(n, o) {
  return d(this, null, function* () {
    let t = null;
    try {
      let r = `https://api.themoviedb.org/3/${o}/${n}?api_key=${y}&language=es-ES`, l = yield fetch(r).then((e) => e.json());
      t = o === "movie" ? l.title : l.name;
    } catch (r) {
    }
    for (let r of ["es-MX", "en-US"])
      try {
        let l = `https://api.themoviedb.org/3/${o}/${n}?api_key=${y}&language=${r}`, e = yield fetch(l).then((c) => c.json()), a = o === "movie" ? e.title : e.name, i = o === "movie" ? e.original_title : e.original_name;
        if (r === "es-MX" && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(a))
          continue;
        let s = (e.release_date || e.first_air_date || "").substring(0, 4);
        return console.log(`[SeriesFlixHD] TMDB (${r}): "${a}" (${s})`), { title: a, originalTitle: i, year: s, titleEs: t };
      } catch (l) {
      }
    return null;
  });
}
function R(n) {
  return d(this, null, function* () {
    let o = `${H}/episodio/${n}`;
    try {
      let t = yield fetch(o, { headers: { "User-Agent": L, Accept: "text/html" } });
      return t.ok ? yield t.text() : null;
    } catch (t) {
      return console.log(`[SeriesFlixHD] fetch error: ${t.message}`), null;
    }
  });
}
function _(n) {
  let o = { latino: [], castellano: [] }, t = n.match(/LATINO[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/), r = n.match(/CASTELLANO[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/), l = (e) => e ? [...e.matchAll(/data-url="([^"]+)"/g)].map((a) => {
    try {
      return Buffer.from(a[1], "base64").toString("utf8");
    } catch (i) {
      return null;
    }
  }).filter(Boolean).filter((a) => a.includes("nupload.me/watch/")) : [];
  return o.latino = l(t == null ? void 0 : t[1]), o.castellano = l(r == null ? void 0 : r[1]), o;
}
function M(n, o, t, r) {
  return d(this, null, function* () {
    if (!n || o !== "tv")
      return [];
    let l = Date.now();
    console.log(`[SeriesFlixHD] Buscando: TMDB ${n} S${t}E${r}`);
    try {
      let e = yield z(n, o);
      if (!e)
        return [];
      let a = String(r), i = parseInt(t), s = [];
      e.title && (s.push(`${h(e.title)}-${i}x${a}`), s.push(`${h(e.title)}-${e.year}-${i}x${a}`)), e.originalTitle && e.originalTitle !== e.title && (s.push(`${h(e.originalTitle)}-${i}x${a}`), s.push(`${h(e.originalTitle)}-${e.year}-${i}x${a}`)), e.titleEs && e.titleEs !== e.title && (s.push(`${h(e.titleEs)}-${i}x${a}`), s.push(`${h(e.titleEs)}-${e.year}-${i}x${a}`));
      let c = null;
      for (let f of s)
        if (console.log(`[SeriesFlixHD] Probando: /episodio/${f}`), c = yield R(f), c && c.includes("data-url"))
          break;
      if (!c || !c.includes("data-url"))
        return console.log("[SeriesFlixHD] No encontrado"), [];
      let p = _(c);
      console.log(`[SeriesFlixHD] Latino: ${p.latino.length} | Castellano: ${p.castellano.length}`);
      let g = [];
      for (let [f, m] of [[p.latino, "Latino"], [p.castellano, "Castellano"]]) {
        if (f.length === 0)
          continue;
        let $ = (yield Promise.allSettled(f.map((u) => N(u)))).filter((u) => u.status === "fulfilled" && u.value).map((u, k) => ({ name: "SeriesFlixHD", title: `${u.value.quality} \xB7 ${m} \xB7 Nupload`, url: u.value.url, quality: u.value.quality, headers: u.value.headers }));
        if (g.push(...$), $.length > 0)
          break;
      }
      let x = ((Date.now() - l) / 1e3).toFixed(2);
      return console.log(`[SeriesFlixHD] \u2713 ${g.length} streams en ${x}s`), g;
    } catch (e) {
      return console.log(`[SeriesFlixHD] Error: ${e.message}`), [];
    }
  });
}
