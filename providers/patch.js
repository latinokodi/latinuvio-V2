const fs = require('fs');
const path = require('path');

const areshd = fs.readFileSync(path.join(__dirname, 'areshd.js'), 'utf8');
const lines = areshd.split('\n');

// Extract lines 26 to 591 (0-indexed: 26-591 means index 25 to 590, let's just use string search)
const startIdx = lines.findIndex(l => l.includes('const MIRRORS = {'));
const endIdx = lines.findIndex(l => l.includes('function resolveEmbed(embedUrl) {'));

// find the end of resolveEmbed
let embedEndIdx = endIdx;
while (!lines[embedEndIdx].includes('return null;')) {
    embedEndIdx++;
}
embedEndIdx++; // include the closing brace
// Actually it's just '}' on the next line
embedEndIdx++;

const resolverCode = lines.slice(startIdx, embedEndIdx + 1).join('\n');

let vitaminagg = fs.readFileSync(path.join(__dirname, 'vitaminagg.js'), 'utf8');

// Insert resolverCode just before function decrypt
vitaminagg = vitaminagg.replace('function decrypt(hexCiphertext) {', resolverCode + '\n\nfunction decrypt(hexCiphertext) {');

// Replace the fallback logic
const targetLogic = `if (!videoHash) {
                    console.log(\`[VitaminagG] No video hash in data-src for \${opt}, treating as direct embed: \${videoBackendUrlRaw}\`);
                    if (videoBackendUrlRaw.startsWith("http")) {
                        streams.push({
                            name: "VitaminagG",
                            title: \`\${title} \xB7 \${opt.replace('opcion', 'Opción')}\`,
                            url: videoBackendUrlRaw,
                            quality: "1080p",
                            headers: {
                                "User-Agent": UA,
                                "Referer": pageUrl
                            }
                        });
                    }
                    continue;
                }`;

const newLogic = `if (!videoHash) {
                    console.log(\`[VitaminagG] No video hash in data-src for \${opt}, treating as direct embed: \${videoBackendUrlRaw}\`);
                    if (videoBackendUrlRaw.startsWith("http")) {
                        // Check if it's already an mp4/m3u8 link (like ajplstarx.workers.dev)
                        if (videoBackendUrlRaw.includes(".mp4") || videoBackendUrlRaw.includes(".m3u8")) {
                            streams.push({
                                name: "VitaminagG",
                                title: \`\${title} \xB7 \${opt.replace('opcion', 'Opción')}\`,
                                url: videoBackendUrlRaw,
                                quality: "1080p",
                                headers: {
                                    "User-Agent": UA,
                                    "Referer": pageUrl
                                }
                            });
                            continue;
                        }

                        // Try to resolve it via known mirrors
                        const resolved = await resolveEmbed(videoBackendUrlRaw);
                        if (resolved) {
                            streams.push({
                                name: "VitaminagG",
                                title: \`\${title} \xB7 \${resolved.server} (\${opt.replace('opcion', 'Opción')})\`,
                                url: resolved.url,
                                quality: resolved.quality || "1080p",
                                headers: resolved.headers || {
                                    "User-Agent": UA,
                                    "Referer": pageUrl
                                }
                            });
                        }
                    }
                    continue;
                }`;

vitaminagg = vitaminagg.replace(targetLogic, newLogic);

fs.writeFileSync(path.join(__dirname, 'vitaminagg.js'), vitaminagg);
console.log("Successfully patched vitaminagg.js");
