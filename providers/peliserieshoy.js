var v = Object.defineProperty, C = Object.defineProperties, N = Object.getOwnPropertyDescriptor, O = Object.getOwnPropertyDescriptors, z = Object.getOwnPropertyNames, _ = Object.getOwnPropertySymbols;
var H = Object.prototype.hasOwnProperty, B = Object.prototype.propertyIsEnumerable;
var A = (e, t, n) => t in e ? v(e, t, { enumerable: true, configurable: true, writable: true, value: n }) : e[t] = n, S = (e, t) => {
  for (var n in t || (t = {}))
    H.call(t, n) && A(e, n, t[n]);
  if (_)
    for (var n of _(t))
      B.call(t, n) && A(e, n, t[n]);
  return e;
}, P = (e, t) => C(e, O(t));
var D = (e, t) => {
  for (var n in t)
    v(e, n, { get: t[n], enumerable: true });
}, F = (e, t, n, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of z(t))
      !H.call(e, o) && o !== n && v(e, o, { get: () => t[o], enumerable: !(r = N(t, o)) || r.enumerable });
  return e;
};
var K = (e) => F(v({}, "__esModule", { value: true }), e);
var m = (e, t, n) => new Promise((r, o) => {
  var i = (s) => {
    try {
      a(n.next(s));
    } catch (h) {
      o(h);
    }
  }, d = (s) => {
    try {
      a(n.throw(s));
    } catch (h) {
      o(h);
    }
  }, a = (s) => s.done ? r(s.value) : Promise.resolve(s.value).then(i, d);
  a((n = n.apply(e, t)).next());
});
var ee = {};
D(ee, { getStreams: () => V });
module.exports = K(ee);
var Q = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", y = { vimeos: { h: "720p", n: "480p" }, goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" }, vidhide: { n: "720p", l: "480p" }, streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" }, voe: { n: "720p", l: "360p" } }, j = ["x", "o", "h", "n", "l"];
function q(e) {
  return e.includes("vimeos") ? y.vimeos : e.includes("goodstream") ? y.goodstream : e.includes("cloudwindow-route") ? y.voe : e.includes("minochinos") || e.includes("vidhide") || e.includes("dintezuvio") || e.includes("dramiyos") ? y.vidhide : e.includes("premilkyway") || e.includes("hlswish") || e.includes("vibuxer") || e.includes("streamwish") ? y.streamwish : null;
}
function M(n) {
  return m(this, arguments, function* (e, t = {}) {
    let r = Y(e);
    return r !== "Unknown" ? r : yield X(e, t);
  });
}
function Y(e) {
  if (!e)
    return "Unknown";
  let t = q(e);
  if (t) {
    let r = e.match(/_,([a-z,]+),\.urlset/);
    if (r) {
      let o = r[1].split(",").filter(Boolean);
      for (let i of j)
        if (o.includes(i) && t[i])
          return t[i];
    }
  }
  let n = e.match(/[_\-\/](\d{3,4})p/);
  return n ? n[1] + "p" : "Unknown";
}
function G(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function X(n) {
  return m(this, arguments, function* (e, t = {}) {
    try {
      let o = yield (yield fetch(e, { headers: S({ "User-Agent": Q }, t), redirect: "follow" })).text();
      if (!o.includes("#EXT-X-STREAM-INF")) {
        let a = e.match(/[_-](\d{3,4})p/);
        return a ? `${a[1]}p` : "Unknown";
      }
      let i = 0, d = 0;
      for (let a of o.split(`
`)) {
        let s = a.match(/RESOLUTION=(\d+)x(\d+)/);
        if (s) {
          let h = parseInt(s[2]);
          h > d && (d = h, i = parseInt(s[1]));
        }
      }
      return d > 0 ? G(i, d) : "Unknown";
    } catch (r) {
      return "Unknown";
    }
  });
}
var I = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", f = "https://player.pelisserieshoy.com", b = "439c478a771f35c05022f9feabcca01c", Z = ["LAT", "ESP", "SUB"];
function J(e, t) {
  return m(this, null, function* () {
    let n = t === "movie" ? `https://api.themoviedb.org/3/movie/${e}/external_ids?api_key=${b}` : `https://api.themoviedb.org/3/tv/${e}/external_ids?api_key=${b}`;
    return (yield fetch(n, { headers: { "User-Agent": I } }).then((o) => o.json())).imdb_id || null;
  });
}
function V(e, t, n, r) {
  return m(this, null, function* () {
    if (!e || !t)
      return [];
    let o = Date.now();
    console.log(`[PelisSeriesHoy] Buscando: TMDB ${e} (${t})`);
    try {
      let L2 = function(l, g, $) {
        return m(this, null, function* () {
          try {
            let u = yield fetch(`${f}/s.php`, { method: "POST", headers: P(S({}, s), { Referer: a }), body: new URLSearchParams({ a: "2", v: g, tok: R }).toString() }).then((k) => k.json());
            if (!u || !u.u)
              return null;
            let c = u.u;
            c.startsWith("/") && (c = `${f}${c}`);
            let p = l.replace(/[^a-zA-Z0-9 ]/g, "").trim() || u.src || "Server", w = u.quality || u.q || (yield M(c)), W = c.includes("sprintcdn") || c.includes("r66nv9ed") || p.toLowerCase().includes("filemoon");
            if (c.includes("p.php?v=") || W)
              return console.log(`[PelisSeriesHoy] \u{1F5D1}\uFE0F Descartando servidor problem\xE1tico (HTML/Filemoon): ${p}`), null;
            if (u.sig) {
              let k = `${f}/p.php?url=${encodeURIComponent(c)}&sig=${encodeURIComponent(u.sig)}`;
              return { name: "PelisSeriesHoy", title: `${w} \xB7 ${$} \xB7 ${p}`, url: k, quality: w, headers: { Referer: f } };
            }
            return u.type === "mp4" || c.includes(".mp4") || c.includes(".m3u8") ? { name: "PelisSeriesHoy", title: `${w} \xB7 ${$} \xB7 ${p}`, url: c, quality: w, headers: { Referer: f } } : null;
          } catch (u) {
            console.log(`[PelisSeriesHoy] Error en resolver ${l}: ${u.message}`);
          }
          return null;
        });
      };
      var L = L2;
      let i = yield J(e, t);
      if (!i)
        return [];
      let d = i;
      if (t === "tv") {
        let l = String(r).padStart(2, "0");
        d = `${i}-${parseInt(n)}x${l}`;
      }
      let a = `${f}/f/${d}`;
      console.log(`[PelisSeriesHoy] Fetching HTML: ${a}`);
      let s = { "User-Agent": I, Referer: "https://sololatino.net/", "Content-Type": "application/x-www-form-urlencoded" }, T = (yield fetch(a, { headers: s }).then((l) => l.text())).match(/const _t\s*=\s*'([^']+)'/);
      if (!T)
        return console.log("[PelisSeriesHoy] No se encontr\xF3 el token de sesi\xF3n (_t)"), [];
      let R = T[1];
      yield fetch(`${f}/s.php`, { method: "POST", headers: P(S({}, s), { Referer: a }), body: new URLSearchParams({ a: "click", tok: R }).toString() });
      let U = yield fetch(`${f}/s.php`, { method: "POST", headers: P(S({}, s), { Referer: a }), body: new URLSearchParams({ a: "1", tok: R }).toString() }).then((l) => l.json());
      if (!U || !U.langs_s)
        return [];
      let x = [];
      for (let l of Z) {
        let g = U.langs_s[l];
        if (!g || g.length === 0)
          continue;
        let $ = l === "LAT" ? "Latino" : l === "ESP" ? "Espa\xF1ol" : "Subtitulado";
        console.log(`[PelisSeriesHoy] Resolviendo ${g.length} servidores en ${$}...`);
        let c = (yield Promise.all(g.map((p) => L2(p[0], p[1], $)))).filter((p) => p !== null);
        if (c.length > 0) {
          x.push(...c);
          break;
        }
      }
      let E = ((Date.now() - o) / 1e3).toFixed(2);
      return console.log(`[PelisSeriesHoy] \u2713 ${x.length} streams en ${E}s`), x;
    } catch (i) {
      return console.error(`[PelisSeriesHoy] Error: ${i.message}`), [];
    }
  });
}
