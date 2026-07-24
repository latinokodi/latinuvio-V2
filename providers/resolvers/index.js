/**
 * Shared resolver dispatcher.
 *
 * Import this in your provider, then call resolveEmbed(url) to route any embed URL
 * to the correct resolver. Add new resolvers here once — all providers benefit.
 *
 * Usage:
 *   const { resolveEmbed } = require("./resolvers");
 *   const result = await resolveEmbed(embedUrl);
 *   if (result) streams.push({ name: result.server, title: result.quality, url: result.url, ... });
 */

const { resolveVoe } = require("./voe");
const { resolveStreamwish } = require("./streamwish");
const { resolveVidhide } = require("./vidhide");
const { resolveFilemoon } = require("./filemoon");
const { resolveOkru } = require("./okru");
const { resolveMixDrop } = require("./mixdrop");
const { isMirror } = require("./mirrors");
const { detectQuality } = require("../utils/quality");

/**
 * Resolve a single embed URL to a playable stream.
 * @param {string} embedUrl
 * @returns {Promise<{url, server, quality, headers}|null>}
 */
async function resolveEmbed(embedUrl) {
    const u = (embedUrl || "").toLowerCase();

    if (isMirror(u, "VOE"))          return resolveVoe(embedUrl);
    if (isMirror(u, "STREAMWISH"))   return resolveStreamwish(embedUrl);
    if (isMirror(u, "VIDHIDE"))      return resolveVidhide(embedUrl);
    if (isMirror(u, "FILEMOON"))     return resolveFilemoon(embedUrl);
    if (isMirror(u, "OKRU"))         return resolveOkru(embedUrl);
    if (isMirror(u, "MIXDROP"))      return resolveMixDrop(embedUrl);

    return null;
}

/**
 * Like resolveEmbed, but also probes the m3u8 for real resolution.
 * Adds ~1-3s latency per stream — use only when quality accuracy matters.
 */
async function resolveEmbedWithQuality(embedUrl) {
    const result = await resolveEmbed(embedUrl);
    if (!result || !result.url) return result;

    // Only probe m3u8 URLs, skip mp4
    if (result.url.includes(".m3u8")) {
        const realQuality = await detectQuality(result.url, result.headers);
        if (realQuality) {
            result.quality = realQuality;
        }
    }

    return result;
}

module.exports = {
    resolveEmbed,
    resolveEmbedWithQuality,
    // Individual resolvers for providers that need granular control
    resolveVoe,
    resolveStreamwish,
    resolveVidhide,
    resolveFilemoon,
    resolveOkru,
    resolveMixDrop,
    isMirror
};
