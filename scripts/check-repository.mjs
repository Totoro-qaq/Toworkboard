import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules']);
const ignoredFiles = new Set(['main.js', 'package-lock.json']);
const textExtensions = new Set(['', '.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.ts', '.yml', '.yaml']);
const allowedEmails = new Set(['you@gmail.com', 'you@qq.com']);
const forbiddenPathNames = [/^data.*\.json$/i, /^\.env(?:\..+)?$/i];
const forbiddenContent = [
  { label: 'GitHub token', pattern: /\b(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}\b/g },
  { label: 'Google OAuth client ID', pattern: /\b\d{6,}-[A-Za-z0-9_-]{20,}\.apps\.googleusercontent\.com\b/g },
  { label: 'known private mailbox identifier', pattern: new RegExp(`\\b(?:msy${'6268' + '36554'}|${'6268' + '36554'})\\b`, 'gi') },
  { label: 'legacy copyrighted asset path', pattern: /assets\/totoro\.(?:jpe?g|png|webp)/gi },
  { label: 'legacy author attribution', pattern: /["']author["']\s*:\s*["']Jason["']/g },
];

const files = [];
async function walk(directory) {
  for (const name of await readdir(directory)) {
    if (ignoredDirectories.has(name)) continue;
    const path = resolve(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) {
      await walk(path);
    } else if (!ignoredFiles.has(name) && textExtensions.has(extname(name).toLowerCase())) {
      files.push(path);
    }
  }
}

await walk(root);
const failures = [];

for (const path of files) {
  const projectPath = relative(root, path);
  if (forbiddenPathNames.some((pattern) => pattern.test(projectPath.split('/').at(-1)))) {
    failures.push(`${projectPath}: forbidden private-data filename`);
    continue;
  }

  const content = await readFile(path, 'utf8');
  for (const rule of forbiddenContent) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) failures.push(`${projectPath}: ${rule.label}`);
  }

  const addresses = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const address of addresses) {
    if (!allowedEmails.has(address.toLowerCase())) {
      failures.push(`${projectPath}: unexpected email address ${address}`);
    }
  }
}

if (failures.length) {
  console.error(`Repository privacy check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(`Repository privacy check passed (${files.length} text files scanned).`);
