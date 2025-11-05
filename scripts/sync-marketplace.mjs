#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

async function syncMarketplace() {
  console.log('📦 Syncing marketplace.json with package versions...\n');

  const marketplacePath = join(ROOT_DIR, '.claude-plugin', 'marketplace.json');
  const marketplaceContent = await readFile(marketplacePath, 'utf-8');
  const marketplace = JSON.parse(marketplaceContent);

  let updated = false;

  for (const plugin of marketplace.plugins) {
    // Skip non-local sources (GitHub repos, URLs, etc.)
    if (typeof plugin.source !== 'string' || plugin.source.startsWith('http')) {
      console.log(`  ⊘ ${plugin.name}: Skipping non-local source`);
      continue;
    }

    const packagePath = join(ROOT_DIR, plugin.source, 'package.json');

    try {
      const packageContent = await readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      if (!packageJson.version) {
        console.error(`  ✗ ${plugin.name}: package.json missing version field`);
        process.exit(1);
      }

      if (plugin.version !== packageJson.version) {
        console.log(`  ✓ ${plugin.name}: ${plugin.version} → ${packageJson.version}`);
        plugin.version = packageJson.version;
        updated = true;
      } else {
        console.log(`  • ${plugin.name}: ${plugin.version} (unchanged)`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to read ${plugin.name}/package.json:`);
      console.error(`    ${error.message}`);
      console.error(`    Ensure package.json exists with a version field.`);
      process.exit(1);
    }
  }

  if (updated) {
    await writeFile(
      marketplacePath,
      JSON.stringify(marketplace, null, 2) + '\n',
      'utf-8'
    );
    console.log('\n✅ marketplace.json updated successfully!');
  } else {
    console.log('\n✅ All versions already in sync!');
  }
}

syncMarketplace().catch((error) => {
  console.error('❌ Error syncing marketplace:', error);
  process.exit(1);
});
