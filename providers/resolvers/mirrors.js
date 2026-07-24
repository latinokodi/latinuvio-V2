/**
 * Mirror domain lists — canonical from embed69.
 *
 * Each resolver checks these domains to decide which resolver to call.
 * Sites frequently rotate domains; update here once instead of in every provider.
 */

const MIRRORS = {
    VOE: [
        "voe.sx", "voe-sx", "voex.sx",
        "marissashare", "cloudwindow", "marissasharecareer"
    ],
    STREAMWISH: [
        "hlswish", "streamwish", "hglink", "hglamioz", "hglink.to",
        "audinifer", "embedwish", "awish", "dwish", "strwish",
        "filelions", "wishembed", "wishfast", "hanerix",
        "bysezoxexe", "vibuxer", "premilkyway",
        "flaswish", "sfastwish", "dhcplay", "luluvdoo", "luluvdo", "luluvid", "listream"
    ],
    VIDHIDE: [
        "vidhide", "minochinos", "vadisov", "vaiditv", "amusemre",
        "callistanise", "vhaudm", "mdfury", "dintezuvio", "acek-cdn",
        "vedonm", "vidhidepro", "vidhidevip", "masukestin",
        "morencius", "movearnpre", "vidhidepre", "do7go", "ds2play"
    ],
    FILEMOON: [
        "filemoon", "moonalu", "moonembed", "bysedikamoum",
        "r66nv9ed", "398fitus", "filemoon.sx", "filemoon.to",
        "filemoon.lat", "filemoon.live", "filemoon.online",
        "filemoon.me", "bysedikamoum.com", "r66nv9ed.com",
        "398fitus.com", "fmoon.top", "fmoon",
        "bysesukior", "movearnpre", "bysejikuar", "bysevepoin", "bysefujedu"
    ],
    OKRU: [
        "ok.ru", "okru"
    ],
    DOODSTREAM: [
        "dood.li", "dood.la", "dood.yt", "dood.ws", "dood.so",
        "dood.to", "dood.pm", "dood.watch", "dood.sh", "dood.cx",
        "dood.wf", "dood.re", "dood.one", "dood.tech", "dood.work",
        "doods.pro", "dooood.com", "doodstream.com", "doodstream.co",
        "d000d.com", "d0000d.com", "doodapi.com", "d0o0d.com",
        "do0od.com", "dooodster.com", "vidply.com", "do7go.com",
        "ds2video.com", "ds2play.com", "dsvplay.com"
    ],
    MIXDROP: [
        "mixdrop.ag", "mixdrop.ps", "mixdrop.to", "mixdrop.co",
        "mxdrop.to", "mixdrop", "m1xdrop"
    ]
};

function isMirror(url, groupName) {
    if (!url || !MIRRORS[groupName]) return false;
    const s = url.toLowerCase();
    return MIRRORS[groupName].some(m => s.includes(m));
}

module.exports = { MIRRORS, isMirror };
