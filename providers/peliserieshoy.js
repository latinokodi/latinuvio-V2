var S = Object.defineProperty, C = Object.defineProperties, D = Object.getOwnPropertyDescriptor, B = Object.getOwnPropertyDescriptors, I = Object.getOwnPropertyNames, _ = Object.getOwnPropertySymbols;
var T = Object.prototype.hasOwnProperty, F = Object.prototype.propertyIsEnumerable;
var L = (t, e, s) => e in t ? S(t, e, { enumerable: true, configurable: true, writable: true, value: s }) : t[e] = s, y = (t, e) => {
  for (var s in e || (e = {}))
    T.call(e, s) && L(t, s, e[s]);
  if (_)
    for (var s of _(e))
      F.call(e, s) && L(t, s, e[s]);
  return t;
}, P = (t, e) => C(t, B(e));
var N = (t, e) => {
  for (var s in e)
    S(t, s, { get: e[s], enumerable: true });
}, O = (t, e, s, u) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let n of I(e))
      !T.call(t, n) && n !== s && S(t, n, { get: () => e[n], enumerable: !(u = D(e, n)) || u.enumerable });
  return t;
};
var W = (t) => O(S({}, "__esModule", { value: true }), t);
var v = (t, e, s) => new Promise((u, n) => {
  var d = (r) => {
    try {
      l(s.next(r));
    } catch ($) {
      n($);
    }
  }, f = (r) => {
    try {
      l(s.throw(r));
    } catch ($) {
      n($);
    }
  }, l = (r) => r.done ? u(r.value) : Promise.resolve(r.value).then(d, f);
  l((s = s.apply(t, e)).next());
});
var z = {};
N(z, { getStreams: () => K });
module.exports = W(z);
var b = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", h = "https://player.pelisserieshoy.com", A = "439c478a771f35c05022f9feabcca01c", j = ["LAT", "ESP", "SUB"];
function q(t, e) {
  return v(this, null, function* () {
    let s = e === "movie" ? `https://api.themoviedb.org/3/movie/${t}/external_ids?api_key=${A}` : `https://api.themoviedb.org/3/tv/${t}/external_ids?api_key=${A}`;
    return (yield fetch(s, { headers: { "User-Agent": b } }).then((n) => n.json())).imdb_id || null;
  });
}
function K(t, e, s, u) {
  return v(this, null, function* () {
    if (!t || !e)
      return [];
    let n = Date.now();
    console.log(`[PelisSeriesHoy] Buscando: TMDB ${t} (${e})`);
    try {
      let x2 = function(i, p, m) {
        return v(this, null, function* () {
          try {
            let a = yield fetch(`${h}/s.php`, { method: "POST", headers: P(y({}, r), { Referer: l }), body: new URLSearchParams({ a: "2", v: p, tok: w }).toString() }).then((k) => k.json());
            if (!a || !a.u)
              return null;
            let o = a.u;
            o.startsWith("/") && (o = `${h}${o}`);
            let c = i.replace(/[^a-zA-Z0-9 ]/g, "").trim() || a.src || "Server", g = a.quality || a.q || "Unknown", M = o.includes("sprintcdn") || o.includes("r66nv9ed") || c.toLowerCase().includes("filemoon");
            if (o.includes("p.php?v=") || M)
              return console.log(`[PelisSeriesHoy] \u{1F5D1}\uFE0F Descartando servidor problem\xE1tico (HTML/Filemoon): ${c}`), null;
            if (a.sig) {
              let k = `${h}/p.php?url=${encodeURIComponent(o)}&sig=${encodeURIComponent(a.sig)}`;
              return { name: "PelisSeriesHoy", title: `${g} \xB7 ${m} \xB7 ${c}`, url: k, quality: g, headers: { Referer: h } };
            }
            return a.type === "mp4" || o.includes(".mp4") || o.includes(".m3u8") ? { name: "PelisSeriesHoy", title: `${g} \xB7 ${m} \xB7 ${c}`, url: o, quality: g, headers: { Referer: h } } : null;
          } catch (a) {
            console.log(`[PelisSeriesHoy] Error en resolver ${i}: ${a.message}`);
          }
          return null;
        });
      };
      var x = x2;
      let d = yield q(t, e);
      if (!d)
        return [];
      let f = d;
      if (e === "tv") {
        let i = String(u).padStart(2, "0");
        f = `${d}-${parseInt(s)}x${i}`;
      }
      let l = `${h}/f/${f}`;
      console.log(`[PelisSeriesHoy] Fetching HTML: ${l}`);
      let r = { "User-Agent": b, Referer: "https://sololatino.net/", "Content-Type": "application/x-www-form-urlencoded" }, H = (yield fetch(l, { headers: r }).then((i) => i.text())).match(/const _t\s*=\s*'([^']+)'/);
      if (!H)
        return console.log("[PelisSeriesHoy] No se encontr\xF3 el token de sesi\xF3n (_t)"), [];
      let w = H[1];
      yield fetch(`${h}/s.php`, { method: "POST", headers: P(y({}, r), { Referer: l }), body: new URLSearchParams({ a: "click", tok: w }).toString() });
      let R = yield fetch(`${h}/s.php`, { method: "POST", headers: P(y({}, r), { Referer: l }), body: new URLSearchParams({ a: "1", tok: w }).toString() }).then((i) => i.json());
      if (!R || !R.langs_s)
        return [];
      let U = [];
      for (let i of j) {
        let p = R.langs_s[i];
        if (!p || p.length === 0)
          continue;
        let m = i === "LAT" ? "Latino" : i === "ESP" ? "Espa\xF1ol" : "Subtitulado";
        console.log(`[PelisSeriesHoy] Resolviendo ${p.length} servidores en ${m}...`);
        let o = (yield Promise.all(p.map((c) => x2(c[0], c[1], m)))).filter((c) => c !== null);
        if (o.length > 0) {
          U.push(...o);
          break;
        }
      }
      let E = ((Date.now() - n) / 1e3).toFixed(2);
      return console.log(`[PelisSeriesHoy] \u2713 ${U.length} streams en ${E}s`), U;
    } catch (d) {
      return console.error(`[PelisSeriesHoy] Error: ${d.message}`), [];
    }
  });
}
