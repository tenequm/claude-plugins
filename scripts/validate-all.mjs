#!/usr/bin/env node

import { readdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function validateAll() {
  const workspaceConfig = await readdir('.', { withFileTypes: true });
  const skillDirs = workspaceConfig
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !['node_modules', 'scripts'].includes(d.name))
    .map(d => d.name);

  console.log(`🔍 Validating ${skillDirs.length} skills...\n`);

  let allValid = true;

  for (const skill of skillDirs) {
    const skillPath = join(process.cwd(), skill);

    try {
      console.log(`Validating ${skill}...`);
      const { stdout } = await execAsync(
        `python3 .claude/skills/skill-creator/scripts/quick_validate.py "${skillPath}"`
      );
      console.log(stdout);
    } catch (error) {
      console.error(`❌ ${skill} validation failed:`);
      console.error(error.stdout || error.message);
      allValid = false;
    }
  }

  if (!allValid) {
    console.error('\n❌ Some skills failed validation');
    process.exit(1);
  }

  console.log('\n✅ All skills validated successfully!');
}

validateAll();
