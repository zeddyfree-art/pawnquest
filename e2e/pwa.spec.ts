import { chromium, expect, test, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Click from one square to another on a board seen from White's side. */
async function move(page: Page, from: string, to: string) {
  const box = (await page.locator('.board-wrap cg-board').boundingBox())!;
  const size = box.width / 8;
  const at = (s: string) => ({ x: box.x + (s.charCodeAt(0) - 97 + 0.5) * size, y: box.y + (8 - Number(s[1]) + 0.5) * size });
  await page.mouse.click(at(from).x, at(from).y);
  await page.mouse.click(at(to).x, at(to).y);
}

// Installing and starting offline. A persistent profile, because Chrome never offers to install in a private
// (incognito) window, which is what a normal test context is.
test('Pawnquest can be installed and starts without a network', async ({ baseURL }, info) => {
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pawnquest-pwa-')), {
    viewport: { width: 390, height: 844 },
    // The full browser in its new headless mode (the default headless shell never fires beforeinstallprompt).
    channel: 'chromium',
    executablePath: info.project.use.launchOptions?.executablePath,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(baseURL!);
  await page.getByLabel('Name').fill('Offline');
  await page.getByRole('button', { name: 'Begin your quest' }).click();
  await expect(page.locator('.map')).toBeVisible();

  // The service worker is running and has saved the app's files.
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(baseURL);
  const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i: { src: string }) => i.src)).toContain('icon-maskable-512.png');
  for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'icon.svg']) {
    expect((await page.request.get(icon)).status()).toBe(200);
  }

  // Chrome finds nothing missing for installing, and the Profile screen offers the button.
  const cdp = await context.newCDPSession(page);
  await expect.poll(async () => (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('button', { name: 'Install Pawnquest' })).toBeVisible();

  // One move online, so the opponent's brain (Maia) and its runtime are on this device.
  await page.getByRole('button', { name: 'Map' }).click();
  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('button', { name: 'Fight!' }).click();
  const hint = page.locator('.turn-hint');
  await expect(hint).toHaveText('Your move', { timeout: 90_000 });
  await move(page, 'e2', 'e4');
  await expect(hint).toHaveText('Your move');

  // Offline: the app starts, shows the saved progress, and the fight goes on.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.hud-rating')).toHaveText(/600/);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(hint).toHaveText('Your move', { timeout: 60_000 });
  // Odd moves, so the replies come from Maia rather than an opening book.
  for (const [from, to] of [['a2', 'a3'], ['h2', 'h3'], ['a3', 'a4']]) {
    await move(page, from, to);
    await expect(hint).not.toHaveText('Your move');
    await expect(hint).toHaveText('Your move', { timeout: 60_000 });
  }
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (k) => (await (await caches.open(k)).keys()).map((r) => r.url)))).flat());
  expect(cached.some((u) => u.endsWith('.wasm'))).toBe(true);
  expect(cached.some((u) => u.endsWith('.onnx') || u.endsWith('version.json'))).toBe(false);
  await context.close();
});
