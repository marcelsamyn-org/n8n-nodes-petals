// Copies n8n codex metadata (*.node.json) into dist/, mirroring the source tree.
// n8n-node build handles SVGs and PNGs; this covers the codex files that tsc
// does not emit (un-imported JSON). Zero dependencies.
import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CODEX_RE = /\.node\.json$/i;

async function* codexFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* codexFiles(full);
    else if (CODEX_RE.test(entry.name)) yield full;
  }
}

for (const srcRoot of ['nodes', 'credentials']) {
  for await (const src of codexFiles(join(root, srcRoot))) {
    const dest = join(root, 'dist', relative(root, src));
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest);
  }
}
