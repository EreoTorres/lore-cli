import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

export async function runHookInstall(): Promise<void> {
  const cwd = process.cwd();
  const gitDir = path.join(cwd, '.git');

  if (!fs.existsSync(gitDir)) {
    console.error(pc.red('Error:') + ' No .git directory found. Run inside a Git repository.');
    process.exitCode = 1;
    return;
  }

  // Only run if the lore binary is installed; "npx lore-cli" could resolve to a different package
  const hookCmd = 'command -v lore >/dev/null 2>&1 && lore index >/dev/null 2>&1\n';

  const huskyDir = path.join(cwd, '.husky');
  if (fs.existsSync(huskyDir)) {
    const postCommitPath = path.join(huskyDir, 'post-commit');
    if (!fs.existsSync(postCommitPath)) {
      fs.writeFileSync(postCommitPath, `#!/bin/sh\n${hookCmd}`, { mode: 0o755 });
    } else {
      const content = fs.readFileSync(postCommitPath, 'utf8');
      if (!content.includes('lore index')) {
        fs.appendFileSync(postCommitPath, `\n# Auto-index lore memory\n${hookCmd}`);
      }
    }
    console.log(pc.green('✔') + ' ' + pc.bold('Installed Git hook via Husky:') + ` ${pc.cyan('.husky/post-commit')}`);
    return;
  }

  // Standard .git/hooks
  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookFile = path.join(hooksDir, 'post-commit');
  const scriptContent = `#!/bin/sh\n# Lore automatic memory indexing (runs in background, only if lore is installed)\n${hookCmd.trim()} &\n`;

  fs.writeFileSync(hookFile, scriptContent, { mode: 0o755 });
  console.log(pc.green('✔') + ' ' + pc.bold('Installed Git hook:') + ` ${pc.cyan('.git/hooks/post-commit')}`);
  console.log(pc.dim('  Lore will automatically re-index documentation in the background after each commit.'));
}
