var v = Object.defineProperty;
var V = Object.getOwnPropertyDescriptor;
var D = Object.getOwnPropertyNames, U = Object.getOwnPropertySymbols;
var W = Object.prototype.hasOwnProperty, z = Object.prototype.propertyIsEnumerable;
var M = (e, t, n) => t in e ? v(e, t, { enumerable: true, configurable: true, writable: true, value: n }) : e[t] = n, S = (e, t) => {
  for (var n in t || (t = {}))
    W.call(t, n) && M(e, n, t[n]);
  if (U)
    for (var n of U(t))
      z.call(t, n) && M(e, n, t[n]);
  return e;
};
var I = (e, t) => {
  for (var n in t)
    v(e, n, { get: t[n], enumerable: true });
}, P = (e, t, n, s) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of D(t))
      !W.call(e, o) && o !== n && v(e, o, { get: () => t[o], enumerable: !(s = V(t, o)) || s.enumerable });
  return e;
};
var B = (e) => P(v({}, "__esModule", { value: true }), e);
var d = (e, t, n) => new Promise((s, o) => {
  var r = (c) => {
    try {
      u(n.next(c));
    } catch (a) {
      o(a);
    }
  }, i = (c) => {
    try {
      u(n.throw(c));
    } catch (a) {
      o(a);
    }
  }, u = (c) => c.done ? s(c.value) : Promise.resolve(c.value).then(r, i);
  u((n = n.apply(e, t)).next());
});
var pe = {};
I(pe, { getStreams: () => de });
module.exports = B(pe);
var K = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", w = { vimeos: { h: "720p", n: "480p" }, goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" }, vidhide: { n: "720p", l: "480p" }, streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" }, voe: { n: "720p", l: "360p" } }, j = ["x", "o", "h", "n", "l"];
function G(e) {
  return e.includes("vimeos") ? w.vimeos : e.includes("goodstream") ? w.goodstream : e.includes("cloudwindow-route") ? w.voe : e.includes("minochinos") || e.includes("vidhide") || e.includes("dintezuvio") || e.includes("dramiyos") ? w.vidhide : e.includes("premilkyway") || e.includes("hlswish") || e.includes("vibuxer") || e.includes("streamwish") ? w.streamwish : null;
}
function R(n) {
  return d(this, arguments, function* (e, t = {}) {
    let s = m(e);
    return s !== "Unknown" ? s : yield Q(e, t);
  });
}
function m(e) {
  if (!e)
    return "Unknown";
  let t = G(e);
  if (t) {
    let s = e.match(/_,([a-z,]+),\.urlset/);
    if (s) {
      let o = s[1].split(",").filter(Boolean);
      for (let r of j)
        if (o.includes(r) && t[r])
          return t[r];
    }
  }
  let n = e.match(/[_\-\/](\d{3,4})p/);
  return n ? n[1] + "p" : "Unknown";
}
function F(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function Q(n) {
  return d(this, arguments, function* (e, t = {}) {
    try {
      let o = yield (yield fetch(e, { headers: S({ "User-Agent": K }, t), redirect: "follow" })).text();
      if (!o.includes("#EXT-X-STREAM-INF")) {
        let u = e.match(/[_-](\d{3,4})p/);
        return u ? `${u[1]}p` : "Unknown";
      }
      let r = 0, i = 0;
      for (let u of o.split(`
`)) {
        let c = u.match(/RESOLUTION=(\d+)x(\d+)/);
        if (c) {
          let a = parseInt(c[2]);
          a > i && (i = a, r = parseInt(c[1]));
        }
      }
      return i > 0 ? F(r, i) : "Unknown";
    } catch (s) {
      return "Unknown";
    }
  });
}
var C = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function k(e) {
  return d(this, null, function* () {
    try {
      console.log(`[GoodStream] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": C, Referer: "https://goodstream.one", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let s = (yield t.text()).match(/file:\s*"([^"]+)"/);
      if (!s)
        return console.log('[GoodStream] No se encontr\xF3 patr\xF3n file:"..."'), null;
      let o = s[1], r = { Referer: e, Origin: "https://goodstream.one", "User-Agent": C }, i = m(o);
      return console.log(`[GoodStream] URL encontrada (${i}): ${o.substring(0, 80)}...`), { url: o, quality: i, headers: r };
    } catch (t) {
      return console.log(`[GoodStream] Error: ${t.message}`), null;
    }
  });
}
var X = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function L(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function J(e, t) {
  try {
    let s = t.replace(/^\[|\]$/g, "").split("','").map((a) => a.replace(/^'+|'+$/g, "")).map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), o = "";
    for (let a of e) {
      let l = a.charCodeAt(0);
      l > 64 && l < 91 ? l = (l - 52) % 26 + 65 : l > 96 && l < 123 && (l = (l - 84) % 26 + 97), o += String.fromCharCode(l);
    }
    for (let a of s)
      o = o.replace(new RegExp(a, "g"), "_");
    o = o.split("_").join("");
    let r = L(o);
    if (!r)
      return null;
    let i = "";
    for (let a = 0; a < r.length; a++)
      i += String.fromCharCode((r.charCodeAt(a) - 3 + 256) % 256);
    let u = i.split("").reverse().join(""), c = L(u);
    return c ? JSON.parse(c) : null;
  } catch (n) {
    return console.log("[VOE] voeDecode error:", n.message), null;
  }
}
function b(n) {
  return d(this, arguments, function* (e, t = {}) {
    return yield fetch(e, { method: "GET", headers: S({ "User-Agent": X, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, t), redirect: "follow" });
  });
}
function T(e) {
  return d(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let t = yield b(e, { Referer: e });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let n = yield t.text();
      if (/permanentToken/i.test(n)) {
        let c = n.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (c) {
          console.log(`[VOE] Permanent token redirect -> ${c[1]}`);
          let a = yield b(c[1], { Referer: e });
          a.ok && (n = yield a.text());
        }
      }
      let s = n.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (s) {
        let c = s[1], a = s[2].startsWith("http") ? s[2] : new URL(s[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${a}`);
        let l = yield b(a, { Referer: e }), h = l.ok ? yield l.text() : "", f = h.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || h.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (f) {
          let p = J(c, f[1]);
          if (p && (p.source || p.direct_access_url)) {
            let $ = p.source || p.direct_access_url, g = m($);
            return console.log(`[VOE] URL encontrada: ${$.substring(0, 80)}...`), { url: $, quality: g, headers: { Referer: e } };
          }
        }
      }
      let o = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, r = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, i = [], u;
      for (; (u = o.exec(n)) !== null; )
        i.push(u);
      for (; (u = r.exec(n)) !== null; )
        i.push(u);
      for (let c of i) {
        let a = c[1];
        if (!a)
          continue;
        let l = a;
        if (l.startsWith("aHR0"))
          try {
            l = atob(l);
          } catch (h) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${l.substring(0, 80)}...`), { url: l, quality: m(l), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[VOE] Error: ${t.message}`), null;
    }
  });
}
var x = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function Z(e, t, n) {
  let s = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", o = (r) => {
    let i = 0;
    for (let u = 0; u < r.length; u++) {
      let c = s.indexOf(r[u]);
      if (c === -1)
        return NaN;
      i = i * t + c;
    }
    return i;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (r) => {
    let i = o(r);
    return isNaN(i) || i >= n.length ? r : n[i] && n[i] !== "" ? n[i] : r;
  });
}
function Y(e, t) {
  let n = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (n)
    try {
      let o = n[0].replace(/(\w+)\s*:/g, '"$1":'), r = JSON.parse(o), i = r.hls4 || r.hls3 || r.hls2;
      if (i)
        return i.startsWith("/") ? t + i : i;
    } catch (o) {
      let r = n[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (r) {
        let i = r[1];
        return i.startsWith("/") ? t + i : i;
      }
    }
  let s = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (s) {
    let o = s[1];
    return o.startsWith("/") ? t + o : o;
  }
  return null;
}
var ee = { "hglink.to": "vibuxer.com" };
function y(e) {
  return d(this, null, function* () {
    var t;
    try {
      let n = e;
      for (let [a, l] of Object.entries(ee))
        if (n.includes(a)) {
          n = n.replace(a, l);
          break;
        }
      let s = ((t = n.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : t[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), n !== e && console.log(`[HLSWish] \u2192 Mapped to: ${n}`);
      let o = yield fetch(n, { headers: { "User-Agent": x, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!o.ok)
        throw new Error(`HTTP ${o.status}`);
      let r = yield o.text(), i = r.match(/file\s*:\s*["']([^"']+)["']/i);
      if (i) {
        let a = i[1];
        if (a.startsWith("/") && (a = s + a), a.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${a.substring(0, 80)}...`);
          try {
            let h = (yield fetch(a, { headers: { "User-Agent": x, Referer: s + "/" }, redirect: "follow" })).url;
            h && h.includes(".m3u8") && (a = h);
          } catch (l) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${a.substring(0, 80)}...`), { url: a, quality: R(a), headers: { "User-Agent": x, Referer: s + "/" } };
      }
      let u = r.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (u) {
        let a = Z(u[1], parseInt(u[2]), u[4].split("|")), l = Y(a, s);
        if (l)
          return console.log(`[HLSWish] URL encontrada: ${l.substring(0, 80)}...`), { url: l, quality: R(l), headers: { "User-Agent": x, Referer: s + "/" } };
      }
      let c = r.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return c ? (console.log(`[HLSWish] URL encontrada: ${c[0].substring(0, 80)}...`), { url: c[0], quality: R(c[0]), headers: { "User-Agent": x, Referer: s + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (n) {
      return console.log(`[HLSWish] Error: ${n.message}`), null;
    }
  });
}
var N = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function O(e) {
  return d(this, null, function* () {
    try {
      console.log(`[Vimeos] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": N, Referer: "https://vimeos.net/", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let s = (yield t.text()).match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
      if (s) {
        let o = s[1], r = parseInt(s[2]), i = s[4].split("|"), u = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", c = (h) => {
          let f = 0;
          for (let p = 0; p < h.length; p++)
            f = f * r + u.indexOf(h[p]);
          return f;
        }, l = o.replace(/\b(\w+)\b/g, (h) => {
          let f = c(h);
          return i[f] && i[f] !== "" ? i[f] : h;
        }).match(/["']([^"']+\.m3u8[^"']*)['"]/i);
        if (l) {
          let h = l[1], f = { "User-Agent": N, Referer: "https://vimeos.net/" }, p = m(h);
          return console.log(`[Vimeos] URL encontrada: ${h.substring(0, 80)}...`), { url: h, quality: p, headers: f };
        }
      }
      return console.log("[Vimeos] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[Vimeos] Error: ${t.message}`), null;
    }
  });
}
var te = "439c478a771f35c05022f9feabcca01c", ne = "https://www.cinecalidad.vg", oe = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", A = { "User-Agent": oe, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9", Connection: "keep-alive", "Upgrade-Insecure-Requests": "1", Referer: "https://www.cinecalidad.vg/" }, q = { "goodstream.one": k, "hlswish.com": y, "streamwish.com": y, "streamwish.to": y, "strwish.com": y, "voe.sx": T, "vimeos.net": O }, re = (e) => e.includes("goodstream") ? "GoodStream" : e.includes("hlswish") || e.includes("streamwish") || e.includes("strwish") ? "StreamWish" : e.includes("voe.sx") ? "VOE" : e.includes("filemoon") ? "Filemoon" : e.includes("vimeos") ? "Vimeos" : "Online", se = (e) => {
  if (!e || !e.startsWith("http"))
    return null;
  for (let t in q)
    if (e.includes(t))
      return q[t];
  return null;
};
function ie(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function ae(e, t) {
  return d(this, null, function* () {
    let n = ["es-MX", "es-ES", "en-US"], s = yield Promise.all(n.map((g) => fetch(`https://api.themoviedb.org/3/${t}/${e}?api_key=${te}&language=${g}`, { headers: A }).then((_) => _.json()).catch(() => null))), [o, r, i] = s, u = o || r || i;
    if (!u)
      return null;
    let c = (g) => g ? t === "movie" ? g.title : g.name : null, a = c(o), l = c(r), h = c(i), f = t === "movie" ? u.original_title : u.original_name, p = (u.release_date || u.first_air_date || "").substring(0, 4);
    return console.log(`[CineCalidad] TMDB: "${a || l || h}" | ES: "${l}" | Original: "${f}"`), { title: a || l || h, titleEs: l, originalTitle: f, year: p };
  });
}
function E(e) {
  return e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function ce(e) {
  let t = e.match(/<h1[^>]*>[^<]*\((\d{4})\)[^<]*<\/h1>/);
  return t ? t[1] : null;
}
function le(e, t) {
  return d(this, null, function* () {
    let n = [e, `${e}-2`, `${e}-3`];
    for (let s of n) {
      let o = `${ne}/pelicula/${s}/`;
      try {
        let r = yield fetch(o, { headers: A }).then((u) => u.text()), i = ce(r);
        if (!i || !t || i === t)
          return console.log(`[CineCalidad] \u2713 Slug directo: /pelicula/${s}/ (${i || "?"})`), { url: o, html: r };
        console.log(`[CineCalidad] A\xF1o no coincide: esperado ${t}, encontrado ${i} en /pelicula/${s}/`);
      } catch (r) {
      }
    }
    return null;
  });
}
var ue = ["goodstream.one", "voe.sx", "filemoon.sx", "filemoon.to", "hlswish.com", "streamwish.com", "streamwish.to", "strwish.com", "vimeos.net"];
function H(e) {
  return ue.some((t) => e.includes(t));
}
function fe(e) {
  return d(this, null, function* () {
    try {
      let t = [], n = /data-src="([A-Za-z0-9+/=]{20,})"/g, s;
      for (; (s = n.exec(e)) !== null; )
        t.push(s[1]);
      let o = [...new Set(t.map((c) => ie(c)).filter((c) => c && c.startsWith("http")))], r = o.filter(H), i = o.filter((c) => !H(c));
      console.log(`[CineCalidad] ${r.length} embeds directos, ${i.length} intermedios`);
      let u = new Set(r);
      return i.length > 0 && (yield Promise.allSettled(i.map((c) => d(this, null, function* () {
        try {
          let a = yield fetch(c, { headers: A }).then((f) => f.text()), l = "", h = a.match(/id="btn_enlace"[^>]*>[\s\S]*?href="([^"]+)"/);
          if (h && (l = h[1]), !l) {
            let f = a.match(/<iframe[^>]+src="([^"]+)"/);
            f && (l = f[1]);
          }
          !l && c.includes("/e/") && (l = c), l && l.startsWith("http") && u.add(l);
        } catch (a) {
        }
      })))), [...u];
    } catch (t) {
      return console.log(`[CineCalidad] Error obteniendo embeds: ${t.message}`), [];
    }
  });
}
function he(e) {
  return d(this, null, function* () {
    let t = re(e), n = Date.now();
    try {
      let s = se(e);
      if (!s)
        return console.log(`[${t}] Sin resolver`), null;
      let o = yield s(e);
      return o != null && o.url ? { name: "CineCalidad", title: `${o.quality || "Unknown"} \xB7 ${t}`, url: o.url, quality: o.quality || "Unknown", headers: o.headers || {} } : (console.log(`[${t}] Sin URL final`), null);
    } catch (s) {
      return null;
    }
  });
}
function de(e, t, n, s) {
  return d(this, null, function* () {
    if (!e || !t)
      return [];
    let o = Date.now();
    if (console.log(`[CineCalidad] Buscando: TMDB ${e} (${t})${n ? ` S${n}E${s}` : ""}`), t === "tv")
      return console.log("[CineCalidad] Series no soportadas a\xFAn"), [];
    try {
      let r = yield ae(e, t);
      if (!r)
        return [];
      let i = [...new Set([r.title && E(r.title), r.titleEs && E(r.titleEs), r.originalTitle && E(r.originalTitle)].filter(Boolean))], u = null;
      try {
        u = yield Promise.any(i.map((f) => le(f, r.year).then((p) => {
          if (!p)
            throw new Error();
          return p;
        })));
      } catch (f) {
      }
      if (!u)
        return console.log("[CineCalidad] No encontrado por slug"), [];
      let c = yield fe(u.html);
      if (c.length === 0)
        return console.log("[CineCalidad] No se encontraron embeds"), [];
      let a = [...new Set(c)], l = (yield Promise.allSettled(a.map(he))).filter((f) => f.status === "fulfilled").map((f) => f.value).filter(Boolean), h = ((Date.now() - o) / 1e3).toFixed(2);
      return console.log(`[CineCalidad] \u2713 ${l.length} streams en ${h}s`), l;
    } catch (r) {
      return console.log(`[CineCalidad] Error: ${r.message}`), [];
    }
  });
}
