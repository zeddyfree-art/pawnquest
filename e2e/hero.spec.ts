import { expect, test } from '@playwright/test';

test('both hero choices share all starter classes and keep their look after editing and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Name', { exact: true }).fill('Ada');
  const male = page.getByRole('radio', { name: 'Male', exact: true });
  const female = page.getByRole('radio', { name: 'Female', exact: true });
  const preview = page.locator('.create-preview img').first();
  await expect(male).toHaveAttribute('aria-checked', 'true');
  // Wait for the painted art, rather than capturing the code fallback while assets load.
  await expect.poll(async () => preview.getAttribute('class')).toContain('art');
  const before = await preview.getAttribute('src');
  await female.click();
  await expect(female).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => preview.getAttribute('src')).not.toBe(before);
  for (const name of ['Squire', 'Apprentice', 'Ranger', 'Bard']) {
    await page.getByRole('radio', { name: new RegExp(name) }).click();
    await expect(female).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => preview.getAttribute('class')).toContain('art');
  }
  await page.getByRole('radio', { name: 'Long', exact: true }).click();
  await page.getByRole('radio', { name: 'Skin 6', exact: true }).click();
  await page.getByRole('radio', { name: 'Eye colour 2', exact: true }).click();
  await page.getByRole('button', { name: 'Begin your quest' }).click();
  await page.getByRole('button', { name: 'Hero', exact: true }).click();
  await page.getByRole('button', { name: 'Change look' }).click();
  await expect(female).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Long', exact: true })).toHaveAttribute('aria-checked', 'true');
  await male.click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Hero', exact: true }).click();
  await page.getByRole('button', { name: 'Change look' }).click();
  await expect(male).toHaveAttribute('aria-checked', 'true');
  for (const name of ['Long', 'Skin 6', 'Eye colour 2']) {
    await expect(page.getByRole('radio', { name, exact: true })).toHaveAttribute('aria-checked', 'true');
  }
  await expect(page.getByRole('radio', { name: /Bard/ })).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});
