import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const appearance = { theme: 'system', readingStyle: 'omarchy', tint: null, fontSize: 17 };
async function preview(page: import('@playwright/test').Page) {
  await page.addInitScript(value => {
    const host = window as any;
    host.previewHost = { appearance: value, calls: [], fail: false };
    host.chrome = { webview: { postMessage(raw: string) {
      const message = JSON.parse(raw); host.previewHost.calls.push(message);
      setTimeout(() => {
        if (message.action === 'save' && host.previewHost.fail) { host.slaydownReply(message.id, null, 'Settings folder is read only'); return; }
        if (message.action === 'save') host.previewHost.appearance = message.value;
        host.slaydownReply(message.id, message.action === 'load' ? host.previewHost.appearance : null);
      }, 5);
    } } };
  }, appearance);
  const payload = JSON.stringify({ appearance, document: { name: 'Unicode Ω notes.md', path: '/notes.md', content: '# Header\n\n**Readable** markdown.\n\n<script>window.compromised=true</script>\n\n[Unsafe](file:///etc/passwd)\n\n![Private](https://example.com/track.png)' } }).replaceAll('<', '\\u003c');
  const html = readFileSync('dist-preview/preview.html', 'utf8').replace('__SLAYDOWN_PAYLOAD__', () => payload);
  await page.route('**/preview-fixture', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('/preview-fixture');
}

test('preview uses offline Omarchy headings, persists styles and tint, and receives shared changes', async ({ page }) => {
  await preview(page);
  await expect(page.locator('html')).toHaveAttribute('data-reading-style', 'omarchy');
  await expect(page.locator('#reader h1')).toHaveText('Header');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('#reader h1').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Omarchy');
  expect(await page.evaluate(() => document.fonts.check('20px Omarchy'))).toBe(true);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByLabel('Reading style').selectOption('github');
  await page.getByLabel('Custom tint color').fill('#bd8844');
  await page.getByLabel('Reading size', { exact: true }).fill('20');
  await page.getByLabel('Reading size', { exact: true }).press('Tab');
  await expect.poll(() => page.evaluate(() => (window as any).previewHost.appearance)).toEqual({ ...appearance, readingStyle: 'github', tint: '#bd8844', fontSize: 20 });
  await page.evaluate(() => { (window as any).previewHost.appearance = { theme: 'dark', readingStyle: 'code', tint: '#9365b8', fontSize: 19 }; });
  await expect(page.locator('html')).toHaveAttribute('data-reading-style', 'code');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByLabel('Reading size', { exact: true })).toHaveValue('19');
  await expect(page.locator('#reader strong')).toHaveText('Readable');
});

test('preview keeps unsafe Markdown inert, reports save errors, and returns close/open actions to host', async ({ page }) => {
  await preview(page);
  expect(await page.evaluate(() => (window as any).compromised)).toBeUndefined();
  await expect(page.locator('#reader script, #reader img, #reader a[href^="file:"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open in SlayDown' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).previewHost.calls.some((c: any) => c.action === 'open'))).toBe(true);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.evaluate(() => { (window as any).previewHost.fail = true; });
  await page.getByLabel('Reading style').selectOption('writer');
  await expect(page.getByRole('status')).toContainText('Settings folder is read only');
  await page.keyboard.press('Escape');
  await expect(page.locator('#preview-settings')).toBeHidden();
  await page.locator('#reader h1').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => (window as any).previewHost.calls.some((c: any) => c.action === 'close'))).toBe(true);
});
