/**
 * Fetch with timeout — prevents hung threads from blocking the PluginRuntime.
 *
 * Usage:
 *   const html = await fetchWithTimeout(url, { headers }, 15000);
 *   // Rejects with "Timeout after 15000ms" instead of hanging forever
 *
 * Default timeout: 15s for embed pages, 8s for API/search calls.
 */

// ─── Timeout signal creation (cross-runtime) ─────────────────────────────────

function createTimeoutSignal(timeoutMs) {
    const ms = parseInt(timeoutMs, 10);
    if (!Number.isFinite(ms) || ms <= 0) {
        return { signal: undefined, cleanup: null };
    }

    // Modern runtime: AbortSignal.timeout()
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return { signal: AbortSignal.timeout(ms), cleanup: null };
    }

    // Fallback: AbortController + setTimeout
    if (typeof AbortController !== "undefined" && typeof setTimeout === "function") {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        return { signal: controller.signal, cleanup: () => clearTimeout(id) };
    }

    // No timeout support — return no signal
    return { signal: undefined, cleanup: null };
}

// ─── Main fetch wrapper ──────────────────────────────────────────────────────

const EMBED_TIMEOUT = 15000;   // 15s for embed pages
const SEARCH_TIMEOUT = 8000;    //  8s for API/search calls

async function fetchWithTimeout(url, options = {}, timeoutMs = EMBED_TIMEOUT) {
    const { timeout: _, ...fetchOptions } = options; // strip custom timeout key
    const { signal, cleanup } = createTimeoutSignal(timeoutMs);

    // Merge signals if the caller already provided one
    let finalOptions = { ...fetchOptions };
    if (signal) {
        if (fetchOptions.signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
            finalOptions.signal = AbortSignal.any([fetchOptions.signal, signal]);
        } else if (!fetchOptions.signal) {
            finalOptions.signal = signal;
        }
        // If caller already has a signal and no AbortSignal.any, their signal wins
    }

    try {
        const response = await fetch(url, finalOptions);
        return response;
    } catch (error) {
        if (error && error.name === "AbortError") {
            throw new Error(`Timeout after ${timeoutMs}ms: ${url.substring(0, 100)}`);
        }
        throw error;
    } finally {
        if (typeof cleanup === "function") cleanup();
    }
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

async function fetchText(url, options = {}, timeoutMs = EMBED_TIMEOUT) {
    const resp = await fetchWithTimeout(url, options, timeoutMs);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url.substring(0, 80)}`);
    return resp.text();
}

async function fetchJson(url, options = {}, timeoutMs = SEARCH_TIMEOUT) {
    const resp = await fetchWithTimeout(url, options, timeoutMs);
    if (!resp.ok) return null;
    try { return await resp.json(); } catch (_) { return null; }
}

module.exports = {
    fetchWithTimeout,
    fetchText,
    fetchJson,
    createTimeoutSignal,
    EMBED_TIMEOUT,
    SEARCH_TIMEOUT,
};
