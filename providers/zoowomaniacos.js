var y = Object.defineProperty, U = Object.defineProperties, x = Object.getOwnPropertyDescriptor, L = Object.getOwnPropertyDescriptors, M = Object.getOwnPropertyNames, v = Object.getOwnPropertySymbols;
var k = Object.prototype.hasOwnProperty, W = Object.prototype.propertyIsEnumerable;
var R = (t, e, o) => e in t ? y(t, e, { enumerable: true, configurable: true, writable: true, value: o }) : t[e] = o, A = (t, e) => {
  for (var o in e || (e = {}))
    k.call(e, o) && R(t, o, e[o]);
  if (v)
    for (var o of v(e))
      W.call(e, o) && R(t, o, e[o]);
  return t;
}, T = (t, e) => U(t, L(e));
var Z = (t, e) => {
  for (var o in e)
    y(t, o, { get: e[o], enumerable: true });
}, D = (t, e, o, n) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let i of M(e))
      !k.call(t, i) && i !== o && y(t, i, { get: () => e[i], enumerable: !(n = x(e, i)) || n.enumerable });
  return t;
};
var N = (t) => D(y({}, "__esModule", { value: true }), t);
var d = (t, e, o) => new Promise((n, i) => {
  var r = (s) => {
    try {
      c(o.next(s));
    } catch (l) {
      i(l);
    }
  }, a = (s) => {
    try {
      c(o.throw(s));
    } catch (l) {
      i(l);
    }
  }, c = (s) => s.done ? n(s.value) : Promise.resolve(s.value).then(r, a);
  c((o = o.apply(t, e)).next());
});
var z = {};
Z(z, { getStreams: () => j });
module.exports = N(z);
var b = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function S(t) {
  return d(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": b, Accept: "text/html", Referer: "https://ok.ru/" }, redirect: "follow" }).then((l) => l.text());
      if (e.includes("copyrightsRestricted") || e.includes("COPYRIGHTS_RESTRICTED") || e.includes("LIMITED_ACCESS") || e.includes("notFound") || !e.includes("urls"))
        return console.log("[OkRu] Video no disponible o eliminado"), null;
      let n = [...e.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "").matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)], i = ["full", "hd", "sd", "low", "lowest"], r = n.map((l) => ({ type: l[1], url: l[2] })).filter((l) => !l.type.toLowerCase().includes("mobile") && l.url.startsWith("http"));
      if (r.length === 0)
        return console.log("[OkRu] No se encontraron URLs"), null;
      let c = r.sort((l, u) => {
        let f = i.findIndex((p) => l.type.toLowerCase().includes(p)), h = i.findIndex((p) => u.type.toLowerCase().includes(p));
        return (f === -1 ? 99 : f) - (h === -1 ? 99 : h);
      })[0];
      console.log(`[OkRu] URL encontrada (${c.type}): ${c.url.substring(0, 80)}...`);
      let s = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return { url: c.url, quality: s[c.type] || c.type, headers: { "User-Agent": b, Referer: "https://ok.ru/" } };
    } catch (e) {
      return console.log(`[OkRu] Error: ${e.message}`), null;
    }
  });
}
var O = "439c478a771f35c05022f9feabcca01c", w = "https://proyectox.yoyatengoabuela.com", $ = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", q = { "User-Agent": $, Accept: "application/json, text/javascript, */*", Connection: "keep-alive", Referer: w + "/", Origin: w, "X-Requested-With": "XMLHttpRequest" };
function C(t, e) {
  return d(this, null, function* () {
    let [o, n, i] = yield Promise.all(["es-MX", "es-ES", "en-US"].map((l) => fetch(`https://api.themoviedb.org/3/${e}/${t}?api_key=${O}&language=${l}`, { headers: { "User-Agent": $ } }).then((u) => u.json()).catch(() => null))), r = o && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(o.title || o.name || "") ? o : n || i;
    if (!r)
      return null;
    let a = e === "movie" ? r.title : r.name, c = e === "movie" ? r.original_title : r.original_name;
    return a ? (console.log(`[Zoowomaniacos] TMDB (${r === o ? "Latino" : r === n ? "Espa\xF1a" : "Ingl\xE9s"}): "${a}"`), { title: a, originalTitle: c, year: (r.release_date || "").substring(0, 4) }) : null;
  });
}
function _(t) {
  return d(this, null, function* () {
    try {
      let e = new URLSearchParams({ start: "0", length: "20", metodo: "ObtenerListaTotal", "search[value]": t }).toString(), n = yield (yield fetch(`${w}/alternativo3/server.php`, { method: "POST", headers: T(A({}, q), { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }), body: e })).json();
      return (n == null ? void 0 : n.data) || [];
    } catch (e) {
      return console.log(`[Zoowomaniacos] Error b\xFAsqueda: ${e.message}`), [];
    }
  });
}
function m(t = "") {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function E(t = "") {
  return m(t).split(" ").filter(Boolean);
}
function B(t) {
  var a, c, s;
  let e = (a = t.title) == null ? void 0 : a.trim(), o = (c = t.originalTitle) == null ? void 0 : c.trim(), n = (s = t.year) == null ? void 0 : s.trim(), i = [e && n ? `${e} ${n}` : null, e, o && n && o !== e ? `${o} ${n}` : null, o && o !== e ? o : null], r = /* @__PURE__ */ new Set();
  return i.filter(Boolean).filter((l) => {
    let u = m(l);
    return !u || r.has(u) ? false : (r.add(u), true);
  });
}
function F(t, e) {
  let o = m(t.a2 || ""), n = [e.title, e.originalTitle].filter(Boolean).map(m), i = Number(e.year), r = Number(t.a4), a = -9999;
  for (let c of n) {
    let s = 0, l = E(c), u = E(o), f = c.length <= 3;
    o === c && (s += 500);
    let h = l.filter((g) => u.includes(g));
    s += h.length * 40;
    let p = l.length === 1;
    if (p && (u.includes(l[0]) ? s += 150 : s -= 300, u.length > 2 && (s -= 200)), l.length > 0 && l.every((g) => u.includes(g))) {
      let g = l.length / u.length;
      p ? s += 150 : g >= 0.6 ? s += 550 : g >= 0.4 ? s += 300 : s += 100;
    }
    if (!f) {
      let g = l.length / u.length;
      o.includes(c) && g >= 0.4 && (s += 120), c.includes(o) && (s += 60);
    }
    if (f && o !== c && (s -= 250), !isNaN(i) && !isNaN(r)) {
      let g = Math.abs(i - r);
      g === 0 ? s += 150 : g === 1 ? s += 75 : g === 2 ? s += 25 : g <= 5 ? s -= g * 15 : s -= g * 60;
    }
    e.originalTitle && o.includes(m(e.originalTitle)) && (s += 80), a = Math.max(a, s);
  }
  return a;
}
function P(t, e) {
  if (!Array.isArray(t) || t.length === 0)
    return null;
  let n = t.map((i) => ({ r: i, score: F(i, e) })).sort((i, r) => r.score - i.score)[0];
  return !n || n.score < 550 ? null : { result: n.r, score: n.score };
}
function Y(t) {
  return d(this, null, function* () {
    try {
      let o = yield (yield fetch(`${w}/testplayer.php?id=${t}`, { headers: { "User-Agent": $, Referer: w + "/" } })).text(), n = [...new Set([...o.matchAll(/src=["'](https?:\/\/[^"']+)["']/g)].map((a) => a[1]))], i = n.filter((a) => a.includes("ok.ru/videoembed/")), r = n.filter((a) => a.includes("archive.org") && (a.endsWith(".mp4") || a.endsWith(".mkv") || a.endsWith(".avi")));
      return { okru: i, archive: r };
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
      let n = yield C(t, e);
      if (!n)
        return [];
      let i = B(n), r = null, a = -1 / 0;
      for (let u of i) {
        console.log(`[Zoowomaniacos] Buscando: "${u}"`);
        let f = yield _(u);
        if (!f.length)
          continue;
        let h = P(f, n);
        if (h) {
          if (console.log(`[Zoowomaniacos] Candidato: "${h.result.a2}" | score=${h.score}`), h.score >= 600) {
            r = h.result, a = h.score;
            break;
          }
          h.score > a && (a = h.score, r = h.result);
        }
      }
      if (!r)
        return console.log(`[Zoowomaniacos] No se encontr\xF3 resultado con score suficiente (mejor: ${a})`), [];
      console.log(`[Zoowomaniacos] Seleccionado: "${r.a2}" (${r.a4}) | score=${a}`);
      let { okru: c, archive: s } = yield Y(r.a1);
      if (c.length === 0 && s.length === 0)
        return console.log("[Zoowomaniacos] No hay embeds v\xE1lidos"), [];
      let l = [];
      c.length > 0 && (console.log(`[Zoowomaniacos] Resolviendo ${c.length} embeds ok.ru...`), (yield Promise.allSettled(c.map((f) => S(f)))).filter((f) => f.status === "fulfilled" && f.value).forEach((f) => l.push({ name: "Zoowomaniacos", title: `${f.value.quality} \xB7 OkRu`, url: f.value.url, quality: f.value.quality, headers: f.value.headers || {} })));
      for (let u of s)
        l.push({ name: "Zoowomaniacos", title: "SD \xB7 Archive.org", url: u, quality: "SD", headers: { "User-Agent": $ } });
      return console.log(`[Zoowomaniacos] \u2713 ${l.length} streams en ${((Date.now() - o) / 1e3).toFixed(2)}s`), l;
    } catch (n) {
      return console.log(`[Zoowomaniacos] Error cr\xEDtico: ${n.message}`), [];
    }
  });
}
