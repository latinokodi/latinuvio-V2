var p = Object.defineProperty, E = Object.defineProperties, U = Object.getOwnPropertyDescriptor, L = Object.getOwnPropertyDescriptors, S = Object.getOwnPropertyNames, y = Object.getOwnPropertySymbols;
var R = Object.prototype.hasOwnProperty, b = Object.prototype.propertyIsEnumerable;
var v = (t, e, o) => e in t ? p(t, e, { enumerable: true, configurable: true, writable: true, value: o }) : t[e] = o, $ = (t, e) => {
  for (var o in e || (e = {}))
    R.call(e, o) && v(t, o, e[o]);
  if (y)
    for (var o of y(e))
      b.call(e, o) && v(t, o, e[o]);
  return t;
}, A = (t, e) => E(t, L(e));
var x = (t, e) => {
  for (var o in e)
    p(t, o, { get: e[o], enumerable: true });
}, D = (t, e, o, s) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let r of S(e))
      !R.call(t, r) && r !== o && p(t, r, { get: () => e[r], enumerable: !(s = U(e, r)) || s.enumerable });
  return t;
};
var O = (t) => D(p({}, "__esModule", { value: true }), t);
var g = (t, e, o) => new Promise((s, r) => {
  var l = (i) => {
    try {
      a(o.next(i));
    } catch (c) {
      r(c);
    }
  }, n = (i) => {
    try {
      a(o.throw(i));
    } catch (c) {
      r(c);
    }
  }, a = (i) => i.done ? s(i.value) : Promise.resolve(i.value).then(l, n);
  a((o = o.apply(t, e)).next());
});
var B = {};
x(B, { getStreams: () => P });
module.exports = O(B);
var T = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function k(t) {
  return g(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${t}`);
      let e = yield fetch(t, { headers: { "User-Agent": T, Accept: "text/html", Referer: "https://ok.ru/" }, redirect: "follow" }).then((c) => c.text());
      if (e.includes("copyrightsRestricted") || e.includes("COPYRIGHTS_RESTRICTED") || e.includes("LIMITED_ACCESS") || e.includes("notFound") || !e.includes("urls"))
        return console.log("[OkRu] Video no disponible o eliminado"), null;
      let s = [...e.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "").matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)], r = ["full", "hd", "sd", "low", "lowest"], l = s.map((c) => ({ type: c[1], url: c[2] })).filter((c) => !c.type.toLowerCase().includes("mobile") && c.url.startsWith("http"));
      if (l.length === 0)
        return console.log("[OkRu] No se encontraron URLs"), null;
      let a = l.sort((c, h) => {
        let u = r.findIndex((f) => c.type.toLowerCase().includes(f)), w = r.findIndex((f) => h.type.toLowerCase().includes(f));
        return (u === -1 ? 99 : u) - (w === -1 ? 99 : w);
      })[0];
      console.log(`[OkRu] URL encontrada (${a.type}): ${a.url.substring(0, 80)}...`);
      let i = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return { url: a.url, quality: i[a.type] || a.type, headers: { "User-Agent": T, Referer: "https://ok.ru/" } };
    } catch (e) {
      return console.log(`[OkRu] Error: ${e.message}`), null;
    }
  });
}
var Z = "439c478a771f35c05022f9feabcca01c", d = "https://proyectox.yoyatengoabuela.com", m = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", C = { "User-Agent": m, Accept: "application/json, text/javascript, */*", Connection: "keep-alive", Referer: d + "/", Origin: d, "X-Requested-With": "XMLHttpRequest" }, M = ["332656282246", "1683045747235"];
function _(t, e) {
  return g(this, null, function* () {
    let o = [{ lang: "es-MX", name: "Latino" }, { lang: "en-US", name: "Ingl\xE9s" }];
    for (let { lang: s, name: r } of o)
      try {
        let l = `https://api.themoviedb.org/3/${e}/${t}?api_key=${Z}&language=${s}`, n = yield fetch(l, { headers: { "User-Agent": m } }).then((c) => c.json()), a = e === "movie" ? n.title : n.name, i = e === "movie" ? n.original_title : n.original_name;
        if (!a || s === "es-MX" && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(a))
          continue;
        return console.log(`[Zoowomaniacos] TMDB (${r}): "${a}"`), { title: a, originalTitle: i, year: (n.release_date || "").substring(0, 4) };
      } catch (l) {
        console.log(`[Zoowomaniacos] Error TMDB ${r}: ${l.message}`);
      }
    return null;
  });
}
function q(t) {
  return g(this, null, function* () {
    try {
      let e = new URLSearchParams({ start: "0", length: "10", metodo: "ObtenerListaTotal", "search[value]": t, "searchPanes[a3][0]": "", "searchPanes[a4][0]": "", "searchPanes[a5][0]": "", "searchPanes[a6][0]": "" }).toString(), o = yield fetch(`${d}/alternativo3/server.php`, { method: "POST", headers: A($({}, C), { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Content-Length": e.length.toString() }), body: e }).then((s) => s.json());
      return (o == null ? void 0 : o.data) || [];
    } catch (e) {
      return console.log(`[Zoowomaniacos] Error b\xFAsqueda: ${e.message}`), [];
    }
  });
}
function W(t, e) {
  if (t.length === 0)
    return null;
  if (t.length === 1)
    return t[0];
  let o = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(), s = o(e.title), r = e.originalTitle ? o(e.originalTitle) : "", l = t.map((n) => {
    let a = o((n.a2 || "").split("-")[0].trim()), i = 0;
    return a === s || a === r ? i += 3 : (a.includes(s) || s.includes(a)) && (i += 1.5), e.year && n.a4 === e.year && (i += 1), { r: n, score: i };
  });
  return l.sort((n, a) => a.score - n.score), l[0].r;
}
function F(t) {
  return g(this, null, function* () {
    try {
      let o = [...(yield fetch(`${d}/testplayer.php?id=${t}`, { headers: { "User-Agent": m, Accept: "text/html", Referer: d + "/" } }).then((n) => n.text())).matchAll(/src="(https?:\/\/[^"]+)"/g)], s = [...new Set(o.map((n) => n[1]))], r = s.filter((n) => {
        if (!n.includes("ok.ru/videoembed/"))
          return false;
        let a = n.split("/").pop();
        return !M.includes(a);
      }), l = s.filter((n) => n.includes("archive.org") && (n.endsWith(".mp4") || n.endsWith(".mkv") || n.endsWith(".avi")));
      return { okru: r, archive: l };
    } catch (e) {
      return console.log(`[Zoowomaniacos] Error player: ${e.message}`), { okru: [], archive: [] };
    }
  });
}
function P(t, e) {
  return g(this, null, function* () {
    if (!t || e !== "movie")
      return [];
    let o = Date.now();
    console.log(`[Zoowomaniacos] Buscando: TMDB ${t}`);
    try {
      let s = yield _(t, e);
      if (!s)
        return [];
      let r = [s.title];
      s.originalTitle && s.originalTitle !== s.title && r.push(s.originalTitle);
      let l = null;
      for (let h of r) {
        let u = yield q(h);
        if (u.length > 0 && (l = W(u, s), l)) {
          console.log(`[Zoowomaniacos] \u2713 Encontrado: "${l.a2}" (${l.a4}) id:${l.a1}`);
          break;
        }
      }
      if (!l)
        return console.log("[Zoowomaniacos] No encontrado"), [];
      let { okru: n, archive: a } = yield F(l.a1);
      if (n.length === 0 && a.length === 0)
        return console.log("[Zoowomaniacos] No hay embeds v\xE1lidos"), [];
      let i = [];
      n.length > 0 && (console.log(`[Zoowomaniacos] Resolviendo ${n.length} embeds ok.ru...`), (yield Promise.allSettled(n.map((u) => k(u)))).filter((u) => u.status === "fulfilled" && u.value).forEach((u) => i.push({ name: "Zoowomaniacos", title: `${u.value.quality} \xB7 OkRu`, url: u.value.url, quality: u.value.quality, headers: u.value.headers || {} })));
      for (let h of a)
        console.log(`[Zoowomaniacos] Archive.org directo: ${h.substring(0, 60)}...`), i.push({ name: "Zoowomaniacos", title: "SD \xB7 Archive.org", url: h, quality: "SD", headers: { "User-Agent": m } });
      let c = ((Date.now() - o) / 1e3).toFixed(2);
      return console.log(`[Zoowomaniacos] \u2713 ${i.length} streams en ${c}s`), i;
    } catch (s) {
      return console.log(`[Zoowomaniacos] Error: ${s.message}`), [];
    }
  });
}
