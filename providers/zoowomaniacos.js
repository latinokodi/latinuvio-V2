var y = Object.defineProperty, U = Object.defineProperties, x = Object.getOwnPropertyDescriptor, M = Object.getOwnPropertyDescriptors, L = Object.getOwnPropertyNames, v = Object.getOwnPropertySymbols;
var k = Object.prototype.hasOwnProperty, Z = Object.prototype.propertyIsEnumerable;
var R = (t, e, o) => e in t ? y(t, e, { enumerable: true, configurable: true, writable: true, value: o }) : t[e] = o, T = (t, e) => {
  for (var o in e || (e = {}))
    k.call(e, o) && R(t, o, e[o]);
  if (v)
    for (var o of v(e))
      Z.call(e, o) && R(t, o, e[o]);
  return t;
}, A = (t, e) => U(t, M(e));
var D = (t, e) => {
  for (var o in e)
    y(t, o, { get: e[o], enumerable: true });
}, W = (t, e, o, s) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let i of L(e))
      !k.call(t, i) && i !== o && y(t, i, { get: () => e[i], enumerable: !(s = x(e, i)) || s.enumerable });
  return t;
};
var N = (t) => W(y({}, "__esModule", { value: true }), t);
var d = (t, e, o) => new Promise((s, i) => {
  var c = (n) => {
    try {
      l(o.next(n));
    } catch (a) {
      i(a);
    }
  }, r = (n) => {
    try {
      l(o.throw(n));
    } catch (a) {
      i(a);
    }
  }, l = (n) => n.done ? s(n.value) : Promise.resolve(n.value).then(c, r);
  l((o = o.apply(t, e)).next());
});
var z = {};
D(z, { getStreams: () => j });
module.exports = N(z);
var b = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function S(t) {
  return d(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": b, Accept: "text/html", Referer: "https://ok.ru/" }, redirect: "follow" }).then((a) => a.text());
      if (e.includes("copyrightsRestricted") || e.includes("COPYRIGHTS_RESTRICTED") || e.includes("LIMITED_ACCESS") || e.includes("notFound") || !e.includes("urls"))
        return console.log("[OkRu] Video no disponible o eliminado"), null;
      let s = [...e.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "").matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)], i = ["full", "hd", "sd", "low", "lowest"], c = s.map((a) => ({ type: a[1], url: a[2] })).filter((a) => !a.type.toLowerCase().includes("mobile") && a.url.startsWith("http"));
      if (c.length === 0)
        return console.log("[OkRu] No se encontraron URLs"), null;
      let l = c.sort((a, u) => {
        let g = i.findIndex((m) => a.type.toLowerCase().includes(m)), h = i.findIndex((m) => u.type.toLowerCase().includes(m));
        return (g === -1 ? 99 : g) - (h === -1 ? 99 : h);
      })[0];
      console.log(`[OkRu] URL encontrada (${l.type}): ${l.url.substring(0, 80)}...`);
      let n = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return { url: l.url, quality: n[l.type] || l.type, headers: { "User-Agent": b, Referer: "https://ok.ru/" } };
    } catch (e) {
      return console.log(`[OkRu] Error: ${e.message}`), null;
    }
  });
}
var O = "439c478a771f35c05022f9feabcca01c", w = "https://proyectox.yoyatengoabuela.com", $ = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", q = { "User-Agent": $, Accept: "application/json, text/javascript, */*", Connection: "keep-alive", Referer: w + "/", Origin: w, "X-Requested-With": "XMLHttpRequest" };
function B(t, e) {
  return d(this, null, function* () {
    let o = [{ lang: "es-MX", name: "Latino" }, { lang: "es-ES", name: "Espa\xF1a" }, { lang: "en-US", name: "Ingl\xE9s" }];
    for (let { lang: s, name: i } of o)
      try {
        let c = `https://api.themoviedb.org/3/${e}/${t}?api_key=${O}&language=${s}`, r = yield fetch(c, { headers: { "User-Agent": $ } }).then((a) => a.json()), l = e === "movie" ? r.title : r.name, n = e === "movie" ? r.original_title : r.original_name;
        if (!l || s === "es-MX" && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(l))
          continue;
        return console.log(`[Zoowomaniacos] TMDB (${i}): "${l}"`), { title: l, originalTitle: n, year: (r.release_date || "").substring(0, 4) };
      } catch (c) {
        console.log(`[Zoowomaniacos] Error TMDB ${i}: ${c.message}`);
      }
    return null;
  });
}
function C(t) {
  return d(this, null, function* () {
    try {
      let e = new URLSearchParams({ start: "0", length: "20", metodo: "ObtenerListaTotal", "search[value]": t }).toString(), s = yield (yield fetch(`${w}/alternativo3/server.php`, { method: "POST", headers: A(T({}, q), { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }), body: e })).json();
      return (s == null ? void 0 : s.data) || [];
    } catch (e) {
      return console.log(`[Zoowomaniacos] Error b\xFAsqueda: ${e.message}`), [];
    }
  });
}
function p(t = "") {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function E(t = "") {
  return p(t).split(" ").filter(Boolean);
}
function _(t) {
  var r, l, n;
  let e = (r = t.title) == null ? void 0 : r.trim(), o = (l = t.originalTitle) == null ? void 0 : l.trim(), s = (n = t.year) == null ? void 0 : n.trim(), i = [e && s ? `${e} ${s}` : null, e, o && s && o !== e ? `${o} ${s}` : null, o && o !== e ? o : null], c = /* @__PURE__ */ new Set();
  return i.filter(Boolean).filter((a) => {
    let u = p(a);
    return !u || c.has(u) ? false : (c.add(u), true);
  });
}
function F(t, e) {
  let o = p(t.a2 || ""), s = [e.title, e.originalTitle].filter(Boolean).map(p), i = Number(e.year), c = Number(t.a4), r = -9999;
  for (let l of s) {
    let n = 0, a = E(l), u = E(o), g = l.length <= 3;
    o === l && (n += 500);
    let h = a.filter((f) => u.includes(f));
    n += h.length * 40;
    let m = a.length === 1;
    if (m && (u.includes(a[0]) ? n += 150 : n -= 300, u.length > 2 && (n -= 200)), a.length > 0 && a.every((f) => u.includes(f))) {
      let f = a.length / u.length;
      m ? n += 150 : f >= 0.6 ? n += 550 : f >= 0.4 ? n += 300 : n += 100;
    }
    if (!g) {
      let f = a.length / u.length;
      o.includes(l) && f >= 0.4 && (n += 120), l.includes(o) && (n += 60);
    }
    if (g && o !== l && (n -= 250), !isNaN(i) && !isNaN(c)) {
      let f = Math.abs(i - c);
      f === 0 ? n += 150 : f === 1 ? n += 75 : f === 2 ? n += 25 : f <= 5 ? n -= f * 15 : n -= f * 60;
    }
    e.originalTitle && o.includes(p(e.originalTitle)) && (n += 80), r = Math.max(r, n);
  }
  return r;
}
function P(t, e) {
  if (!Array.isArray(t) || t.length === 0)
    return null;
  let s = t.map((i) => ({ r: i, score: F(i, e) })).sort((i, c) => c.score - i.score)[0];
  return !s || s.score < 550 ? null : { result: s.r, score: s.score };
}
function Y(t) {
  return d(this, null, function* () {
    try {
      let o = yield (yield fetch(`${w}/testplayer.php?id=${t}`, { headers: { "User-Agent": $, Referer: w + "/" } })).text(), s = [...new Set([...o.matchAll(/src=["'](https?:\/\/[^"']+)["']/g)].map((r) => r[1]))], i = s.filter((r) => r.includes("ok.ru/videoembed/")), c = s.filter((r) => r.includes("archive.org") && (r.endsWith(".mp4") || r.endsWith(".mkv") || r.endsWith(".avi")));
      return { okru: i, archive: c };
    } catch (e) {
      return console.log(`[Zoowomaniacos] Error player: ${e.message}`), { okru: [], archive: [] };
    }
  });
}
function j(t, e) {
  return d(this, null, function* () {
    if (!t || e !== "movie")
      return [];
    let o = Date.now();
    console.log(`[Zoowomaniacos] Buscando: TMDB ${t}`);
    try {
      let s = yield B(t, e);
      if (!s)
        return [];
      let i = _(s), c = null, r = -1 / 0;
      for (let u of i) {
        console.log(`[Zoowomaniacos] Buscando: "${u}"`);
        let g = yield C(u);
        if (!g.length)
          continue;
        let h = P(g, s);
        if (h) {
          if (console.log(`[Zoowomaniacos] Candidato: "${h.result.a2}" | score=${h.score}`), h.score >= 600) {
            c = h.result, r = h.score;
            break;
          }
          h.score > r && (r = h.score, c = h.result);
        }
      }
      if (!c)
        return console.log(`[Zoowomaniacos] No se encontr\xF3 resultado con score suficiente (mejor: ${r})`), [];
      console.log(`[Zoowomaniacos] Seleccionado: "${c.a2}" (${c.a4}) | score=${r}`);
      let { okru: l, archive: n } = yield Y(c.a1);
      if (l.length === 0 && n.length === 0)
        return console.log("[Zoowomaniacos] No hay embeds v\xE1lidos"), [];
      let a = [];
      l.length > 0 && (console.log(`[Zoowomaniacos] Resolviendo ${l.length} embeds ok.ru...`), (yield Promise.allSettled(l.map((g) => S(g)))).filter((g) => g.status === "fulfilled" && g.value).forEach((g) => a.push({ name: "Zoowomaniacos", title: `${g.value.quality} \xB7 OkRu`, url: g.value.url, quality: g.value.quality, headers: g.value.headers || {} })));
      for (let u of n)
        a.push({ name: "Zoowomaniacos", title: "SD \xB7 Archive.org", url: u, quality: "SD", headers: { "User-Agent": $ } });
      return console.log(`[Zoowomaniacos] \u2713 ${a.length} streams en ${((Date.now() - o) / 1e3).toFixed(2)}s`), a;
    } catch (s) {
      return console.log(`[Zoowomaniacos] Error cr\xEDtico: ${s.message}`), [];
    }
  });
}
