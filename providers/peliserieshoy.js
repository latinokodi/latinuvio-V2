var $ = Object.defineProperty, C = Object.defineProperties, E = Object.getOwnPropertyDescriptor, D = Object.getOwnPropertyDescriptors, M = Object.getOwnPropertyNames, _ = Object.getOwnPropertySymbols;
var A = Object.prototype.hasOwnProperty, N = Object.prototype.propertyIsEnumerable;
var k = (t, e, r) => e in t ? $(t, e, { enumerable: true, configurable: true, writable: true, value: r }) : t[e] = r, S = (t, e) => {
  for (var r in e || (e = {}))
    A.call(e, r) && k(t, r, e[r]);
  if (_)
    for (var r of _(e))
      N.call(e, r) && k(t, r, e[r]);
  return t;
}, y = (t, e) => C(t, D(e));
var b = (t, e) => {
  for (var r in e)
    $(t, r, { get: e[r], enumerable: true });
}, B = (t, e, r, p) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let n of M(e))
      !A.call(t, n) && n !== r && $(t, n, { get: () => e[n], enumerable: !(p = E(e, n)) || p.enumerable });
  return t;
};
var I = (t) => B($({}, "__esModule", { value: true }), t);
var P = (t, e, r) => new Promise((p, n) => {
  var u = (a) => {
    try {
      l(r.next(a));
    } catch (g) {
      n(g);
    }
  }, d = (a) => {
    try {
      l(r.throw(a));
    } catch (g) {
      n(g);
    }
  }, l = (a) => a.done ? p(a.value) : Promise.resolve(a.value).then(u, d);
  l((r = r.apply(t, e)).next());
});
var j = {};
b(j, { getStreams: () => W });
module.exports = I(j);
var T = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", c = "https://player.pelisserieshoy.com", H = "439c478a771f35c05022f9feabcca01c", z = ["LAT", "ESP", "SUB"];
function O(t, e) {
  return P(this, null, function* () {
    let r = e === "movie" ? `https://api.themoviedb.org/3/movie/${t}/external_ids?api_key=${H}` : `https://api.themoviedb.org/3/tv/${t}/external_ids?api_key=${H}`;
    return (yield fetch(r, { headers: { "User-Agent": T } }).then((n) => n.json())).imdb_id || null;
  });
}
function W(t, e, r, p) {
  return P(this, null, function* () {
    if (!t || !e)
      return [];
    let n = Date.now();
    console.log(`[PelisSeriesHoy] Buscando: TMDB ${t} (${e})`);
    try {
      let x2 = function(o, m, f) {
        return P(this, null, function* () {
          try {
            let s = yield fetch(`${c}/s.php`, { method: "POST", headers: y(S({}, a), { Referer: l }), body: new URLSearchParams({ a: "2", v: m, tok: v }).toString() }).then((i) => i.json());
            if (s.u && s.sig) {
              let i = `${c}/p.php?url=${encodeURIComponent(s.u)}&sig=${encodeURIComponent(s.sig)}`, h = o.replace(/[^a-zA-Z0-9 ]/g, "").trim() || s.src || "Server";
              return { name: "PelisSeriesHoy", title: `1080p \xB7 ${f} \xB7 ${h}`, url: i, quality: "1080p", headers: { Referer: c } };
            }
            if (s.u && !s.sig) {
              let i = s.u.startsWith("http") ? s.u : `${c}${s.u}`, h = o.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Player";
              return { name: "PelisSeriesHoy", title: `1080p \xB7 ${f} \xB7 ${h}`, url: i, quality: "1080p", headers: { Referer: c } };
            }
            if (s.type === "mp4" && s.u) {
              let i = o.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Directo";
              return { name: "PelisSeriesHoy", title: `1080p \xB7 ${f} \xB7 ${i}`, url: s.u, quality: "1080p", headers: { Referer: c } };
            }
          } catch (s) {
            console.log(`[PelisSeriesHoy] Error en resolver ${o}: ${s.message}`);
          }
          return null;
        });
      };
      var x = x2;
      let u = yield O(t, e);
      if (!u)
        return [];
      let d = u;
      if (e === "tv") {
        let o = String(p).padStart(2, "0");
        d = `${u}-${parseInt(r)}x${o}`;
      }
      let l = `${c}/f/${d}`;
      console.log(`[PelisSeriesHoy] Fetching HTML: ${l}`);
      let a = { "User-Agent": T, Referer: "https://sololatino.net/", "Content-Type": "application/x-www-form-urlencoded" }, U = (yield fetch(l, { headers: a }).then((o) => o.text())).match(/const _t\s*=\s*'([^']+)'/);
      if (!U)
        return console.log("[PelisSeriesHoy] No se encontr\xF3 el token de sesi\xF3n (_t)"), [];
      let v = U[1];
      yield fetch(`${c}/s.php`, { method: "POST", headers: y(S({}, a), { Referer: l }), body: new URLSearchParams({ a: "click", tok: v }).toString() });
      let w = yield fetch(`${c}/s.php`, { method: "POST", headers: y(S({}, a), { Referer: l }), body: new URLSearchParams({ a: "1", tok: v }).toString() }).then((o) => o.json());
      if (!w || !w.langs_s)
        return [];
      let R = [];
      for (let o of z) {
        let m = w.langs_s[o];
        if (!m || m.length === 0)
          continue;
        let f = o === "LAT" ? "Latino" : o === "ESP" ? "Espa\xF1ol" : "Subtitulado";
        console.log(`[PelisSeriesHoy] Resolviendo ${m.length} servidores en ${f}...`);
        let i = (yield Promise.all(m.map((h) => x2(h[0], h[1], f)))).filter((h) => h !== null);
        if (i.length > 0) {
          R.push(...i);
          break;
        }
      }
      let L = ((Date.now() - n) / 1e3).toFixed(2);
      return console.log(`[PelisSeriesHoy] \u2713 ${R.length} streams en ${L}s`), R;
    } catch (u) {
      return console.error(`[PelisSeriesHoy] Error: ${u.message}`), [];
    }
  });
}
