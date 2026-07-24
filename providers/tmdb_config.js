/**
 * Shared TMDB configuration.
 * Import this instead of hardcoding keys in each provider.
 *
 * Also installs the global log sanitizer — all console.log/warn/error output
 * is automatically redacted (API keys, m3u8 URLs, cookies, HTML dumps).
 * Set LOG_REDACTION=0 to disable.
 */

// Install log sanitizer globally (idempotent, safe to call multiple times)
require("./utils/log_sanitizer");

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const TMDB_API_KEY_DORAMASFLIX = "925ef0627fa092898f02c1b62e78fa1b";

module.exports = { TMDB_API_KEY, TMDB_API_KEY_DORAMASFLIX };
