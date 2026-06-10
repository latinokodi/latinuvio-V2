var J = Object.create;
var A = Object.defineProperty, Q = Object.defineProperties, G = Object.getOwnPropertyDescriptor, Y = Object.getOwnPropertyDescriptors, X = Object.getOwnPropertyNames, _ = Object.getOwnPropertySymbols, Z = Object.getPrototypeOf, N = Object.prototype.hasOwnProperty, ee = Object.prototype.propertyIsEnumerable;
var O = (e, t, n) => t in e ? A(e, t, { enumerable: true, configurable: true, writable: true, value: n }) : e[t] = n, E = (e, t) => {
  for (var n in t || (t = {}))
    N.call(t, n) && O(e, n, t[n]);
  if (_)
    for (var n of _(t))
      ee.call(t, n) && O(e, n, t[n]);
  return e;
}, I = (e, t) => Q(e, Y(t));
var te = (e, t) => {
  for (var n in t)
    A(e, n, { get: t[n], enumerable: true });
}, P = (e, t, n, c) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let s of X(t))
      !N.call(e, s) && s !== n && A(e, s, { get: () => t[s], enumerable: !(c = G(t, s)) || c.enumerable });
  return e;
};
var ne = (e, t, n) => (n = e != null ? J(Z(e)) : {}, P(t || !e || !e.__esModule ? A(n, "default", { value: e, enumerable: true }) : n, e)), oe = (e) => P(A({}, "__esModule", { value: true }), e);
var m = (e, t, n) => new Promise((c, s) => {
  var r = (i) => {
    try {
      l(n.next(i));
    } catch (o) {
      s(o);
    }
  }, a = (i) => {
    try {
      l(n.throw(i));
    } catch (o) {
      s(o);
    }
  }, l = (i) => i.done ? c(i.value) : Promise.resolve(i.value).then(r, a);
  l((n = n.apply(e, t)).next());
});
var Re = {};
te(Re, { getStreams: () => ye });
module.exports = oe(Re);
var re = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", L = { vimeos: { h: "720p", n: "480p" }, goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" }, vidhide: { n: "720p", l: "480p" }, streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" }, voe: { n: "720p", l: "360p" } }, se = ["x", "o", "h", "n", "l"];
function ie(e) {
  return e.includes("vimeos") ? L.vimeos : e.includes("goodstream") ? L.goodstream : e.includes("cloudwindow-route") ? L.voe : e.includes("minochinos") || e.includes("vidhide") || e.includes("dintezuvio") || e.includes("dramiyos") ? L.vidhide : e.includes("premilkyway") || e.includes("hlswish") || e.includes("vibuxer") || e.includes("streamwish") ? L.streamwish : null;
}
function x(n) {
  return m(this, arguments, function* (e, t = {}) {
    let c = U(e);
    return c !== "Unknown" ? c : yield ae(e, t);
  });
}
function U(e) {
  if (!e)
    return "Unknown";
  let t = ie(e);
  if (t) {
    let c = e.match(/_,([a-z,]+),\.urlset/);
    if (c) {
      let s = c[1].split(",").filter(Boolean);
      for (let r of se)
        if (s.includes(r) && t[r])
          return t[r];
    }
  }
  let n = e.match(/[_\-\/](\d{3,4})p/);
  return n ? n[1] + "p" : "Unknown";
}
function ce(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function ae(n) {
  return m(this, arguments, function* (e, t = {}) {
    try {
      let s = yield (yield fetch(e, { headers: E({ "User-Agent": re }, t), redirect: "follow" })).text();
      if (!s.includes("#EXT-X-STREAM-INF")) {
        let l = e.match(/[_-](\d{3,4})p/);
        return l ? `${l[1]}p` : "Unknown";
      }
      let r = 0, a = 0;
      for (let l of s.split(`
`)) {
        let i = l.match(/RESOLUTION=(\d+)x(\d+)/);
        if (i) {
          let o = parseInt(i[2]);
          o > a && (a = o, r = parseInt(i[1]));
        }
      }
      return a > 0 ? ce(r, a) : "Unknown";
    } catch (c) {
      return "Unknown";
    }
  });
}
var le = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function V(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function ue(e, t) {
  try {
    let c = t.replace(/^\[|\]$/g, "").split("','").map((o) => o.replace(/^'+|'+$/g, "")).map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s = "";
    for (let o of e) {
      let u = o.charCodeAt(0);
      u > 64 && u < 91 ? u = (u - 52) % 26 + 65 : u > 96 && u < 123 && (u = (u - 84) % 26 + 97), s += String.fromCharCode(u);
    }
    for (let o of c)
      s = s.replace(new RegExp(o, "g"), "_");
    s = s.split("_").join("");
    let r = V(s);
    if (!r)
      return null;
    let a = "";
    for (let o = 0; o < r.length; o++)
      a += String.fromCharCode((r.charCodeAt(o) - 3 + 256) % 256);
    let l = a.split("").reverse().join(""), i = V(l);
    return i ? JSON.parse(i) : null;
  } catch (n) {
    return console.log("[VOE] voeDecode error:", n.message), null;
  }
}
function H(n) {
  return m(this, arguments, function* (e, t = {}) {
    return yield fetch(e, { method: "GET", headers: E({ "User-Agent": le, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, t), redirect: "follow" });
  });
}
function q(e) {
  return m(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let t = yield H(e, { Referer: e });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let n = yield t.text();
      if (/permanentToken/i.test(n)) {
        let i = n.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (i) {
          console.log(`[VOE] Permanent token redirect -> ${i[1]}`);
          let o = yield H(i[1], { Referer: e });
          o.ok && (n = yield o.text());
        }
      }
      let c = n.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (c) {
        let i = c[1], o = c[2].startsWith("http") ? c[2] : new URL(c[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${o}`);
        let u = yield H(o, { Referer: e }), w = u.ok ? yield u.text() : "", W = w.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || w.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (W) {
          let b = ue(i, W[1]);
          if (b && (b.source || b.direct_access_url)) {
            let R = b.source || b.direct_access_url, d = U(R);
            return console.log(`[VOE] URL encontrada: ${R.substring(0, 80)}...`), { url: R, quality: d, headers: { Referer: e } };
          }
        }
      }
      let s = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, r = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, a = [], l;
      for (; (l = s.exec(n)) !== null; )
        a.push(l);
      for (; (l = r.exec(n)) !== null; )
        a.push(l);
      for (let i of a) {
        let o = i[1];
        if (!o)
          continue;
        let u = o;
        if (u.startsWith("aHR0"))
          try {
            u = atob(u);
          } catch (w) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${u.substring(0, 80)}...`), { url: u, quality: U(u), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[VOE] Error: ${t.message}`), null;
    }
  });
}
var k = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function de(e, t, n) {
  let c = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", s = (r) => {
    let a = 0;
    for (let l = 0; l < r.length; l++) {
      let i = c.indexOf(r[l]);
      if (i === -1)
        return NaN;
      a = a * t + i;
    }
    return a;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (r) => {
    let a = s(r);
    return isNaN(a) || a >= n.length ? r : n[a] && n[a] !== "" ? n[a] : r;
  });
}
function he(e, t) {
  let n = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (n)
    try {
      let s = n[0].replace(/(\w+)\s*:/g, '"$1":'), r = JSON.parse(s), a = r.hls4 || r.hls3 || r.hls2;
      if (a)
        return a.startsWith("/") ? t + a : a;
    } catch (s) {
      let r = n[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (r) {
        let a = r[1];
        return a.startsWith("/") ? t + a : a;
      }
    }
  let c = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (c) {
    let s = c[1];
    return s.startsWith("/") ? t + s : s;
  }
  return null;
}
var fe = { "hglink.to": "vibuxer.com" };
function y(e) {
  return m(this, null, function* () {
    var t;
    try {
      let n = e;
      for (let [o, u] of Object.entries(fe))
        if (n.includes(o)) {
          n = n.replace(o, u);
          break;
        }
      let c = ((t = n.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : t[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), n !== e && console.log(`[HLSWish] \u2192 Mapped to: ${n}`);
      let s = yield fetch(n, { headers: { "User-Agent": k, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!s.ok)
        throw new Error(`HTTP ${s.status}`);
      let r = yield s.text(), a = r.match(/file\s*:\s*["']([^"']+)["']/i);
      if (a) {
        let o = a[1];
        if (o.startsWith("/") && (o = c + o), o.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${o.substring(0, 80)}...`);
          try {
            let w = (yield fetch(o, { headers: { "User-Agent": k, Referer: c + "/" }, redirect: "follow" })).url;
            w && w.includes(".m3u8") && (o = w);
          } catch (u) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${o.substring(0, 80)}...`), { url: o, quality: x(o), headers: { "User-Agent": k, Referer: c + "/" } };
      }
      let l = r.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (l) {
        let o = de(l[1], parseInt(l[2]), l[4].split("|")), u = he(o, c);
        if (u)
          return console.log(`[HLSWish] URL encontrada: ${u.substring(0, 80)}...`), { url: u, quality: x(u), headers: { "User-Agent": k, Referer: c + "/" } };
      }
      let i = r.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return i ? (console.log(`[HLSWish] URL encontrada: ${i[0].substring(0, 80)}...`), { url: i[0], quality: x(i[0]), headers: { "User-Agent": k, Referer: c + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (n) {
      return console.log(`[HLSWish] Error: ${n.message}`), null;
    }
  });
}
var C = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function pe(e) {
  try {
    let t = e.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
    if (!t)
      return null;
    let [, n, c, s, r] = t;
    c = parseInt(c), s = parseInt(s), r = r.split("|");
    let a = (l, i) => {
      let o = "0123456789abcdefghijklmnopqrstuvwxyz", u = "";
      for (; l > 0; )
        u = o[l % i] + u, l = Math.floor(l / i);
      return u || "0";
    };
    return n = n.replace(/\b\w+\b/g, (l) => {
      let i = parseInt(l, 36);
      return i < r.length && r[i] ? r[i] : a(i, c);
    }), n;
  } catch (t) {
    return null;
  }
}
function M(e) {
  return m(this, null, function* () {
    var t;
    try {
      console.log(`[VidHide] Resolviendo: ${e}`);
      let n = yield fetch(e, { method: "GET", headers: { "User-Agent": C, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", Referer: "https://embed69.org/" }, redirect: "follow" });
      if (!n.ok)
        throw new Error(`HTTP ${n.status}`);
      let s = (yield n.text()).match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!s)
        return console.log("[VidHide] No se encontr\xF3 bloque eval"), null;
      let r = pe(s[0]);
      if (!r)
        return console.log("[VidHide] No se pudo desempacar"), null;
      let a = r.match(/"hls4"\s*:\s*"([^"]+)"/), l = r.match(/"hls2"\s*:\s*"([^"]+)"/), i = (t = a || l) == null ? void 0 : t[1];
      if (!i)
        return console.log("[VidHide] No se encontr\xF3 hls4/hls2"), null;
      let o = i;
      i.startsWith("http") || (o = `${new URL(e).origin}${i}`), console.log(`[VidHide] URL encontrada: ${o.substring(0, 80)}...`);
      let u = new URL(e).origin;
      return { url: o, quality: yield x(o, { Referer: `${u}/` }), headers: { "User-Agent": C, Referer: `${u}/`, Origin: u } };
    } catch (n) {
      return console.log(`[VidHide] Error: ${n.message}`), null;
    }
  });
}
var g = ne(require("crypto-js"));
var D = "439c478a771f35c05022f9feabcca01c", z = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", B = "https://embed69.org", me = { "voe.sx": q, "hglink.to": y, "streamwish.com": y, "streamwish.to": y, "wishembed.online": y, "filelions.com": y, "dintezuvio.com": M, "vidhide.com": M, "minochinos.com": M }, ge = { voe: "VOE", streamwish: "StreamWish", filemoon: "Filemoon", vidhide: "VidHide" }, we = ["LAT", "ESP", "SUB"];
function be(e, t) {
  try {
    let n = g.default.enc.Base64.parse(e), c = g.default.lib.WordArray.create(n.words.slice(0, 4), 16), s = g.default.lib.WordArray.create(n.words.slice(4), n.sigBytes - 16), r = g.default.lib.CipherParams.create({ ciphertext: s });
    return g.default.AES.decrypt(r, t, { iv: c, mode: g.default.mode.CBC, padding: g.default.pad.Pkcs7 }).toString(g.default.enc.Utf8) || null;
  } catch (n) {
    return console.log(`[Embed69] Error desencriptando con CryptoJS: ${n.message}`), null;
  }
}
function ve(e) {
  try {
    let t = e.match(/let\s+dataLink\s*=\s*(\[.+\]);/);
    return t ? JSON.parse(t[1]) : null;
  } catch (t) {
    return null;
  }
}
function $e(e) {
  if (!e)
    return null;
  for (let [t, n] of Object.entries(me))
    if (e.includes(t))
      return n;
  return null;
}
function Ee(e, t) {
  return m(this, null, function* () {
    let n = t === "movie" ? `https://api.themoviedb.org/3/movie/${e}/external_ids?api_key=${D}` : `https://api.themoviedb.org/3/tv/${e}/external_ids?api_key=${D}`;
    return (yield fetch(n, { headers: { "User-Agent": z } }).then((s) => s.json())).imdb_id || null;
  });
}
function xe(e, t, n, c) {
  if (t === "movie")
    return `${B}/f/${e}`;
  let s = String(c).padStart(2, "0");
  return `${B}/f/${e}-${parseInt(n)}x${s}`;
}
function ye(e, t, n, c) {
  return m(this, null, function* () {
    if (!e || !t)
      return [];
    let s = Date.now();
    console.log(`[Embed69] Buscando: TMDB ${e} (${t})${n ? ` S${n}E${c}` : ""}`);
    try {
      let W2 = function(d) {
        return m(this, null, function* () {
          return (yield Promise.allSettled(d.map(({ url: f, resolver: p, lang: h, servername: v }) => p(f).then((S) => S ? I(E({}, S), { lang: h, servername: v }) : null)))).filter((f) => {
            var p;
            return f.status === "fulfilled" && ((p = f.value) == null ? void 0 : p.url);
          }).map((f) => f.value);
        });
      };
      var W = W2;
      let w = function(d) {
        let $ = d.video_language || "LAT", f = [];
        for (let p of d.sortedEmbeds || []) {
          if (p.servername === "download")
            continue;
          let h = be(p.link, o);
          if (!h)
            continue;
          let v = $e(h);
          if (!v) {
            console.log(`[Embed69] Sin resolver para ${p.servername}: ${h.substring(0, 60)}`);
            continue;
          }
          f.push({ url: h, resolver: v, lang: $, servername: p.servername });
        }
        return f;
      }, r = yield Ee(e, t);
      if (!r)
        return console.log("[Embed69] No se encontr\xF3 IMDB ID"), [];
      console.log(`[Embed69] IMDB ID: ${r}`);
      let a = xe(r, t, n, c);
      console.log(`[Embed69] Fetching: ${a}`);
      let l = yield fetch(a, { headers: { "User-Agent": z, Referer: "https://sololatino.net/", Accept: "text/html,application/xhtml+xml" } }).then((d) => d.text()), i = ve(l);
      if (!i || i.length === 0)
        return console.log("[Embed69] No se encontr\xF3 dataLink en el HTML"), [];
      console.log(`[Embed69] ${i.length} idiomas disponibles: ${i.map((d) => d.video_language).join(", ")}`);
      let o;
      try {
        let d = l.match(/POW_CHALLENGE = '([^']+)'/)[1], $ = parseInt(l.match(/POW_DIFFICULTY = (\d+)/)[1]), f = l.match(/POW_SALT = '([^']+)'/)[1], p = "0".repeat($), h = 0;
        for (console.log(`[Embed69] Resolviendo PoW con CryptoJS (Dificultad: ${$})...`); ; ) {
          if (g.default.SHA256(d + h).toString(g.default.enc.Hex).startsWith(p)) {
            o = g.default.SHA256(d + h + f), console.log(`[Embed69] PoW Resuelto. Nonce: ${h}`);
            break;
          }
          h++;
        }
      } catch (d) {
        return console.log(`[Embed69] Error al resolver el PoW: ${d.message}`), [];
      }
      let u = {};
      for (let d of i)
        u[d.video_language] = d;
      let b = [];
      for (let d of we) {
        let $ = u[d];
        if (!$)
          continue;
        let f = w($);
        if (f.length === 0)
          continue;
        console.log(`[Embed69] Resolviendo ${f.length} embeds (${d})...`);
        let p = yield W2(f);
        if (p.length > 0) {
          for (let { url: h, quality: v, lang: S, servername: T, headers: j } of p) {
            let K = S === "LAT" ? "Latino" : S === "ESP" ? "Espa\xF1ol" : "Subtitulado", F = ge[T] || T;
            b.push({ name: "Embed69", title: `${v || "Unknown"} \xB7 ${K} \xB7 ${F}`, url: h, quality: v || "Unknown", headers: j || {} }), console.log(`[Embed69] Resolved: ${T} quality=${v} url=${h == null ? void 0 : h.substring(0, 50)}`);
          }
          console.log(`[Embed69] \u2713 Streams encontrados en ${d}, omitiendo idiomas de menor prioridad`);
          break;
        } else
          console.log(`[Embed69] Sin streams en ${d}, intentando siguiente idioma...`);
      }
      let R = ((Date.now() - s) / 1e3).toFixed(2);
      return console.log(`[Embed69] \u2713 ${b.length} streams en ${R}s`), b;
    } catch (r) {
      return console.log(`[Embed69] Error: ${r.message}`), [];
    }
  });
}
