var F = Object.create;
var x = Object.defineProperty, z = Object.defineProperties, K = Object.getOwnPropertyDescriptor, X = Object.getOwnPropertyDescriptors, J = Object.getOwnPropertyNames, P = Object.getOwnPropertySymbols, Q = Object.getPrototypeOf, _ = Object.prototype.hasOwnProperty, Y = Object.prototype.propertyIsEnumerable;
var b = (e, t, o) => t in e ? x(e, t, { enumerable: true, configurable: true, writable: true, value: o }) : e[t] = o, y = (e, t) => {
  for (var o in t || (t = {}))
    _.call(t, o) && b(e, o, t[o]);
  if (P)
    for (var o of P(t))
      Y.call(t, o) && b(e, o, t[o]);
  return e;
}, O = (e, t) => z(e, X(t));
var Z = (e, t) => {
  for (var o in t)
    x(e, o, { get: t[o], enumerable: true });
}, C = (e, t, o, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let s of J(t))
      !_.call(e, s) && s !== o && x(e, s, { get: () => t[s], enumerable: !(r = K(t, s)) || r.enumerable });
  return e;
};
var ee = (e, t, o) => (o = e != null ? F(Q(e)) : {}, C(t || !e || !e.__esModule ? x(o, "default", { value: e, enumerable: true }) : o, e)), te = (e) => C(x({}, "__esModule", { value: true }), e);
var d = (e, t, o) => new Promise((r, s) => {
  var a = (i) => {
    try {
      c(o.next(i));
    } catch (n) {
      s(n);
    }
  }, l = (i) => {
    try {
      c(o.throw(i));
    } catch (n) {
      s(n);
    }
  }, c = (i) => i.done ? r(i.value) : Promise.resolve(i.value).then(a, l);
  c((o = o.apply(e, t)).next());
});
var xe = {};
Z(xe, { getStreams: () => Re });
module.exports = te(xe);
var oe = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", $ = { vimeos: { h: "720p", n: "480p" }, goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" }, vidhide: { n: "720p", l: "480p" }, streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" }, voe: { n: "720p", l: "360p" } }, ne = ["x", "o", "h", "n", "l"];
function se(e) {
  return e.includes("vimeos") ? $.vimeos : e.includes("goodstream") ? $.goodstream : e.includes("cloudwindow-route") ? $.voe : e.includes("minochinos") || e.includes("vidhide") || e.includes("dintezuvio") || e.includes("dramiyos") ? $.vidhide : e.includes("premilkyway") || e.includes("hlswish") || e.includes("vibuxer") || e.includes("streamwish") ? $.streamwish : null;
}
function A(e) {
  if (!e)
    return "Unknown";
  let t = se(e);
  if (t) {
    let r = e.match(/_,([a-z,]+),\.urlset/);
    if (r) {
      let s = r[1].split(",").filter(Boolean);
      for (let a of ne)
        if (s.includes(a) && t[a])
          return t[a];
    }
  }
  let o = e.match(/[_\-\/](\d{3,4})p/);
  return o ? o[1] + "p" : "Unknown";
}
function re(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function D(o) {
  return d(this, arguments, function* (e, t = {}) {
    try {
      let s = yield (yield fetch(e, { headers: y({ "User-Agent": oe }, t), redirect: "follow" })).text();
      if (!s.includes("#EXT-X-STREAM-INF")) {
        let c = e.match(/[_-](\d{3,4})p/);
        return c ? `${c[1]}p` : "Unknown";
      }
      let a = 0, l = 0;
      for (let c of s.split(`
`)) {
        let i = c.match(/RESOLUTION=(\d+)x(\d+)/);
        if (i) {
          let n = parseInt(i[2]);
          n > l && (l = n, a = parseInt(i[1]));
        }
      }
      return l > 0 ? re(a, l) : "Unknown";
    } catch (r) {
      return "Unknown";
    }
  });
}
var ie = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function M(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function ae(e, t) {
  try {
    let r = t.replace(/^\[|\]$/g, "").split("','").map((n) => n.replace(/^'+|'+$/g, "")).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s = "";
    for (let n of e) {
      let u = n.charCodeAt(0);
      u > 64 && u < 91 ? u = (u - 52) % 26 + 65 : u > 96 && u < 123 && (u = (u - 84) % 26 + 97), s += String.fromCharCode(u);
    }
    for (let n of r)
      s = s.replace(new RegExp(n, "g"), "_");
    s = s.split("_").join("");
    let a = M(s);
    if (!a)
      return null;
    let l = "";
    for (let n = 0; n < a.length; n++)
      l += String.fromCharCode((a.charCodeAt(n) - 3 + 256) % 256);
    let c = l.split("").reverse().join(""), i = M(c);
    return i ? JSON.parse(i) : null;
  } catch (o) {
    return console.log("[VOE] voeDecode error:", o.message), null;
  }
}
function T(o) {
  return d(this, arguments, function* (e, t = {}) {
    return yield fetch(e, { method: "GET", headers: y({ "User-Agent": ie, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, t), redirect: "follow" });
  });
}
function I(e) {
  return d(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let t = yield T(e, { Referer: e });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let o = yield t.text();
      if (/permanentToken/i.test(o)) {
        let i = o.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (i) {
          console.log(`[VOE] Permanent token redirect -> ${i[1]}`);
          let n = yield T(i[1], { Referer: e });
          n.ok && (o = yield n.text());
        }
      }
      let r = o.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (r) {
        let i = r[1], n = r[2].startsWith("http") ? r[2] : new URL(r[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${n}`);
        let u = yield T(n, { Referer: e }), m = u.ok ? yield u.text() : "", f = m.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || m.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (f) {
          let p = ae(i, f[1]);
          if (p && (p.source || p.direct_access_url)) {
            let h = p.source || p.direct_access_url, w = A(h);
            return console.log(`[VOE] URL encontrada: ${h.substring(0, 80)}...`), { url: h, quality: w, headers: { Referer: e } };
          }
        }
      }
      let s = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, a = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, l = [], c;
      for (; (c = s.exec(o)) !== null; )
        l.push(c);
      for (; (c = a.exec(o)) !== null; )
        l.push(c);
      for (let i of l) {
        let n = i[1];
        if (!n)
          continue;
        let u = n;
        if (u.startsWith("aHR0"))
          try {
            u = atob(u);
          } catch (m) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${u.substring(0, 80)}...`), { url: u, quality: A(u), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[VOE] Error: ${t.message}`), null;
    }
  });
}
var B = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function W(e) {
  return d(this, null, function* () {
    try {
      console.log(`[OkRu] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": B, Accept: "text/html", Referer: "https://ok.ru/" }, redirect: "follow" }).then((n) => n.text());
      if (t.includes("copyrightsRestricted") || t.includes("COPYRIGHTS_RESTRICTED") || t.includes("LIMITED_ACCESS") || t.includes("notFound") || !t.includes("urls"))
        return console.log("[OkRu] Video no disponible o eliminado"), null;
      let r = [...t.replace(/\\&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\/g, "").matchAll(/"name":"([^"]+)","url":"([^"]+)"/g)], s = ["full", "hd", "sd", "low", "lowest"], a = r.map((n) => ({ type: n[1], url: n[2] })).filter((n) => !n.type.toLowerCase().includes("mobile") && n.url.startsWith("http"));
      if (a.length === 0)
        return console.log("[OkRu] No se encontraron URLs"), null;
      let c = a.sort((n, u) => {
        let m = s.findIndex((p) => n.type.toLowerCase().includes(p)), f = s.findIndex((p) => u.type.toLowerCase().includes(p));
        return (m === -1 ? 99 : m) - (f === -1 ? 99 : f);
      })[0];
      console.log(`[OkRu] URL encontrada (${c.type}): ${c.url.substring(0, 80)}...`);
      let i = { full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
      return { url: c.url, quality: i[c.type] || c.type, headers: { "User-Agent": B, Referer: "https://ok.ru/" } };
    } catch (t) {
      return console.log(`[OkRu] Error: ${t.message}`), null;
    }
  });
}
var g = ee(require("crypto-js"));
var E = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36", N = g.default.enc.Hex.parse("6b69656d7469656e6d75613931316361"), H = g.default.enc.Hex.parse("313233343536373839306f6975797472");
function ce(e) {
  return g.default.AES.encrypt(JSON.stringify(e), N, { iv: H, mode: g.default.mode.CBC, padding: g.default.pad.Pkcs7 }).ciphertext.toString(g.default.enc.Hex);
}
function le(e) {
  let t = g.default.lib.CipherParams.create({ ciphertext: g.default.enc.Hex.parse(e) }), o = g.default.AES.decrypt(t, N, { iv: H, mode: g.default.mode.CBC, padding: g.default.pad.Pkcs7 });
  return JSON.parse(o.toString(g.default.enc.Utf8));
}
function k(e, t) {
  return d(this, null, function* () {
    if (typeof XMLHttpRequest != "undefined")
      return new Promise((o, r) => {
        let s = new XMLHttpRequest();
        s.open("GET", e), s.responseType = "text";
        for (let [a, l] of Object.entries(t))
          s.setRequestHeader(a, l);
        s.onload = () => {
          if (s.status >= 200 && s.status < 300) {
            let a = s.getResponseHeader("set-cookie") || "";
            o({ text: s.responseText, cookie: a });
          } else
            r(new Error(`HTTP ${s.status}`));
        }, s.onerror = () => r(new Error("XHR network error")), s.send();
      });
    {
      let o = yield fetch(e, { headers: t });
      if (!o.ok)
        throw new Error(`HTTP ${o.status}`);
      let r = o.headers.get("set-cookie") || "";
      return { text: yield o.text(), cookie: r };
    }
  });
}
function q(e) {
  return d(this, null, function* () {
    try {
      let t = e.includes("/") ? e.split("/").pop().replace("#", "") : e, o = "https://gdtvid.p2pplay.pro";
      console.log(`[Gdtvid] Resolviendo: ${t}`);
      let s = (yield k(`${o}/api/v1/info?id=${t}`, { "User-Agent": E, Referer: "https://gdtvid.p2pplay.pro/" })).cookie, a = { sessionId: "p2pplay_test_session", userId: "null", playerId: "jw8", videoId: t, country: "US", platform: "web", browser: "chrome", os: "windows", timestamp: Date.now() }, l = ce(a), [, c] = yield Promise.all([k(`${o}/api/v1/player?t=${l}`, { "User-Agent": E, Referer: "https://gdtvid.p2pplay.pro/", Cookie: s || "" }), k(`${o}/api/v1/video?id=${t}&w=1536&h=864&r=null`, { "User-Agent": E, Referer: "https://gdtvid.p2pplay.pro/", Cookie: s || "" })]), i = le(c.text.trim());
      if (!i.source)
        throw new Error("No se encontr\xF3 ning\xFAn enlace de video v\xE1lido en la respuesta");
      console.log(`[Gdtvid] URL final generada: ${i.source.substring(0, 80)}...`);
      let n = yield D(i.source, { Referer: "https://gdtvid.p2pplay.pro/", Origin: "https://gdtvid.p2pplay.pro" });
      return { url: i.source, quality: n, headers: { "User-Agent": E, Referer: "https://gdtvid.p2pplay.pro/", Origin: "https://gdtvid.p2pplay.pro" } };
    } catch (t) {
      return console.log(`[Gdtvid] Error: ${t.message}`), null;
    }
  });
}
var ue = "439c478a771f35c05022f9feabcca01c", j = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", L = { "User-Agent": j, Accept: "text/html,application/json" }, G = "https://detodopeliculas.nu", de = { "voe.sx": I, "ok.ru": W, gdtvid: q }, pe = { "voe.sx": "VOE", "ok.ru": "OkRu", gdtvid: "GDTvid" }, fe = ["LAT", "ESP", "SUB"], S = { LAT: "Latino", ESP: "Castellano", SUB: "Subtitulado" };
function U(o) {
  return d(this, arguments, function* (e, t = {}) {
    let r = yield fetch(e, { headers: y(y({}, L), t.headers), method: t.method || "GET", redirect: "follow" });
    if (!r.ok)
      throw new Error(`HTTP ${r.status}`);
    return (r.headers.get("content-type") || "").includes("json") ? r.json() : r.text();
  });
}
function V(e, t = null) {
  let o = e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return t ? `${o}-${t}` : o;
}
function he(e) {
  for (let [t, o] of Object.entries(de))
    if (e.includes(t))
      return { resolver: o, serverName: pe[t] || "Online" };
  return { resolver: null, serverName: "Desconocido" };
}
function ge(e) {
  if (!e)
    return null;
  let t = e.match(/src=["']([^"']+)["']/i);
  return t ? t[1] : e;
}
function me(e, t) {
  return d(this, null, function* () {
    let o = ["es-MX", "en-US", "es-ES"], r = yield Promise.all(o.map((l) => U(`https://api.themoviedb.org/3/${t}/${e}?api_key=${ue}&language=${l}`).catch(() => null))), s = /* @__PURE__ */ new Set(), a = "";
    for (let l of r) {
      if (!l)
        continue;
      let c = t === "movie" ? l.title : l.name, i = t === "movie" ? l.original_title : l.original_name;
      a || (a = (l.release_date || l.first_air_date || "").substring(0, 4)), c && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(c) && s.add(c), i && s.add(i);
    }
    return s.size > 0 ? { titles: Array.from(s), year: a } : null;
  });
}
function we(e, t) {
  return d(this, null, function* () {
    let o = t === "movie" ? "pelicula" : "serie", r = /* @__PURE__ */ new Set();
    for (let s of e.titles)
      r.add(V(s, e.year)), r.add(V(s));
    try {
      return yield Promise.any([...r].map((s) => d(this, null, function* () {
        let a = `${G}/${o}/${s}/`;
        if (!(yield fetch(a, { headers: L, redirect: "follow" })).ok)
          throw new Error();
        return console.log(`[DeTodoPeliculas] \u2713 P\xE1gina encontrada: ${a}`), a;
      })));
    } catch (s) {
      return null;
    }
  });
}
function ye(e, t, o) {
  return d(this, null, function* () {
    try {
      let s = (yield U(`${e}?ep_season=${t}`)).split(/<article|<li|<div class=["']episodios/i);
      for (let a of s)
        if (a.includes(`>${t} - ${o}<`) || a.includes(`>${t}x${o}<`)) {
          let l = a.match(/href=["'](https:\/\/detodopeliculas\.nu\/episodio\/[^"']+)["']/i);
          if (l)
            return l[1];
        }
    } catch (r) {
      return null;
    }
    return null;
  });
}
function ve(e) {
  return d(this, null, function* () {
    let t = yield U(e), o = { LAT: [], ESP: [], SUB: [] }, r = /* @__PURE__ */ new Set(), s = [...t.matchAll(/<li[^>]*class=["'][^"']*dooplay_player_option[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)];
    console.log(`[AJAX] opciones encontradas: ${s.length}`);
    let a = [];
    for (let c of s) {
      let i = c[0], n = c[1].toLowerCase(), u = i.match(/data-post=["']([^"']+)["']/i), m = i.match(/data-nume=["']([^"']+)["']/i), f = i.match(/data-type=["']([^"']+)["']/i);
      if (!u || !m || !f)
        continue;
      let p = "SUB";
      n.includes("lat") || n.includes("latino") || n.includes("mx") ? p = "LAT" : (n.includes("cast") || n.includes("espa\xF1ol") || n.includes("es ")) && (p = "ESP"), a.push({ post: u[1], nume: m[1], playerType: f[1], lang: p });
    }
    let l = yield Promise.allSettled(a.map((m) => d(this, [m], function* ({ post: c, nume: i, playerType: n, lang: u }) {
      let f = new URLSearchParams();
      f.append("action", "doo_player_ajax"), f.append("post", c), f.append("nume", i), f.append("type", n);
      let h = yield (yield fetch(`${G}/wp-admin/admin-ajax.php`, { method: "POST", headers: O(y({}, L), { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: e }), body: f.toString() })).text(), w = JSON.parse(h), v = ge(w == null ? void 0 : w.embed_url);
      return !v || (w == null ? void 0 : w.type) === "trailer" || !v.startsWith("http") || v.includes("youtube.com") || v.includes("googletagmanager") ? null : { embedUrl: v, lang: u };
    })));
    for (let c of l) {
      if (c.status !== "fulfilled" || !c.value)
        continue;
      let { embedUrl: i, lang: n } = c.value;
      r.has(i) || (r.add(i), o[n].push(i));
    }
    if (o.LAT.length === 0 && o.ESP.length === 0 && o.SUB.length === 0) {
      let c = [...t.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
      for (let i of c) {
        let n = i[1];
        n.startsWith("http") && (n.includes("youtube.com") || n.includes("googletagmanager") || r.has(n) || (r.add(n), o.LAT.push(n)));
      }
    }
    return o;
  });
}
function Re(e, t, o, r) {
  return d(this, null, function* () {
    if (!e || !t)
      return [];
    let s = Date.now();
    console.log(`[DeTodoPeliculas] Buscando: TMDB ${e} (${t})${o ? ` S${o}E${r}` : ""}`);
    try {
      let a = yield me(e, t);
      if (!a)
        return [];
      let l = yield we(a, t);
      if (!l)
        return [];
      let c = l;
      if (t === "tv" && o && r && (c = yield ye(l, o, r), !c))
        return [];
      let i = yield ve(c);
      console.log("[DeTodoPeliculas] Embeds encontrados:", JSON.stringify({ LAT: i.LAT.length, ESP: i.ESP.length, SUB: i.SUB.length }));
      for (let n of fe) {
        let u = i[n];
        if (!u || u.length === 0)
          continue;
        console.log(`[DeTodoPeliculas] Resolviendo ${u.length} embeds en ${S[n]}...`);
        let m = u.map((h) => d(this, null, function* () {
          let { resolver: w, serverName: v } = he(h);
          if (!w)
            return null;
          try {
            let R = yield w(h);
            return R ? { name: "DeTodoPeliculas", title: `${R.quality || "Unknown"} \xB7 ${S[n]} \xB7 ${v}`, url: R.url, quality: R.quality || "Unknown", headers: R.headers || { "User-Agent": j, Referer: c } } : null;
          } catch (R) {
            return null;
          }
        })), p = (yield Promise.allSettled(m)).filter((h) => h.status === "fulfilled" && h.value !== null).map((h) => h.value);
        if (p.length > 0) {
          let h = ((Date.now() - s) / 1e3).toFixed(2);
          return console.log(`[DeTodoPeliculas] \u2713 ${p.length} streams encontrados en ${S[n]} (${h}s), omitiendo otros idiomas.`), p;
        } else
          console.log(`[DeTodoPeliculas] Sin streams exitosos en ${S[n]}, intentando siguiente idioma...`);
      }
      return console.log("[DeTodoPeliculas] Agotada la b\xFAsqueda en todos los idiomas sin \xE9xito."), [];
    } catch (a) {
      return console.log(`[DeTodoPeliculas] Error Cr\xEDtico: ${a.message}`), [];
    }
  });
}
