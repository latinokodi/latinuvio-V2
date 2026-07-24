/**
 * Flat re-export shim for QuickJS compatibility.
 *
 * QuickJS's require() only resolves flat .js files, not directories.
 * Node.js resolves require("./resolvers") → ./resolvers/index.js
 * QuickJS resolves require("./resolvers") → ./resolvers.js
 *
 * This file bridges the gap so all providers work on both runtimes.
 */

module.exports = require("./resolvers/index.js");
