import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('manifest exposes the confirmed public identity', async () => {
  const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.id, 'toworkboard');
  assert.equal(manifest.name, 'Toworkboard');
  assert.equal(manifest.author, 'Totoro');
  assert.equal(manifest.isDesktopOnly, true);
});

test('legacy credential identifiers remain migratable after the product rename', async () => {
  const source = await readFile(resolve(root, 'src/main.ts'), 'utf8');
  assert.match(source, /LEGACY_KEYCHAIN_SERVICE = "Obsidian Forest Agent Dashboard"/);
  assert.match(source, /getLegacySecretStorageId/);
});

test('documentation provides bilingual product, install, and usage guides', async () => {
  const english = await readFile(resolve(root, 'README.md'), 'utf8');
  const chinese = await readFile(resolve(root, 'README.zh-CN.md'), 'utf8');
  assert.match(english, /## Install/);
  assert.match(english, /## Use it/);
  assert.match(english, /README\.zh-CN\.md/);
  assert.match(chinese, /## 安装/);
  assert.match(chinese, /## 如何使用/);
  assert.match(chinese, /README\.md/);
  assert.doesNotMatch(english, /Forest Agent Dashboard/);
  assert.doesNotMatch(chinese, /Forest Agent Dashboard/);
});

test('the documentation demo sequences actual usage and installation scenes', async () => {
  const demo = await readFile(resolve(root, 'demo/script.js'), 'utf8');
  assert.match(demo, /gsap\.timeline/);
  assert.match(demo, /addLabel\('overview'/);
  assert.match(demo, /addLabel\('search'/);
  assert.match(demo, /addLabel\('integrations'/);
  assert.match(demo, /addLabel\('install'/);
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
