#!/usr/bin/env node
/**
 * Inline Bundler — resolves require("./...") calls by inlining the required file.
 *
 * The Nuvio Mobile QuickJS runtime only supports require("cheerio") and require("crypto-js").
 * All local file requires must be inlined.
 *
 * Usage: node bundle.js
 */

const fs = require('fs');
const path = require('path');

const PROVIDERS_DIR = path.join(__dirname, '..', 'providers');
const BUNDLED_DIR = path.join(__dirname, '..', 'providers_bundled');

// Already-bundled providers that should be copied as-is (esbuild outputs)
const SKIP = new Set([]);

// Files we've already inlined (to avoid double-inlining)
const inlined = new Map();

function resolveModule(requirePath, currentFile) {
    const currentDir = path.dirname(currentFile);
    let resolved = path.resolve(currentDir, requirePath);
    
    // Try exact path first
    if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
            // Try index.js inside directory
            const indexFile = path.join(resolved, 'index.js');
            if (fs.existsSync(indexFile)) return indexFile;
            return null;
        }
        return resolved;
    }
    
    // Try with .js extension
    if (fs.existsSync(resolved + '.js')) return resolved + '.js';
    
    return null;
}

function inlineRequires(code, currentFile, depth = 0) {
    if (depth > 10) return code; // Prevent infinite recursion
    
    // Find all require("./...") calls — both assigned and bare
    const requireRegex = /(?:^|\n)\s*(?:(?:const|var|let)\s+(?:\{[^}]+\}\s*=\s*)?)?require\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
    
    let result = code;
    let match;
    
    while ((match = requireRegex.exec(code)) !== null) {
        const requirePath = match[1];
        const fullMatch = match[0];
        
        // Only inline local paths, skip npm packages
        if (!requirePath.startsWith('.') && !requirePath.startsWith('/')) continue;
        
        const resolved = resolveModule(requirePath, currentFile);
        if (!resolved) {
            console.warn(`  WARN: Cannot resolve ${requirePath} from ${currentFile}`);
            continue;
        }
        
        // Skip if already inlined at this scope level
        const key = resolved;
        if (inlined.has(key)) {
            // Replace with nothing (already inlined elsewhere)
            result = result.replace(fullMatch, `// [inlined] ${requirePath}`);
            continue;
        }
        
        // Read and process the dependency
        let depCode = fs.readFileSync(resolved, 'utf-8');
        
        // Remove module.exports = ... from dependency (it will be inlined)
        depCode = depCode.replace(/module\.exports\s*=\s*\{[^}]*\}|module\.exports\s*=\s*[^;]+;/g, '');
        
        // Recursively inline this dependency's requires
        depCode = inlineRequires(depCode, resolved, depth + 1);
        
        // Mark as inlined
        inlined.set(key, true);
        
        // Replace the require statement with the inlined code
        result = result.replace(fullMatch, `// === Inlined from ${requirePath} ===\n${depCode}\n// === End inlined ===`);
    }
    
    return result;
}

function bundleProvider(filename) {
    const filePath = path.join(PROVIDERS_DIR, filename);
    if (!fs.existsSync(filePath)) return;
    
    const code = fs.readFileSync(filePath, 'utf-8');
    
    // Check if there are local requires
    if (!code.match(/require\s*\(\s*["']\.\//)) {
        // No local requires — copy as-is
        const dest = path.join(BUNDLED_DIR, filename);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, code);
        return;
    }
    
    console.log(`Bundling: ${filename}`);
    
    // Reset inlined cache for each provider (deps can repeat across providers)
    inlined.clear();
    
    const bundled = inlineRequires(code, filePath);
    
    const dest = path.join(BUNDLED_DIR, filename);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bundled);
}

// Main
console.log('Inlining requires...\n');

const files = fs.readdirSync(PROVIDERS_DIR).filter(f => f.endsWith('.js'));

// First pass: resolve.js and tmdb_config.js are utility files — skip them
const skipFiles = new Set(['resolvers.js', 'tmdb_config.js', 'tmdb_utils.js']);
const resolversFiles = new Set(['voe.js', 'streamwish.js', 'vidhide.js', 'filemoon.js', 'okru.js', 'mixdrop.js', 'mirrors.js', 'index.js']);
const utilsFiles = new Set(['fetch_helpers.js', 'log_sanitizer.js', 'quality.js', 'stream_helpers.js']);

for (const f of files) {
    if (skipFiles.has(f)) continue;
    // Skip resolver and utility subdirectories
    if (f.startsWith('resolvers') || f.startsWith('utils')) continue;
    bundleProvider(f);
}

console.log('\nDone.');
