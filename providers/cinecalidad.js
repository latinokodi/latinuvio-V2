var y = Object.defineProperty;
var F = Object.getOwnPropertyDescriptor;
var I = Object.getOwnPropertyNames, W = Object.getOwnPropertySymbols;
var U = Object.prototype.hasOwnProperty, K = Object.prototype.propertyIsEnumerable;
var M = (e, t, n) => t in e ? y(e, t, { enumerable: true, configurable: true, writable: true, value: n }) : e[t] = n, v = (e, t) => {
  for (var n in t || (t = {}))
    U.call(t, n) && M(e, n, t[n]);
  if (W)
    for (var n of W(t))
      K.call(t, n) && M(e, n, t[n]);
  return e;
};
var B = (e, t) => {
  for (var n in t)
    y(e, n, { get: t[n], enumerable: true });
}, j = (e, t, n, a) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let i of I(t))
      !U.call(e, i) && i !== n && y(e, i, { get: () => t[i], enumerable: !(a = F(t, i)) || a.enumerable });
  return e;
};
var P = (e) => j(y({}, "__esModule", { value: true }), e);
var p = (e, t, n) => new Promise((a, i) => {
  var s = (c) => {
    try {
      u(n.next(c));
    } catch (o) {
      i(o);
    }
  }, r = (c) => {
    try {
      u(n.throw(c));
    } catch (o) {
      i(o);
    }
  }, u = (c) => c.done ? a(c.value) : Promise.resolve(c.value).then(s, r);
  u((n = n.apply(e, t)).next());
});
var de = {};
B(de, { getStreams: () => he });
module.exports = P(de);
var G = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function X(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function g(n) {
  return p(this, arguments, function* (e, t = {}) {
    try {
      let i = yield (yield fetch(e, { headers: v({ "User-Agent": G }, t), redirect: "follow" })).text();
      if (!i.includes("#EXT-X-STREAM-INF")) {
        let c = e.match(/[_-](\d{3,4})p/);
        return c ? `${c[1]}p` : "1080p";
      }
      let s = 0, r = 0, u = i.split(`
`);
      for (let c of u) {
        let o = c.match(/RESOLUTION=(\d+)x(\d+)/);
        if (o) {
          let l = parseInt(o[1]), f = parseInt(o[2]);
          f > r && (r = f, s = l);
        }
      }
      return r > 0 ? X(s, r) : "1080p";
    } catch (a) {
      return "1080p";
    }
  });
}
var L = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function T(e) {
  return p(this, null, function* () {
    try {
      console.log(`[GoodStream] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": L, Referer: "https://goodstream.one", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let a = (yield t.text()).match(/file:\s*"([^"]+)"/);
      if (!a)
        return console.log('[GoodStream] No se encontr\xF3 patr\xF3n file:"..."'), null;
      let i = a[1], s = { Referer: e, Origin: "https://goodstream.one", "User-Agent": L }, r = yield g(i, s);
      return console.log(`[GoodStream] URL encontrada (${r}): ${i.substring(0, 80)}...`), { url: i, quality: r, headers: s };
    } catch (t) {
      return console.log(`[GoodStream] Error: ${t.message}`), null;
    }
  });
}
var Q = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function O(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function J(e, t) {
  try {
    let a = t.replace(/^\[|\]$/g, "").split("','").map((o) => o.replace(/^'+|'+$/g, "")).map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), i = "";
    for (let o of e) {
      let l = o.charCodeAt(0);
      l > 64 && l < 91 ? l = (l - 52) % 26 + 65 : l > 96 && l < 123 && (l = (l - 84) % 26 + 97), i += String.fromCharCode(l);
    }
    for (let o of a)
      i = i.replace(new RegExp(o, "g"), "_");
    i = i.split("_").join("");
    let s = O(i);
    if (!s)
      return null;
    let r = "";
    for (let o = 0; o < s.length; o++)
      r += String.fromCharCode((s.charCodeAt(o) - 3 + 256) % 256);
    let u = r.split("").reverse().join(""), c = O(u);
    return c ? JSON.parse(c) : null;
  } catch (n) {
    return console.log("[VOE] voeDecode error:", n.message), null;
  }
}
function E(n) {
  return p(this, arguments, function* (e, t = {}) {
    return yield fetch(e, { method: "GET", headers: v({ "User-Agent": Q, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, t), redirect: "follow" });
  });
}
function N(e) {
  return p(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let t = yield E(e, { Referer: e });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let n = yield t.text();
      if (/permanentToken/i.test(n)) {
        let c = n.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (c) {
          console.log(`[VOE] Permanent token redirect -> ${c[1]}`);
          let o = yield E(c[1], { Referer: e });
          o.ok && (n = yield o.text());
        }
      }
      let a = n.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (a) {
        let c = a[1], o = a[2].startsWith("http") ? a[2] : new URL(a[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${o}`);
        let l = yield E(o, { Referer: e }), f = l.ok ? yield l.text() : "", h = f.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || f.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (h) {
          let d = J(c, h[1]);
          if (d && (d.source || d.direct_access_url)) {
            let m = d.source || d.direct_access_url, $ = yield g(m, { Referer: e });
            return console.log(`[VOE] URL encontrada: ${m.substring(0, 80)}...`), { url: m, quality: $, headers: { Referer: e } };
          }
        }
      }
      let i = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, s = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, r = [], u;
      for (; (u = i.exec(n)) !== null; )
        r.push(u);
      for (; (u = s.exec(n)) !== null; )
        r.push(u);
      for (let c of r) {
        let o = c[1];
        if (!o)
          continue;
        let l = o;
        if (l.startsWith("aHR0"))
          try {
            l = atob(l);
          } catch (f) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${l.substring(0, 80)}...`), { url: l, quality: yield g(l, { Referer: e }), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[VOE] Error: ${t.message}`), null;
    }
  });
}
var w = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function Z(e, t, n) {
  let a = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", i = (s) => {
    let r = 0;
    for (let u = 0; u < s.length; u++) {
      let c = a.indexOf(s[u]);
      if (c === -1)
        return NaN;
      r = r * t + c;
    }
    return r;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (s) => {
    let r = i(s);
    return isNaN(r) || r >= n.length ? s : n[r] && n[r] !== "" ? n[r] : s;
  });
}
function Y(e, t) {
  let n = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (n)
    try {
      let i = n[0].replace(/(\w+)\s*:/g, '"$1":'), s = JSON.parse(i), r = s.hls4 || s.hls3 || s.hls2;
      if (r)
        return r.startsWith("/") ? t + r : r;
    } catch (i) {
      let s = n[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (s) {
        let r = s[1];
        return r.startsWith("/") ? t + r : r;
      }
    }
  let a = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (a) {
    let i = a[1];
    return i.startsWith("/") ? t + i : i;
  }
  return null;
}
var ee = { "hglink.to": "vibuxer.com" };
function x(e) {
  return p(this, null, function* () {
    var t;
    try {
      let n = e;
      for (let [o, l] of Object.entries(ee))
        if (n.includes(o)) {
          n = n.replace(o, l);
          break;
        }
      let a = ((t = n.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : t[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), n !== e && console.log(`[HLSWish] \u2192 Mapped to: ${n}`);
      let i = yield fetch(n, { headers: { "User-Agent": w, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!i.ok)
        throw new Error(`HTTP ${i.status}`);
      let s = yield i.text(), r = s.match(/file\s*:\s*["']([^"']+)["']/i);
      if (r) {
        let o = r[1];
        if (o.startsWith("/") && (o = a + o), o.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${o.substring(0, 80)}...`);
          try {
            let f = (yield fetch(o, { headers: { "User-Agent": w, Referer: a + "/" }, redirect: "follow" })).url;
            f && f.includes(".m3u8") && (o = f);
          } catch (l) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${o.substring(0, 80)}...`), { url: o, quality: "1080p", headers: { "User-Agent": w, Referer: a + "/" } };
      }
      let u = s.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (u) {
        let o = Z(u[1], parseInt(u[2]), u[4].split("|")), l = Y(o, a);
        if (l)
          return console.log(`[HLSWish] URL encontrada: ${l.substring(0, 80)}...`), { url: l, quality: "1080p", headers: { "User-Agent": w, Referer: a + "/" } };
      }
      let c = s.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return c ? (console.log(`[HLSWish] URL encontrada: ${c[0].substring(0, 80)}...`), { url: c[0], quality: "1080p", headers: { "User-Agent": w, Referer: a + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (n) {
      return console.log(`[HLSWish] Error: ${n.message}`), null;
    }
  });
}
var q = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function k(e) {
  return p(this, null, function* () {
    try {
      console.log(`[Vimeos] Resolviendo: ${e}`);
      let t = yield fetch(e, { headers: { "User-Agent": q, Referer: "https://vimeos.net/", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let a = (yield t.text()).match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
      if (a) {
        let i = a[1], s = parseInt(a[2]), r = a[4].split("|"), u = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", c = (f) => {
          let h = 0;
          for (let d = 0; d < f.length; d++)
            h = h * s + u.indexOf(f[d]);
          return h;
        }, l = i.replace(/\b(\w+)\b/g, (f) => {
          let h = c(f);
          return r[h] && r[h] !== "" ? r[h] : f;
        }).match(/["']([^"']+\.m3u8[^"']*)['"]/i);
        if (l) {
          let f = l[1], h = { "User-Agent": q, Referer: "https://vimeos.net/" }, d = yield g(f, h);
          return console.log(`[Vimeos] URL encontrada: ${f.substring(0, 80)}...`), { url: f, quality: d, headers: h };
        }
      }
      return console.log("[Vimeos] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[Vimeos] Error: ${t.message}`), null;
    }
  });
}
var te = "439c478a771f35c05022f9feabcca01c", ne = "https://www.cinecalidad.vg", oe = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", R = { "User-Agent": oe, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9", Connection: "keep-alive", "Upgrade-Insecure-Requests": "1", Referer: "https://www.cinecalidad.vg/" }, H = { "goodstream.one": T, "hlswish.com": x, "streamwish.com": x, "streamwish.to": x, "strwish.com": x, "voe.sx": N, "vimeos.net": k }, re = (e) => e.includes("goodstream") ? "GoodStream" : e.includes("hlswish") || e.includes("streamwish") || e.includes("strwish") ? "StreamWish" : e.includes("voe.sx") ? "VOE" : e.includes("filemoon") ? "Filemoon" : e.includes("vimeos") ? "Vimeos" : "Online", se = (e) => {
  if (!e || !e.startsWith("http"))
    return null;
  for (let t in H)
    if (e.includes(t))
      return H[t];
  return null;
};
function ae(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function ie(e, t) {
  return p(this, null, function* () {
    let n = [{ lang: "es-MX", name: "Latino" }, { lang: "es-ES", name: "Espa\xF1a" }, { lang: "en-US", name: "Ingl\xE9s" }];
    for (let { lang: a, name: i } of n)
      try {
        let s = `https://api.themoviedb.org/3/${t}/${e}?api_key=${te}&language=${a}`, r = yield fetch(s, { headers: R }).then((o) => o.json()), u = t === "movie" ? r.title : r.name, c = t === "movie" ? r.original_title : r.original_name;
        if (!u || a === "es-MX" && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(u))
          continue;
        return console.log(`[CineCalidad] TMDB (${i}): "${u}"${u !== c ? ` | Original: "${c}"` : ""}`), { title: u, originalTitle: c, year: (r.release_date || r.first_air_date || "").substring(0, 4) };
      } catch (s) {
        console.log(`[CineCalidad] Error TMDB ${i}: ${s.message}`);
      }
    return null;
  });
}
function V(e) {
  return e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function ce(e) {
  let t = e.match(/<h1[^>]*>[^<]*\((\d{4})\)[^<]*<\/h1>/);
  return t ? t[1] : null;
}
function _(e, t) {
  return p(this, null, function* () {
    let n = [e, `${e}-2`, `${e}-3`];
    for (let a of n) {
      let i = `${ne}/pelicula/${a}/`;
      try {
        let s = yield fetch(i, { headers: R }).then((u) => u.text()), r = ce(s);
        if (!r || !t || r === t)
          return console.log(`[CineCalidad] \u2713 Slug directo: /pelicula/${a}/ (${r || "?"})`), i;
        console.log(`[CineCalidad] A\xF1o no coincide: esperado ${t}, encontrado ${r} en /pelicula/${a}/`);
      } catch (s) {
      }
    }
    return null;
  });
}
var le = ["goodstream.one", "voe.sx", "filemoon.sx", "filemoon.to", "hlswish.com", "streamwish.com", "streamwish.to", "strwish.com", "vimeos.net"];
function D(e) {
  return le.some((t) => e.includes(t));
}
function ue(e) {
  return p(this, null, function* () {
    try {
      let t = yield fetch(e, { headers: R }).then((o) => o.text()), n = [], a = /data-src="([A-Za-z0-9+/=]{20,})"/g, i;
      for (; (i = a.exec(t)) !== null; )
        n.push(i[1]);
      let s = [...new Set(n.map((o) => ae(o)).filter((o) => o && o.startsWith("http")))], r = s.filter(D), u = s.filter((o) => !D(o));
      console.log(`[CineCalidad] ${r.length} embeds directos, ${u.length} intermedios`);
      let c = new Set(r);
      return u.length > 0 && (yield Promise.allSettled(u.map((o) => p(this, null, function* () {
        try {
          let l = yield fetch(o, { headers: R }).then((d) => d.text()), f = "", h = l.match(/id="btn_enlace"[^>]*>[\s\S]*?href="([^"]+)"/);
          if (h && (f = h[1]), !f) {
            let d = l.match(/<iframe[^>]+src="([^"]+)"/);
            d && (f = d[1]);
          }
          !f && o.includes("/e/") && (f = o), f && f.startsWith("http") && c.add(f);
        } catch (l) {
        }
      })))), [...c];
    } catch (t) {
      return console.log(`[CineCalidad] Error obteniendo embeds: ${t.message}`), [];
    }
  });
}
function fe(e) {
  return p(this, null, function* () {
    try {
      let t = se(e);
      if (!t)
        return console.log(`[CineCalidad] Sin resolver para: ${e.substring(0, 60)}`), null;
      let n = re(e), a = yield t(e);
      return !a || !a.url ? null : { name: "CineCalidad", title: `${a.quality || "1080p"} \xB7 ${n}`, url: a.url, quality: a.quality || "1080p", headers: a.headers || {} };
    } catch (t) {
      return null;
    }
  });
}
function he(e, t, n, a) {
  return p(this, null, function* () {
    if (!e || !t)
      return [];
    let i = Date.now();
    if (console.log(`[CineCalidad] Buscando: TMDB ${e} (${t})${n ? ` S${n}E${a}` : ""}`), t === "tv")
      return console.log("[CineCalidad] Series no soportadas a\xFAn"), [];
    try {
      let s = yield ie(e, t);
      if (!s)
        return [];
      let r = V(s.title), c = yield _(r, s.year);
      if (!c && s.originalTitle && s.originalTitle !== s.title) {
        let m = V(s.originalTitle);
        c = yield _(m, s.year);
      }
      if (!c)
        return console.log("[CineCalidad] No encontrado por slug"), [];
      let o = yield ue(c);
      if (o.length === 0)
        return console.log("[CineCalidad] No se encontraron embeds"), [];
      console.log(`[CineCalidad] Resolviendo ${o.length} embeds...`);
      let l = 5e3, f = [...new Set(o)], h = yield new Promise((m) => {
        let $ = [], S = 0, A = f.length, b = () => m($.filter(Boolean));
        f.forEach((z) => {
          fe(z).then((C) => {
            C && $.push(C), S++, S === A && b();
          }).catch(() => {
            S++, S === A && b();
          });
        });
      }), d = ((Date.now() - i) / 1e3).toFixed(2);
      return console.log(`[CineCalidad] \u2713 ${h.length} streams en ${d}s`), h;
    } catch (s) {
      return console.log(`[CineCalidad] Error: ${s.message}`), [];
    }
  });
}
