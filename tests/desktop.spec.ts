import { test, expect, type Page } from '@playwright/test';

const longDocument = '# Reading notes\n\n' + Array.from({ length: 35 }, (_, i) => `## Section ${i + 1}\n\nParagraph ${i + 1}. Words to read, with a clear place to return to after a save.\n\n`).join('');

async function mockDesktop(page: Page, linux = false) {
  await page.addInitScript(({ content, linux }) => {
    const host = window as any;
    const callbacks = new Map<number, Function>();
    const listeners = new Map<string, number[]>();
    let callbackID = 0;
    host.testHost = {
      doc: { name: 'notes.md', path: '/documents/notes.md', content },
      editor: null,
      appearance: null,
      linux: linux ? { defaultReader: false, previewEnabled: true, previewReady: false, message: "Space-bar preview needs Sushi.", installCommand: "sudo pacman -S --needed sushi" } : null,
      cancelPicker: false,
      reloadFailures: 0,
      reloadDelay: 0,
      imageDelay: 0,
      calls: [],
      emit(event: string, payload: unknown) {
        for (const id of listeners.get(event) || []) callbacks.get(id)?.({ event, payload, id });
      },
    };
    host.__TAURI_INTERNALS__ = {
      metadata: { currentWebview: { label: 'main' }, currentWindow: { label: 'main' } },
      transformCallback(callback: Function) { callbacks.set(++callbackID, callback); return callbackID; },
      async invoke(command: string, args: any = {}) {
        host.testHost.calls.push({ command, args });
        if (command === 'plugin:event|listen') {
          listeners.set(args.event, [...(listeners.get(args.event) || []), args.handler]);
          return args.handler;
        }
        if (command === 'setup_linux_integration') {
          if (!host.testHost.linux) return null;
          if (args.makeDefault) host.testHost.linux.defaultReader = true;
          if (args.previewEnabled !== null) host.testHost.linux.previewEnabled = args.previewEnabled;
          return { ...host.testHost.linux };
        }
        if (command === 'get_appearance') {
          if (!host.testHost.appearance) host.testHost.appearance = args.legacy || { theme: 'system', readingStyle: 'omarchy', tint: null, fontSize: 17 };
          return { ...host.testHost.appearance };
        }
        if (command === 'set_appearance') { host.testHost.appearance = { ...args.settings }; return null; }
        if (command === 'get_initial_document') return { ...host.testHost.doc };
        if (command === 'get_editor') return host.testHost.editor;
        if (command === 'choose_editor') {
          if (host.testHost.cancelPicker) return null;
          host.testHost.editor = { name: 'Test Editor', path: '/Applications/Test Editor.app' };
          return host.testHost.editor;
        }
        if (command === 'open_in_editor') return host.testHost.editor;
        if (command === 'watch_document') return null;
        if (command === 'reload_document') {
          const snapshot = { ...host.testHost.doc };
          if (host.testHost.reloadDelay) await new Promise(resolve => setTimeout(resolve, host.testHost.reloadDelay));
          if (host.testHost.reloadFailures > 0) { host.testHost.reloadFailures--; throw new Error('File temporarily unavailable'); }
          return snapshot;
        }
        if (command === 'read_image') {
          await new Promise(resolve => setTimeout(resolve, host.testHost.imageDelay));
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6SAAAAABJRU5ErkJggg==';
        }
        return null;
      },
    };
  }, { content: longDocument, linux });
  await page.goto('/');
  await expect(page.locator('#filename')).toHaveText('notes.md');
  await expect(page.getByRole('button', { name: 'Open in Editor', exact: true })).toBeEnabled();
}

test('editor picker persists in host and opens the exact current file; cancel does not launch', async ({ page }) => {
  await mockDesktop(page);
  await page.evaluate(() => { (window as any).testHost.cancelPicker = true; });
  await page.getByRole('button', { name: 'Open in Editor', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'choose_editor').length)).toBe(1);
  await expect(page.getByRole('button', { name: 'Open in Editor', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'open_in_editor'))).toHaveLength(0);
  await page.evaluate(() => { (window as any).testHost.cancelPicker = false; });
  await page.getByRole('button', { name: 'Open in Editor', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'open_in_editor'))).toEqual([{ command: 'open_in_editor', args: { path: '/documents/notes.md' } }]);
  await page.getByRole('button', { name: 'Open in Editor', exact: true }).click();
  expect(await page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'choose_editor'))).toHaveLength(2);
  await page.getByRole('button', { name: 'Appearance settings' }).click();
  await expect(page.locator('#editor-name')).toHaveText('Test Editor');
});

test('saved changes refresh without moving the paragraph being read, including temporary missing file', async ({ page }) => {
  await mockDesktop(page);
  await page.locator('#folio-section-18').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const before = await page.locator('#folio-section-18').evaluate(element => element.getBoundingClientRect().top);
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.reloadFailures = 1;
    host.doc.content = host.doc.content.replace('# Reading notes', '# Reading notes\n\n' + 'New introduction. '.repeat(120));
    host.emit('document-changed', host.doc.path);
  });
  await expect(page.locator('#reader')).toContainText('New introduction.');
  const after = await page.locator('#folio-section-18').evaluate(element => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThan(3);
  await expect(page.locator('#file-status')).toHaveText('Live preview');
});

test('a slow refresh never replaces a newly selected document', async ({ page }) => {
  await mockDesktop(page);
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.reloadDelay = 500;
    host.doc.content = '# Stale result';
    host.emit('document-changed', host.doc.path);
  });
  await expect.poll(() => page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'reload_document').length)).toBeGreaterThan(1);
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.doc = { name: 'next.md', path: '/documents/next.md', content: '# Next document' };
    host.reloadDelay = 0;
    host.emit('document-opened', host.doc);
  });
  // Wait for the controlled old response, not for an arbitrary production delay.
  await page.waitForTimeout(650);
  await expect(page.locator('#reader h1')).toHaveText('Next document');
  await expect(page.locator('#filename')).toHaveText('next.md');
  await expect(page.locator('#file-status')).toHaveText('Live preview');
});

test('closing clears the reader, stops watching, and ignores late refreshes until another open', async ({ page }) => {
  await mockDesktop(page);
  await page.getByRole('button', { name: 'Find in document', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search document' }).fill('Paragraph');
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.reloadDelay = 500;
    host.doc.content = '# Late result';
    host.emit('document-changed', host.doc.path);
  });
  await expect.poll(() => page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'reload_document').length)).toBeGreaterThan(1);
  // Native File > Close Document / Cmd+W / Ctrl+W all send this event.
  await page.evaluate(() => (window as any).testHost.emit('document-close-requested', null));
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'watch_document').at(-1)?.args.path)).toBeNull();
  expect(await page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'close_document'))).toEqual([{ command: 'close_document', args: { path: '/documents/notes.md' } }]);
  const reloads = await page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'reload_document').length);
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.emit('document-changed', host.doc.path);
    host.emit('document-watch-error', { path: host.doc.path, message: 'Old watcher error' });
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(650);
  await expect(page.locator('#reader')).toBeEmpty();
  await expect(page.locator('#source-content')).toBeEmpty();
  await expect(page.locator('#searchbar')).toBeHidden();
  await expect(page.locator('#file-status')).toHaveText('Ready to read');
  for (const name of ['Open in Editor', 'Source', 'Find in document', 'Close document']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  }
  expect(await page.evaluate(() => (window as any).testHost.calls.filter((call: any) => call.command === 'reload_document').length)).toBe(reloads);
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.reloadDelay = 0;
    host.doc.content = '# Opened again';
    host.emit('document-opened', host.doc);
  });
  await expect(page.locator('#empty-state')).toBeHidden();
  await expect(page.locator('#reader h1')).toHaveText('Opened again');
  await expect(page.locator('#search-input')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Open in Editor', exact: true })).toBeEnabled();
});

test('manual reload keeps source mode and reading position', async ({ page }) => {
  await mockDesktop(page);
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await page.locator('#reading-scroll').evaluate(element => element.scrollTo({ top: 900, behavior: 'instant' }));
  await page.evaluate(() => { (window as any).testHost.doc.content += '\nSaved at the end.'; });
  await page.getByRole('button', { name: 'Reload from disk' }).click();
  await expect(page.locator('#source-content')).toContainText('Saved at the end.');
  await expect(page.locator('#source-content')).toBeVisible();
  expect(await page.locator('#reading-scroll').evaluate(element => element.scrollTop)).toBeGreaterThan(800);
});


test('late images do not undo an explicit outline navigation after refresh', async ({ page }) => {
  await mockDesktop(page);
  await page.locator('#folio-section-10').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.evaluate(() => {
    const host = (window as any).testHost;
    host.imageDelay = 650;
    host.doc.content = host.doc.content.replace('# Reading notes', '# Reading notes\n\n![A local image](image.png)');
    host.emit('document-changed', host.doc.path);
  });
  await expect(page.locator('[data-image-path]')).toHaveCount(1);
  await page.locator('#outline [data-heading="folio-section-25"]').click();
  await expect(page.locator('#reader img')).toHaveCount(1);
  await expect.poll(() => page.locator('#folio-section-25').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(200);
  expect(await page.locator('#folio-section-10').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(-500);
});


test('native appearance migrates an existing choice and synchronizes preview changes without a reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('folio:settings', JSON.stringify({ theme: 'dark', readingStyle: 'writer', tint: '#b96683', fontSize: 21 })));
  await mockDesktop(page);
  await expect(page.locator('html')).toHaveAttribute('data-reading-style', 'writer');
  expect(await page.evaluate(() => (window as any).testHost.appearance)).toEqual({ theme: 'dark', readingStyle: 'writer', tint: '#b96683', fontSize: 21 });
  await page.evaluate(() => {
    (window as any).testHost.appearance = { theme: 'light', readingStyle: 'github', tint: '#5776c8', fontSize: 19 };
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-reading-style', 'github');
  await page.getByRole('button', { name: 'Appearance settings' }).click();
  await expect(page.locator('#font-size')).toHaveText('19');
  await page.locator('[data-reading-style-option="code"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).testHost.appearance.readingStyle)).toBe('code');
  await expect(page.locator('#filename')).toHaveText('notes.md');
});


test('Linux setup runs on launch, explains missing Sushi, and respects explicit controls', async ({ page }) => {
  await mockDesktop(page, true);
  await expect.poll(() => page.evaluate(() => (window as any).testHost.calls.filter((c: any) => c.command === 'setup_linux_integration').length)).toBe(1);
  expect(await page.evaluate(() => (window as any).testHost.calls.find((c: any) => c.command === 'setup_linux_integration').args)).toEqual({ makeDefault: false, previewEnabled: null });
  await page.getByRole('button', { name: 'Appearance settings' }).click();
  await expect(page.locator('#linux-status')).toContainText('needs Sushi');
  await expect(page.locator('#linux-install-command')).toContainText('pacman');
  await page.getByRole('button', { name: 'Use SlayDown for Markdown' }).click();
  await expect(page.locator('#linux-default')).toBeHidden();
  await page.getByLabel('Space-bar preview in Files', { exact: true }).uncheck();
  await expect.poll(() => page.evaluate(() => (window as any).testHost.linux.previewEnabled)).toBe(false);
  await page.evaluate(() => Object.assign((window as any).testHost.linux, { previewReady: true, previewEnabled: true, message: 'Space-bar preview is ready.', installCommand: null }));
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.locator('#linux-status')).toContainText('is ready');
  await expect(page.locator('#linux-install-command')).toBeHidden();
});
