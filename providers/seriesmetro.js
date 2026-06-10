var $ = Object.defineProperty, _ = Object.defineProperties, F = Object.getOwnPropertyDescriptor, P = Object.getOwnPropertyDescriptors, C = Object.getOwnPropertyNames, A = Object.getOwnPropertySymbols;
var R = Object.prototype.hasOwnProperty, N = Object.prototype.propertyIsEnumerable;
var U = (n, t, e) => t in n ? $(n, t, { enumerable: true, configurable: true, writable: true, value: e }) : n[t] = e, m = (n, t) => {
  for (var e in t || (t = {}))
    R.call(t, e) && U(n, e, t[e]);
  if (A)
    for (var e of A(t))
      N.call(t, e) && U(n, e, t[e]);
  return n;
}, x = (n, t) => _(n, P(t));
var W = (n, t) => {
  for (var e in t)
    $(n, e, { get: t[e], enumerable: true });
}, D = (n, t, e, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of C(t))
      !R.call(n, o) && o !== e && $(n, o, { get: () => t[o], enumerable: !(r = F(t, o)) || r.enumerable });
  return n;
};
var q = (n) => D($({}, "__esModule", { value: true }), n);
var p = (n, t, e) => new Promise((r, o) => {
  var a = (i) => {
    try {
      c(e.next(i));
    } catch (u) {
      o(u);
    }
  }, s = (i) => {
    try {
      c(e.throw(i));
    } catch (u) {
      o(u);
    }
  }, c = (i) => i.done ? r(i.value) : Promise.resolve(i.value).then(a, s);
  c((e = e.apply(n, t)).next());
});
var V = {};
W(V, { getStreams: () => J });
module.exports = q(V);
var z = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function K(n, t) {
  return n >= 3840 || t >= 2160 ? "4K" : n >= 1920 || t >= 1080 ? "1080p" : n >= 1280 || t >= 720 ? "720p" : n >= 854 || t >= 480 ? "480p" : "360p";
}
function k(e) {
  return p(this, arguments, function* (n, t = {}) {
    try {
      let o = yield (yield fetch(n, { headers: m({ "User-Agent": z }, t), redirect: "follow" })).text();
      if (!o.includes("#EXT-X-STREAM-INF")) {
        let c = n.match(/[_-](\d{3,4})p/);
        return c ? `${c[1]}p` : "Unknown";
      }
      let a = 0, s = 0;
      for (let c of o.split(`
`)) {
        let i = c.match(/RESOLUTION=(\d+)x(\d+)/);
        if (i) {
          let u = parseInt(i[2]);
          u > s && (s = u, a = parseInt(i[1]));
        }
      }
      return s > 0 ? K(a, s) : "Unknown";
    } catch (r) {
      return "Unknown";
    }
  });
}
var M = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function O(n) {
  let t = n.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)\)\)/);
  if (!t)
    return null;
  let [, e, r, o, a] = t;
  for (r = parseInt(r), o = parseInt(o), a = a.split("|"); o--; )
    a[o] && (e = e.replace(new RegExp("\\b" + o.toString(r) + "\\b", "g"), a[o]));
  return e;
}
function L(n) {
  return p(this, null, function* () {
    var t;
    try {
      let r = yield (yield fetch(n, { headers: { "User-Agent": M, Referer: "https://www3.seriesmetro.net/" }, redirect: "follow" })).text(), o = O(r);
      if (!o)
        return null;
      let a = (t = o.match(/file:"(https?:\/\/[^"]+\.m3u8[^"]*)"/)) == null ? void 0 : t[1];
      if (!a)
        return null;
      let s = yield k(a, { Referer: "https://fastream.to/", "User-Agent": M });
      return { url: a, quality: s, headers: { "User-Agent": M, Referer: "https://fastream.to/" } };
    } catch (e) {
      return console.error("[Fastream] Error:", e), null;
    }
  });
}
var B = "439c478a771f35c05022f9feabcca01c", v = "https://www3.seriesmetro.net", G = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", E = { "User-Agent": G, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9", Connection: "keep-alive", "Upgrade-Insecure-Requests": "1" }, I = ["latino", "lat", "castellano", "espa\xF1ol", "esp", "vose", "sub", "subtitulado"], H = { latino: "Latino", lat: "Latino", castellano: "Espa\xF1ol", espa\u00F1ol: "Espa\xF1ol", esp: "Espa\xF1ol", vose: "Subtitulado", sub: "Subtitulado", subtitulado: "Subtitulado" };
function b(n) {
  return n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function Q(n, t) {
  return p(this, null, function* () {
    let [e, r, o] = yield Promise.all(["es-ES", "es-MX", "en-US"].map((l) => fetch(`https://api.themoviedb.org/3/${t}/${n}?api_key=${B}&language=${l}`).then((d) => d.json()).catch(() => null))), a = e ? t === "movie" ? e.title : e.name : null, s = r && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(t === "movie" ? r.title : r.name) ? r : o;
    if (!s)
      return null;
    let c = t === "movie" ? s.title : s.name, i = t === "movie" ? s.original_title : s.original_name;
    return console.log(`[SeriesMetro] TMDB (${s === r ? "Latino" : "Ingl\xE9s"}): "${c}"`), { title: c, originalTitle: i, titleEs: a };
  });
}
function X(n, t) {
  return p(this, null, function* () {
    let { title: e, originalTitle: r, titleEs: o } = n, a = t === "movie" ? "pelicula" : "serie", s = [];
    e && s.push(b(e)), r && r !== e && s.push(b(r)), o && o !== e && s.push(b(o));
    try {
      return yield Promise.any(s.map((c) => p(this, null, function* () {
        let i = `${v}/${a}/${c}/`, u = yield fetch(i, { headers: E }).then((l) => l.text());
        if (!u.includes("trembed=") && !u.includes("data-post="))
          throw new Error("not found");
        return console.log(`[SeriesMetro] \u2713 Encontrado: /${a}/${c}/`), { url: i, html: u };
      })));
    } catch (c) {
      return console.log("[SeriesMetro] No encontrado por slug"), null;
    }
  });
}
function Y(n, t, e, r) {
  return p(this, null, function* () {
    var a;
    let o = (a = t.match(/data-post="(\d+)"/)) == null ? void 0 : a[1];
    if (!o)
      return console.log("[SeriesMetro] No se encontr\xF3 data-post"), null;
    try {
      let s = new URLSearchParams({ action: "action_select_season", post: o, season: String(e) }), l = [...(yield (yield fetch(`${v}/wp-admin/admin-ajax.php`, { method: "POST", headers: x(m({}, E), { "Content-Type": "application/x-www-form-urlencoded", Referer: n }), body: s.toString() })).text()).matchAll(/href="([^"]+\/capitulo\/[^"]+)"/g)].map((d) => d[1]).find((d) => {
        let f = d.match(/temporada-(\d+)-capitulo-(\d+)/i);
        return f && parseInt(f[1]) === e && parseInt(f[2]) === r;
      });
      return l ? (console.log(`[SeriesMetro] \u2713 Episodio S${e}E${r} encontrado: ${l}`), l) : (console.log(`[SeriesMetro] Episodio S${e}E${r} no encontrado`), null);
    } catch (s) {
      return console.log(`[SeriesMetro] Error getEpisodeUrl: ${s.message}`), null;
    }
  });
}
function j(n, t) {
  return p(this, null, function* () {
    var u;
    let e = yield fetch(n, { headers: x(m({}, E), { Referer: t }) }).then((l) => l.text()), r = [...e.matchAll(/href="#options-(\d+)"[^>]*>[\s\S]*?<span class="server">([\s\S]*?)<\/span>/g)], o = [...e.matchAll(/\?trembed=(\d+)(?:&#038;|&)trid=(\d+)(?:&#038;|&)trtype=(\d+)/g)];
    if (o.length === 0 || r.length === 0)
      return [];
    let a = o[0][2], s = o[0][3], c = r.sort(([, , l], [, , d]) => {
      let f = l.replace(/<[^>]+>/g, "").split("-").pop().trim().toLowerCase(), S = d.replace(/<[^>]+>/g, "").split("-").pop().trim().toLowerCase(), h = I.indexOf(f), g = I.indexOf(S);
      return (h === -1 ? 99 : h) - (g === -1 ? 99 : g);
    }), i = [];
    for (let [, l, d] of c) {
      let S = d.replace(/<[^>]+>/g, "").trim().split("-").pop().trim().toLowerCase(), h = H[S] || S;
      try {
        let y = (u = (yield fetch(`${v}/?trembed=${l}&trid=${a}&trtype=${s}`, { headers: x(m({}, E), { Referer: n }) }).then((T) => T.text())).match(/<iframe[^>]*src="(https?:\/\/fastream\.to\/[^"]+)"/i)) == null ? void 0 : u[1];
        if (!y)
          continue;
        let w = yield L(y);
        if (!w)
          continue;
        if (i.push({ name: "SeriesMetro", title: `${w.quality} \xB7 ${h} \xB7 Fastream`, url: w.url, quality: w.quality, headers: w.headers }), h === "Latino")
          return console.log("[SeriesMetro] Latino encontrado, retornando"), i;
      } catch (g) {
        console.log(`[SeriesMetro] Error embed ${l}: ${g.message}`);
      }
    }
    return i;
  });
}
function J(n, t, e, r) {
  return p(this, null, function* () {
    if (!n || !t)
      return [];
    let o = Date.now();
    console.log(`[SeriesMetro] Buscando: TMDB ${n} (${t})${e ? ` S${e}E${r}` : ""}`);
    try {
      let a = yield Q(n, t);
      if (!a)
        return [];
      let s = yield X(a, t);
      if (!s)
        return [];
      let c = s.url;
      if (t === "tv" && e && r) {
        let l = yield Y(s.url, s.html, e, r);
        if (!l)
          return console.log(`[SeriesMetro] Episodio S${e}E${r} no encontrado`), [];
        console.log(`[SeriesMetro] Episodio: ${l}`), c = l;
      }
      let i = yield j(c, c), u = ((Date.now() - o) / 1e3).toFixed(2);
      return console.log(`[SeriesMetro] \u2713 ${i.length} streams en ${u}s`), i;
    } catch (a) {
      return console.log(`[SeriesMetro] Error: ${a.message}`), [];
    }
  });
}
