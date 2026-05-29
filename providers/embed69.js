var K = Object.create;
var S = Object.defineProperty, F = Object.defineProperties, J = Object.getOwnPropertyDescriptor, G = Object.getOwnPropertyDescriptors, X = Object.getOwnPropertyNames, T = Object.getOwnPropertySymbols, Y = Object.getPrototypeOf, O = Object.prototype.hasOwnProperty, Q = Object.prototype.propertyIsEnumerable;
var U = (e, o, t) => o in e ? S(e, o, { enumerable: true, configurable: true, writable: true, value: t }) : e[o] = t, v = (e, o) => {
  for (var t in o || (o = {}))
    O.call(o, t) && U(e, t, o[t]);
  if (T)
    for (var t of T(o))
      Q.call(o, t) && U(e, t, o[t]);
  return e;
}, N = (e, o) => F(e, G(o));
var Z = (e, o) => {
  for (var t in o)
    S(e, t, { get: o[t], enumerable: true });
}, _ = (e, o, t, l) => {
  if (o && typeof o == "object" || typeof o == "function")
    for (let s of X(o))
      !O.call(e, s) && s !== t && S(e, s, { get: () => o[s], enumerable: !(l = J(o, s)) || l.enumerable });
  return e;
};
var ee = (e, o, t) => (t = e != null ? K(Y(e)) : {}, _(o || !e || !e.__esModule ? S(t, "default", { value: e, enumerable: true }) : t, e)), te = (e) => _(S({}, "__esModule", { value: true }), e);
var g = (e, o, t) => new Promise((l, s) => {
  var c = (r) => {
    try {
      u(t.next(r));
    } catch (n) {
      s(n);
    }
  }, i = (r) => {
    try {
      u(t.throw(r));
    } catch (n) {
      s(n);
    }
  }, u = (r) => r.done ? l(r.value) : Promise.resolve(r.value).then(c, i);
  u((t = t.apply(e, o)).next());
});
var $e = {};
Z($e, { getStreams: () => we });
module.exports = te($e);
var oe = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function ne(e, o) {
  return e >= 3840 || o >= 2160 ? "4K" : e >= 1920 || o >= 1080 ? "1080p" : e >= 1280 || o >= 720 ? "720p" : e >= 854 || o >= 480 ? "480p" : "360p";
}
function H(t) {
  return g(this, arguments, function* (e, o = {}) {
    try {
      let s = yield (yield fetch(e, { headers: v({ "User-Agent": oe }, o), redirect: "follow" })).text();
      if (!s.includes("#EXT-X-STREAM-INF")) {
        let r = e.match(/[_-](\d{3,4})p/);
        return r ? `${r[1]}p` : "1080p";
      }
      let c = 0, i = 0, u = s.split(`
`);
      for (let r of u) {
        let n = r.match(/RESOLUTION=(\d+)x(\d+)/);
        if (n) {
          let a = parseInt(n[1]), m = parseInt(n[2]);
          m > i && (i = m, c = a);
        }
      }
      return i > 0 ? ne(c, i) : "1080p";
    } catch (l) {
      return "1080p";
    }
  });
}
var re = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function P(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (o) {
    return null;
  }
}
function se(e, o) {
  try {
    let l = o.replace(/^\[|\]$/g, "").split("','").map((n) => n.replace(/^'+|'+$/g, "")).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s = "";
    for (let n of e) {
      let a = n.charCodeAt(0);
      a > 64 && a < 91 ? a = (a - 52) % 26 + 65 : a > 96 && a < 123 && (a = (a - 84) % 26 + 97), s += String.fromCharCode(a);
    }
    for (let n of l)
      s = s.replace(new RegExp(n, "g"), "_");
    s = s.split("_").join("");
    let c = P(s);
    if (!c)
      return null;
    let i = "";
    for (let n = 0; n < c.length; n++)
      i += String.fromCharCode((c.charCodeAt(n) - 3 + 256) % 256);
    let u = i.split("").reverse().join(""), r = P(u);
    return r ? JSON.parse(r) : null;
  } catch (t) {
    return console.log("[VOE] voeDecode error:", t.message), null;
  }
}
function M(t) {
  return g(this, arguments, function* (e, o = {}) {
    return yield fetch(e, { method: "GET", headers: v({ "User-Agent": re, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, o), redirect: "follow" });
  });
}
function V(e) {
  return g(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let o = yield M(e, { Referer: e });
      if (!o.ok)
        throw new Error(`HTTP ${o.status}`);
      let t = yield o.text();
      if (/permanentToken/i.test(t)) {
        let r = t.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (r) {
          console.log(`[VOE] Permanent token redirect -> ${r[1]}`);
          let n = yield M(r[1], { Referer: e });
          n.ok && (t = yield n.text());
        }
      }
      let l = t.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (l) {
        let r = l[1], n = l[2].startsWith("http") ? l[2] : new URL(l[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${n}`);
        let a = yield M(n, { Referer: e }), m = a.ok ? yield a.text() : "", L = m.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || m.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (L) {
          let w = se(r, L[1]);
          if (w && (w.source || w.direct_access_url)) {
            let y = w.source || w.direct_access_url, d = yield H(y, { Referer: e });
            return console.log(`[VOE] URL encontrada: ${y.substring(0, 80)}...`), { url: y, quality: d, headers: { Referer: e } };
          }
        }
      }
      let s = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, c = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, i = [], u;
      for (; (u = s.exec(t)) !== null; )
        i.push(u);
      for (; (u = c.exec(t)) !== null; )
        i.push(u);
      for (let r of i) {
        let n = r[1];
        if (!n)
          continue;
        let a = n;
        if (a.startsWith("aHR0"))
          try {
            a = atob(a);
          } catch (m) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${a.substring(0, 80)}...`), { url: a, quality: yield H(a, { Referer: e }), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (o) {
      return console.log(`[VOE] Error: ${o.message}`), null;
    }
  });
}
var A = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function ce(e, o, t) {
  let l = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", s = (c) => {
    let i = 0;
    for (let u = 0; u < c.length; u++) {
      let r = l.indexOf(c[u]);
      if (r === -1)
        return NaN;
      i = i * o + r;
    }
    return i;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (c) => {
    let i = s(c);
    return isNaN(i) || i >= t.length ? c : t[i] && t[i] !== "" ? t[i] : c;
  });
}
function ie(e, o) {
  let t = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (t)
    try {
      let s = t[0].replace(/(\w+)\s*:/g, '"$1":'), c = JSON.parse(s), i = c.hls4 || c.hls3 || c.hls2;
      if (i)
        return i.startsWith("/") ? o + i : i;
    } catch (s) {
      let c = t[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (c) {
        let i = c[1];
        return i.startsWith("/") ? o + i : i;
      }
    }
  let l = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (l) {
    let s = l[1];
    return s.startsWith("/") ? o + s : s;
  }
  return null;
}
var le = { "hglink.to": "vibuxer.com" };
function x(e) {
  return g(this, null, function* () {
    var o;
    try {
      let t = e;
      for (let [n, a] of Object.entries(le))
        if (t.includes(n)) {
          t = t.replace(n, a);
          break;
        }
      let l = ((o = t.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : o[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), t !== e && console.log(`[HLSWish] \u2192 Mapped to: ${t}`);
      let s = yield fetch(t, { headers: { "User-Agent": A, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!s.ok)
        throw new Error(`HTTP ${s.status}`);
      let c = yield s.text(), i = c.match(/file\s*:\s*["']([^"']+)["']/i);
      if (i) {
        let n = i[1];
        if (n.startsWith("/") && (n = l + n), n.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${n.substring(0, 80)}...`);
          try {
            let m = (yield fetch(n, { headers: { "User-Agent": A, Referer: l + "/" }, redirect: "follow" })).url;
            m && m.includes(".m3u8") && (n = m);
          } catch (a) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${n.substring(0, 80)}...`), { url: n, quality: "1080p", headers: { "User-Agent": A, Referer: l + "/" } };
      }
      let u = c.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (u) {
        let n = ce(u[1], parseInt(u[2]), u[4].split("|")), a = ie(n, l);
        if (a)
          return console.log(`[HLSWish] URL encontrada: ${a.substring(0, 80)}...`), { url: a, quality: "1080p", headers: { "User-Agent": A, Referer: l + "/" } };
      }
      let r = c.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return r ? (console.log(`[HLSWish] URL encontrada: ${r[0].substring(0, 80)}...`), { url: r[0], quality: "1080p", headers: { "User-Agent": A, Referer: l + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (t) {
      return console.log(`[HLSWish] Error: ${t.message}`), null;
    }
  });
}
var I = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function ae(e) {
  try {
    let o = e.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
    if (!o)
      return null;
    let [, t, l, s, c] = o;
    l = parseInt(l), s = parseInt(s), c = c.split("|");
    let i = (u, r) => {
      let n = "0123456789abcdefghijklmnopqrstuvwxyz", a = "";
      for (; u > 0; )
        a = n[u % r] + a, u = Math.floor(u / r);
      return a || "0";
    };
    return t = t.replace(/\b\w+\b/g, (u) => {
      let r = parseInt(u, 36);
      return r < c.length && c[r] ? c[r] : i(r, l);
    }), t;
  } catch (o) {
    return null;
  }
}
function W(e) {
  return g(this, null, function* () {
    var o;
    try {
      console.log(`[VidHide] Resolviendo: ${e}`);
      let t = yield fetch(e, { method: "GET", headers: { "User-Agent": I, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", Referer: "https://embed69.org/" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let s = (yield t.text()).match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!s)
        return console.log("[VidHide] No se encontr\xF3 bloque eval"), null;
      let c = ae(s[0]);
      if (!c)
        return console.log("[VidHide] No se pudo desempacar"), null;
      let i = c.match(/"hls4"\s*:\s*"([^"]+)"/), u = c.match(/"hls2"\s*:\s*"([^"]+)"/), r = (o = i || u) == null ? void 0 : o[1];
      if (!r)
        return console.log("[VidHide] No se encontr\xF3 hls4/hls2"), null;
      let n = r;
      r.startsWith("http") || (n = `${new URL(e).origin}${r}`), console.log(`[VidHide] URL encontrada: ${n.substring(0, 80)}...`);
      let a = new URL(e).origin;
      return { url: n, headers: { "User-Agent": I, Referer: `${a}/`, Origin: a } };
    } catch (t) {
      return console.log(`[VidHide] Error: ${t.message}`), null;
    }
  });
}
var b = ee(require("crypto-js"));
var q = "439c478a771f35c05022f9feabcca01c", D = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", C = "https://embed69.org", ue = { "voe.sx": V, "hglink.to": x, "streamwish.com": x, "streamwish.to": x, "wishembed.online": x, "filelions.com": x, "dintezuvio.com": W, "vidhide.com": W, "minochinos.com": W }, de = { voe: "VOE", streamwish: "StreamWish", filemoon: "Filemoon", vidhide: "VidHide" }, he = ["LAT", "ESP", "SUB"];
function fe(e, o) {
  try {
    let t = b.default.enc.Base64.parse(e), l = b.default.lib.WordArray.create(t.words.slice(0, 4), 16), s = b.default.lib.WordArray.create(t.words.slice(4), t.sigBytes - 16), c = b.default.lib.CipherParams.create({ ciphertext: s });
    return b.default.AES.decrypt(c, o, { iv: l, mode: b.default.mode.CBC, padding: b.default.pad.Pkcs7 }).toString(b.default.enc.Utf8) || null;
  } catch (t) {
    return console.log(`[Embed69] Error desencriptando con CryptoJS: ${t.message}`), null;
  }
}
function pe(e) {
  try {
    let o = e.match(/let\s+dataLink\s*=\s*(\[.+\]);/);
    return o ? JSON.parse(o[1]) : null;
  } catch (o) {
    return null;
  }
}
function me(e) {
  if (!e)
    return null;
  for (let [o, t] of Object.entries(ue))
    if (e.includes(o))
      return t;
  return null;
}
function ge(e, o) {
  return g(this, null, function* () {
    let t = o === "movie" ? `https://api.themoviedb.org/3/movie/${e}/external_ids?api_key=${q}` : `https://api.themoviedb.org/3/tv/${e}/external_ids?api_key=${q}`;
    return (yield fetch(t, { headers: { "User-Agent": D } }).then((s) => s.json())).imdb_id || null;
  });
}
function be(e, o, t, l) {
  if (o === "movie")
    return `${C}/f/${e}`;
  let s = String(l).padStart(2, "0");
  return `${C}/f/${e}-${parseInt(t)}x${s}`;
}
function we(e, o, t, l) {
  return g(this, null, function* () {
    if (!e || !o)
      return [];
    let s = Date.now();
    console.log(`[Embed69] Buscando: TMDB ${e} (${o})${t ? ` S${t}E${l}` : ""}`);
    try {
      let L2 = function(d) {
        return g(this, null, function* () {
          return (yield Promise.allSettled(d.map(({ url: f, resolver: p, lang: h, servername: $ }) => Promise.race([p(f).then((R) => R ? N(v({}, R), { lang: h, servername: $ }) : null)])))).filter((f) => {
            var p;
            return f.status === "fulfilled" && ((p = f.value) == null ? void 0 : p.url);
          }).map((f) => f.value);
        });
      };
      var L = L2;
      let m = function(d) {
        let E = d.video_language || "LAT", f = [];
        for (let p of d.sortedEmbeds || []) {
          if (p.servername === "download")
            continue;
          let h = fe(p.link, n);
          if (!h)
            continue;
          let $ = me(h);
          if (!$) {
            console.log(`[Embed69] Sin resolver para ${p.servername}: ${h.substring(0, 60)}`);
            continue;
          }
          f.push({ url: h, resolver: $, lang: E, servername: p.servername });
        }
        return f;
      }, c = yield ge(e, o);
      if (!c)
        return console.log("[Embed69] No se encontr\xF3 IMDB ID"), [];
      console.log(`[Embed69] IMDB ID: ${c}`);
      let i = be(c, o, t, l);
      console.log(`[Embed69] Fetching: ${i}`);
      let u = yield fetch(i, { headers: { "User-Agent": D, Referer: "https://sololatino.net/", Accept: "text/html,application/xhtml+xml" } }).then((d) => d.text()), r = pe(u);
      if (!r || r.length === 0)
        return console.log("[Embed69] No se encontr\xF3 dataLink en el HTML"), [];
      console.log(`[Embed69] ${r.length} idiomas disponibles: ${r.map((d) => d.video_language).join(", ")}`);
      let n;
      try {
        let d = u.match(/POW_CHALLENGE = '([^']+)'/)[1], E = parseInt(u.match(/POW_DIFFICULTY = (\d+)/)[1]), f = u.match(/POW_SALT = '([^']+)'/)[1], p = "0".repeat(E), h = 0;
        for (console.log(`[Embed69] Resolviendo PoW con CryptoJS (Dificultad: ${E})...`); ; ) {
          if (b.default.SHA256(d + h).toString(b.default.enc.Hex).startsWith(p)) {
            n = b.default.SHA256(d + h + f), console.log(`[Embed69] PoW Resuelto. Nonce: ${h}`);
            break;
          }
          h++;
        }
      } catch (d) {
        return console.log(`[Embed69] Error al resolver el PoW: ${d.message}`), [];
      }
      let a = {};
      for (let d of r)
        a[d.video_language] = d;
      let w = [];
      for (let d of he) {
        let E = a[d];
        if (!E)
          continue;
        let f = m(E);
        if (f.length === 0)
          continue;
        console.log(`[Embed69] Resolviendo ${f.length} embeds (${d})...`);
        let p = yield L2(f);
        if (p.length > 0) {
          for (let { url: h, quality: $, lang: R, servername: k, headers: B } of p) {
            let j = R === "LAT" ? "Latino" : R === "ESP" ? "Espa\xF1ol" : "Subtitulado", z = de[k] || k;
            w.push({ name: "Embed69", title: `${$ || "1080p"} \xB7 ${j} \xB7 ${z}`, url: h, quality: $ || "1080p", headers: B || {} }), console.log(`[Embed69] Resolved: ${k} quality=${$} url=${h == null ? void 0 : h.substring(0, 50)}`);
          }
          console.log(`[Embed69] \u2713 Streams encontrados en ${d}, omitiendo idiomas de menor prioridad`);
          break;
        } else
          console.log(`[Embed69] Sin streams en ${d}, intentando siguiente idioma...`);
      }
      let y = ((Date.now() - s) / 1e3).toFixed(2);
      return console.log(`[Embed69] \u2713 ${w.length} streams en ${y}s`), w;
    } catch (c) {
      return console.log(`[Embed69] Error: ${c.message}`), [];
    }
  });
}
