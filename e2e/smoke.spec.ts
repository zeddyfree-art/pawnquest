import { expect, test, type Page } from '@playwright/test';

/** Click from one square to another on a board seen from `side`. */
async function move(page: Page, from: string, to: string, side: 'white' | 'black' = 'white') {
  const box = (await page.locator('.board-wrap cg-board').boundingBox())!;
  const size = box.width / 8;
  const at = (s: string) => {
    const f = s.charCodeAt(0) - 97;
    const r = Number(s[1]) - 1;
    return side === 'white' ? { x: box.x + (f + 0.5) * size, y: box.y + (7 - r + 0.5) * size } : { x: box.x + (7 - f + 0.5) * size, y: box.y + (r + 0.5) * size };
  };
  await page.mouse.click(at(from).x, at(from).y);
  await page.mouse.click(at(to).x, at(to).y);
}

/** A fresh save starts with making a hero. */
async function start(page: Page) {
  await page.goto('/');
  await page.getByLabel('Name').fill('Tester');
  await page.getByRole('radio', { name: /Ranger/ }).click();
  await page.getByRole('button', { name: 'Begin your quest' }).click();
  await expect(page.locator('.map')).toBeVisible();
}

test('play a game against the auto-matched opponent, resign, and keep the rating after a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByText('WIN')).toBeVisible();
  await page.getByRole('button', { name: 'Fight!' }).click();
  const hint = page.locator('.turn-hint');
  await expect(hint).toHaveText('Your move', { timeout: 90_000 });
  await move(page, 'e2', 'e4');
  await expect(hint).not.toHaveText('Your move');
  await expect(hint).toHaveText('Your move');
  await page.getByRole('button', { name: 'Moves' }).click();
  await expect(page.locator('.move-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resign' }).click();
  await page.getByRole('button', { name: 'Yes, resign' }).click();
  await expect(page.getByRole('heading', { name: 'Defeat' })).toBeVisible();
  const before = (await page.locator('.hud-rating').innerText()).trim();
  expect(Number(before)).toBeLessThan(600);
  await page.reload();
  await expect(page.locator('.hud-rating')).toHaveText(before);
  expect(errors).toEqual([]);
});

test('a stronger opponent (79M model) plays its book as White', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Rivals' }).click();
  await page.getByRole('button', { name: /Sir Cedric/ }).click();
  await page.getByRole('radio', { name: 'Black' }).click();
  await page.getByRole('button', { name: 'Fight!' }).click();
  await expect(page.locator('.turn-hint')).toHaveText('Your move', { timeout: 90_000 });
  await page.getByRole('button', { name: 'Moves' }).click();
  await expect(page.locator('.move-list li').first()).toHaveText(/^e4/);
});

test('after a game, the review explains the key moments and "Try again" starts from one', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('button', { name: 'Fight!' }).click();
  const hint = page.locator('.turn-hint');
  await expect(hint).toHaveText('Your move', { timeout: 90_000 });
  // 1.f3 and 2.g4 are bad moves: the review has something to say.
  await move(page, 'f2', 'f3');
  await expect(hint).toHaveText('Your move');
  await move(page, 'g2', 'g4');
  // The bot may mate at once (2…Qh4#): wait for whichever comes, our turn or the result.
  await page.waitForFunction(() => !!document.querySelector('.result') || document.querySelector('.turn-hint')?.textContent === 'Your move', null, { timeout: 30_000 });
  if (!(await page.locator('.result').count())) {
    await page.getByRole('button', { name: 'Resign' }).click();
    await page.getByRole('button', { name: 'Yes, resign' }).click();
  }
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.locator('.review-top')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('.moment').first()).toContainText('Better was');
  await page.locator('.moment').first().getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.turn-hint')).toHaveText('Your move', { timeout: 60_000 });
});

test('a tap still lands on the right square after the layout above the board moves', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Rivals' }).click();
  await page.getByRole('button', { name: /Straw Sam/ }).click();
  await page.getByRole('radio', { name: 'White' }).click();
  await page.getByRole('button', { name: 'Fight!' }).click();
  await expect(page.locator('.turn-hint')).toHaveText('Your move', { timeout: 90_000 });
  // Measure the board once (a click), then push it down without any scroll or resize event.
  await page.locator('.board-wrap cg-board').click({ position: { x: 5, y: 5 } });
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '37px';
    document.querySelector('.battle')!.prepend(spacer);
  });
  await move(page, 'e2', 'e4');
  await page.getByRole('button', { name: 'Moves' }).click();
  await expect(page.locator('.move-list li').first()).toHaveText(/^e4/);
});
