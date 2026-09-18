import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const catalogUrl = new URL('../packages/catalog/comparisons.json', import.meta.url);
const catalogPath = fileURLToPath(catalogUrl);

try {
  const source = await readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(source);

  if (!Array.isArray(catalog)) {
    throw new Error('The catalog must be a JSON array.');
  }

  console.log(`Catalog file is valid JSON (${catalog.length} comparison records).`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Catalog validation failed: ${message}`);
  process.exitCode = 1;
}
