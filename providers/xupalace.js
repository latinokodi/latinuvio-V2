var R = Object.defineProperty;
var _ = Object.getOwnPropertyDescriptor;
var T = Object.getOwnPropertyNames, L = Object.getOwnPropertySymbols;
var k = Object.prototype.hasOwnProperty, O = Object.prototype.propertyIsEnumerable;
var W = (e, t, n) => t in e ? R(e, t, { enumerable: true, configurable: true, writable: true, value: n }) : e[t] = n, A = (e, t) => {
  for (var n in t || (t = {}))
    k.call(t, n) && W(e, n, t[n]);
  if (L)
    for (var n of L(t))
      O.call(t, n) && W(e, n, t[n]);
  return e;
};
var I = (e, t) => {
  for (var n in t)
    R(e, n, { get: t[n], enumerable: true });
}, X = (e, t, n, l) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let s of T(t))
      !k.call(e, s) && s !== n && R(e, s, { get: () => t[s], enumerable: !(l = _(t, s)) || l.enumerable });
  return e;
};
var q = (e) => X(R({}, "__esModule", { value: true }), e);
var f = (e, t, n) => new Promise((l, s) => {
  var c = (r) => {
    try {
      u(n.next(r));
    } catch (o) {
      s(o);
    }
  }, a = (r) => {
    try {
      u(n.throw(r));
    } catch (o) {
      s(o);
    }
  }, u = (r) => r.done ? l(r.value) : Promise.resolve(r.value).then(c, a);
  u((n = n.apply(e, t)).next());
});
var se = {};
I(se, { getStreams: () => re });
module.exports = q(se);
var D = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", x = { vimeos: { h: "720p", n: "480p" }, goodstream: { x: "1080p", h: "720p", n: "480p", l: "360p" }, vidhide: { n: "720p", l: "480p" }, streamwish: { x: "1080p", h: "1080p", n: "720p", l: "480p" }, voe: { n: "720p", l: "360p" } }, z = ["x", "o", "h", "n", "l"];
function j(e) {
  return e.includes("vimeos") ? x.vimeos : e.includes("goodstream") ? x.goodstream : e.includes("cloudwindow-route") ? x.voe : e.includes("minochinos") || e.includes("vidhide") || e.includes("dintezuvio") || e.includes("dramiyos") ? x.vidhide : e.includes("premilkyway") || e.includes("hlswish") || e.includes("vibuxer") || e.includes("streamwish") ? x.streamwish : null;
}
function g(n) {
  return f(this, arguments, function* (e, t = {}) {
    let l = E(e);
    return l !== "Unknown" ? l : yield C(e, t);
  });
}
function E(e) {
  if (!e)
    return "Unknown";
  let t = j(e);
  if (t) {
    let l = e.match(/_,([a-z,]+),\.urlset/);
    if (l) {
      let s = l[1].split(",").filter(Boolean);
      for (let c of z)
        if (s.includes(c) && t[c])
          return t[c];
    }
  }
  let n = e.match(/[_\-\/](\d{3,4})p/);
  return n ? n[1] + "p" : "Unknown";
}
function B(e, t) {
  return e >= 3840 || t >= 2160 ? "4K" : e >= 1920 || t >= 1080 ? "1080p" : e >= 1280 || t >= 720 ? "720p" : e >= 854 || t >= 480 ? "480p" : "360p";
}
function C(n) {
  return f(this, arguments, function* (e, t = {}) {
    try {
      let s = yield (yield fetch(e, { headers: A({ "User-Agent": D }, t), redirect: "follow" })).text();
      if (!s.includes("#EXT-X-STREAM-INF")) {
        let u = e.match(/[_-](\d{3,4})p/);
        return u ? `${u[1]}p` : "Unknown";
      }
      let c = 0, a = 0;
      for (let u of s.split(`
`)) {
        let r = u.match(/RESOLUTION=(\d+)x(\d+)/);
        if (r) {
          let o = parseInt(r[2]);
          o > a && (a = o, c = parseInt(r[1]));
        }
      }
      return a > 0 ? B(c, a) : "Unknown";
    } catch (l) {
      return "Unknown";
    }
  });
}
var v = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function K(e, t, n) {
  let l = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", s = (c) => {
    let a = 0;
    for (let u = 0; u < c.length; u++) {
      let r = l.indexOf(c[u]);
      if (r === -1)
        return NaN;
      a = a * t + r;
    }
    return a;
  };
  return e.replace(/\b([0-9a-zA-Z]+)\b/g, (c) => {
    let a = s(c);
    return isNaN(a) || a >= n.length ? c : n[a] && n[a] !== "" ? n[a] : c;
  });
}
function Q(e, t) {
  let n = e.match(/\{[^{}]*"hls[234]"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (n)
    try {
      let s = n[0].replace(/(\w+)\s*:/g, '"$1":'), c = JSON.parse(s), a = c.hls4 || c.hls3 || c.hls2;
      if (a)
        return a.startsWith("/") ? t + a : a;
    } catch (s) {
      let c = n[0].match(/"hls[234]"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (c) {
        let a = c[1];
        return a.startsWith("/") ? t + a : a;
      }
    }
  let l = e.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/i);
  if (l) {
    let s = l[1];
    return s.startsWith("/") ? t + s : s;
  }
  return null;
}
var F = { "hglink.to": "vibuxer.com" };
function S(e) {
  return f(this, null, function* () {
    var t;
    try {
      let n = e;
      for (let [o, i] of Object.entries(F))
        if (n.includes(o)) {
          n = n.replace(o, i);
          break;
        }
      let l = ((t = n.match(/^(https?:\/\/[^/]+)/)) == null ? void 0 : t[1]) || "https://hlswish.com";
      console.log(`[HLSWish] Resolviendo: ${e}`), n !== e && console.log(`[HLSWish] \u2192 Mapped to: ${n}`);
      let s = yield fetch(n, { headers: { "User-Agent": v, Referer: "https://embed69.org/", Origin: "https://embed69.org", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-MX,es;q=0.9" }, redirect: "follow" });
      if (!s.ok)
        throw new Error(`HTTP ${s.status}`);
      let c = yield s.text(), a = c.match(/file\s*:\s*["']([^"']+)["']/i);
      if (a) {
        let o = a[1];
        if (o.startsWith("/") && (o = l + o), o.includes("vibuxer.com/stream/")) {
          console.log(`[HLSWish] Siguiendo redirect: ${o.substring(0, 80)}...`);
          try {
            let d = (yield fetch(o, { headers: { "User-Agent": v, Referer: l + "/" }, redirect: "follow" })).url;
            d && d.includes(".m3u8") && (o = d);
          } catch (i) {
          }
        }
        return console.log(`[HLSWish] URL encontrada: ${o.substring(0, 80)}...`), { url: o, quality: g(o), headers: { "User-Agent": v, Referer: l + "/" } };
      }
      let u = c.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
      if (u) {
        let o = K(u[1], parseInt(u[2]), u[4].split("|")), i = Q(o, l);
        if (i)
          return console.log(`[HLSWish] URL encontrada: ${i.substring(0, 80)}...`), { url: i, quality: g(i), headers: { "User-Agent": v, Referer: l + "/" } };
      }
      let r = c.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
      return r ? (console.log(`[HLSWish] URL encontrada: ${r[0].substring(0, 80)}...`), { url: r[0], quality: g(r[0]), headers: { "User-Agent": v, Referer: l + "/" } }) : (console.log("[HLSWish] No se encontr\xF3 URL"), null);
    } catch (n) {
      return console.log(`[HLSWish] Error: ${n.message}`), null;
    }
  });
}
var G = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function U(e) {
  try {
    return typeof atob != "undefined" ? atob(e) : Buffer.from(e, "base64").toString("utf8");
  } catch (t) {
    return null;
  }
}
function J(e, t) {
  try {
    let l = t.replace(/^\[|\]$/g, "").split("','").map((o) => o.replace(/^'+|'+$/g, "")).map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), s = "";
    for (let o of e) {
      let i = o.charCodeAt(0);
      i > 64 && i < 91 ? i = (i - 52) % 26 + 65 : i > 96 && i < 123 && (i = (i - 84) % 26 + 97), s += String.fromCharCode(i);
    }
    for (let o of l)
      s = s.replace(new RegExp(o, "g"), "_");
    s = s.split("_").join("");
    let c = U(s);
    if (!c)
      return null;
    let a = "";
    for (let o = 0; o < c.length; o++)
      a += String.fromCharCode((c.charCodeAt(o) - 3 + 256) % 256);
    let u = a.split("").reverse().join(""), r = U(u);
    return r ? JSON.parse(r) : null;
  } catch (n) {
    return console.log("[VOE] voeDecode error:", n.message), null;
  }
}
function b(n) {
  return f(this, arguments, function* (e, t = {}) {
    return yield fetch(e, { method: "GET", headers: A({ "User-Agent": G, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }, t), redirect: "follow" });
  });
}
function H(e) {
  return f(this, null, function* () {
    try {
      console.log(`[VOE] Resolviendo: ${e}`);
      let t = yield b(e, { Referer: e });
      if (!t.ok)
        throw new Error(`HTTP ${t.status}`);
      let n = yield t.text();
      if (/permanentToken/i.test(n)) {
        let r = n.match(/window\.location\.href\s*=\s*'([^']+)'/i);
        if (r) {
          console.log(`[VOE] Permanent token redirect -> ${r[1]}`);
          let o = yield b(r[1], { Referer: e });
          o.ok && (n = yield o.text());
        }
      }
      let l = n.match(/json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i);
      if (l) {
        let r = l[1], o = l[2].startsWith("http") ? l[2] : new URL(l[2], e).href;
        console.log(`[VOE] Found encoded array + loader: ${o}`);
        let i = yield b(o, { Referer: e }), d = i.ok ? yield i.text() : "", m = d.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) || d.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
        if (m) {
          let h = J(r, m[1]);
          if (h && (h.source || h.direct_access_url)) {
            let p = h.source || h.direct_access_url, w = E(p);
            return console.log(`[VOE] URL encontrada: ${p.substring(0, 80)}...`), { url: p, quality: w, headers: { Referer: e } };
          }
        }
      }
      let s = /(?:mp4|hls)'\s*:\s*'([^']+)'/gi, c = /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi, a = [], u;
      for (; (u = s.exec(n)) !== null; )
        a.push(u);
      for (; (u = c.exec(n)) !== null; )
        a.push(u);
      for (let r of a) {
        let o = r[1];
        if (!o)
          continue;
        let i = o;
        if (i.startsWith("aHR0"))
          try {
            i = atob(i);
          } catch (d) {
          }
        return console.log(`[VOE] URL encontrada (fallback): ${i.substring(0, 80)}...`), { url: i, quality: E(i), headers: { Referer: e } };
      }
      return console.log("[VOE] No se encontr\xF3 URL"), null;
    } catch (t) {
      return console.log(`[VOE] Error: ${t.message}`), null;
    }
  });
}
var N = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function Y(e) {
  try {
    let t = e.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
    if (!t)
      return null;
    let [, n, l, s, c] = t;
    l = parseInt(l), s = parseInt(s), c = c.split("|");
    let a = (u, r) => {
      let o = "0123456789abcdefghijklmnopqrstuvwxyz", i = "";
      for (; u > 0; )
        i = o[u % r] + i, u = Math.floor(u / r);
      return i || "0";
    };
    return n = n.replace(/\b\w+\b/g, (u) => {
      let r = parseInt(u, 36);
      return r < c.length && c[r] ? c[r] : a(r, l);
    }), n;
  } catch (t) {
    return null;
  }
}
function y(e) {
  return f(this, null, function* () {
    var t;
    try {
      console.log(`[VidHide] Resolviendo: ${e}`);
      let n = yield fetch(e, { method: "GET", headers: { "User-Agent": N, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", Referer: "https://embed69.org/" }, redirect: "follow" });
      if (!n.ok)
        throw new Error(`HTTP ${n.status}`);
      let s = (yield n.text()).match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
      if (!s)
        return console.log("[VidHide] No se encontr\xF3 bloque eval"), null;
      let c = Y(s[0]);
      if (!c)
        return console.log("[VidHide] No se pudo desempacar"), null;
      let a = c.match(/"hls4"\s*:\s*"([^"]+)"/), u = c.match(/"hls2"\s*:\s*"([^"]+)"/), r = (t = a || u) == null ? void 0 : t[1];
      if (!r)
        return console.log("[VidHide] No se encontr\xF3 hls4/hls2"), null;
      let o = r;
      r.startsWith("http") || (o = `${new URL(e).origin}${r}`), console.log(`[VidHide] URL encontrada: ${o.substring(0, 80)}...`);
      let i = new URL(e).origin;
      return { url: o, quality: yield g(o, { Referer: `${i}/` }), headers: { "User-Agent": N, Referer: `${i}/`, Origin: i } };
    } catch (n) {
      return console.log(`[VidHide] Error: ${n.message}`), null;
    }
  });
}
var Z = "439c478a771f35c05022f9feabcca01c", P = "https://xupalace.org", V = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", ee = { "User-Agent": V, Accept: "text/html", "Accept-Language": "es-MX,es;q=0.9", Connection: "keep-alive" }, te = { "hglink.to": { fn: S, name: "StreamWish" }, "vibuxer.com": { fn: S, name: "StreamWish" }, "voe.sx": { fn: H, name: "VOE" }, "vidhidepro.com": { fn: y, name: "VidHide" }, "vidhide.com": { fn: y, name: "VidHide" }, "dintezuvio.com": { fn: y, name: "VidHide" }, "filelions.to": { fn: y, name: "VidHide" } };
function ne(e, t) {
  return f(this, null, function* () {
    try {
      let n = `https://api.themoviedb.org/3/${t}/${e}/external_ids?api_key=${Z}`;
      return (yield fetch(n, { headers: { "User-Agent": V } }).then((s) => s.json())).imdb_id || null;
    } catch (n) {
      return console.log(`[XuPalace] Error IMDB ID: ${n.message}`), null;
    }
  });
}
function oe(e, t, n, l) {
  return f(this, null, function* () {
    try {
      let s;
      t === "movie" ? s = `/video/${e}/` : s = `/video/${e}-${n}x${String(l).padStart(2, "0")}/`, console.log(`[XuPalace] Fetching: ${P}${s}`);
      let c = yield fetch(`${P}${s}`, { headers: ee }).then((r) => r.text()), a = [...c.matchAll(/go_to_playerVast\('(https?:\/\/[^']+)'[^)]+\)[^<]*data-lang="(\d+)"/g)];
      if (a.length === 0) {
        let r = [...c.matchAll(/go_to_playerVast\('(https?:\/\/[^']+)'/g)];
        return { 0: [...new Set(r.map((o) => o[1]))] };
      }
      let u = {};
      for (let r of a) {
        let o = r[1], i = parseInt(r[2]);
        u[i] || (u[i] = []), u[i].includes(o) || u[i].push(o);
      }
      return u;
    } catch (s) {
      return console.log(`[XuPalace] Error fetch: ${s.message}`), {};
    }
  });
}
function re(e, t, n, l) {
  return f(this, null, function* () {
    if (!e)
      return [];
    let s = Date.now();
    console.log(`[XuPalace] Buscando: TMDB ${e} (${t})`);
    let c = { 0: "Latino", 1: "Espa\xF1ol", 2: "Subtitulado" };
    try {
      let a = yield ne(e, t);
      if (!a)
        return console.log("[XuPalace] No se encontr\xF3 IMDB ID"), [];
      console.log(`[XuPalace] IMDB ID: ${a}`);
      let u = yield oe(a, t, n, l);
      if (Object.keys(u).length === 0)
        return console.log("[XuPalace] No hay embeds"), [];
      for (let r of [0, 1, 2]) {
        let o = u[r];
        if (!o || o.length === 0)
          continue;
        let i = c[r];
        console.log(`[XuPalace] Resolviendo ${o.length} embeds (${i})...`);
        let m = (yield Promise.allSettled(o.map((h) => f(this, null, function* () {
          try {
            let p = new URL(h).hostname.replace("www.", ""), w = te[p];
            if (!w)
              return console.log(`[XuPalace] Sin resolver para: ${p} \u2192 ${h}`), null;
            let $ = yield w.fn(h);
            if (!$ || !$.url)
              return null;
            let M = $.quality || "Unknown";
            return { name: "XuPalace", title: `${M} \xB7 ${i} \xB7 ${w.name}`, url: $.url, quality: M, headers: $.headers || {} };
          } catch (p) {
            return console.log(`[XuPalace] Error resolviendo URL [${h}]: ${p.message}`), null;
          }
        })))).filter((h) => h.status === "fulfilled" && h.value).map((h) => h.value);
        if (m.length > 0) {
          console.log(`[XuPalace] \u2713 Streams encontrados en ${i}, omitiendo idiomas de menor prioridad`);
          let h = ((Date.now() - s) / 1e3).toFixed(2);
          return console.log(`[XuPalace] \u2713 ${m.length} streams en ${h}s`), m;
        }
      }
      return console.log("[XuPalace] No se encontraron streams en ning\xFAn idioma"), [];
    } catch (a) {
      return console.log(`[XuPalace] Error: ${a.message}`), [];
    }
  });
}
