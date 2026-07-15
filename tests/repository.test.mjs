import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('manifest exposes the confirmed public identity', async () => {
  const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.id, 'forest-agent-dashboard');
  assert.equal(manifest.name, 'Forest Agent Dashboard');
  assert.equal(manifest.author, 'Totoro');
  assert.equal(manifest.isDesktopOnly, true);
});

test('public source uses secure GitHub credential storage', async () => {
  const source = await readFile(resolve(root, 'src/main.ts'), 'utf8');
  assert.match(source, /storeCredential\("github-token"/);
  assert.match(source, /delete this\.settings\.githubToken/);
  assert.doesNotMatch(source, /github_pat_[A-Za-z0-9_]{20,}/);
});

test('mail panes have independent fixed-height scroll regions', async () => {
  const css = await readFile(resolve(root, 'styles.css'), 'utf8');
  assert.match(css, /--ad-mail-provider-height:\s*520px/);
  assert.match(css, /\.ad-mail-message-list[\s\S]*?overflow-y:\s*auto/);
});

test('loading motion is coordinated and reduced-motion aware', async () => {
  const source = await readFile(resolve(root, 'src/main.ts'), 'utf8');
  assert.match(source, /gsap\.matchMedia\(\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /stopAllLoadingMotion/);
});

test('Gmail unread count comes from the Inbox label instead of an estimate', async () => {
  const source = await readFile(resolve(root, 'src/main.ts'), 'utf8');
  assert.match(source, /gmailApiRequest\("\/labels\/INBOX"/);
  assert.match(source, /Number\(inboxLabel\.messagesUnread\)/);
  assert.doesNotMatch(source, /unreadCount:[^\n]*resultSizeEstimate/);
});
