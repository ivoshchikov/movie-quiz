import { test, expect } from '@playwright/test';

test('Start screen loads, select options, Play unlocks', async ({ page }) => {
  // Открываем главную
  await page.goto('/');

  // Ждём заголовок группы категорий (англ. надпись)
  await expect(page.getByText(/Select category/i)).toBeVisible();

  // Радиогруппа категорий → кликаем первый radio
  const catGroup = page.getByRole('radiogroup', { name: /Select category/i });
  await expect(catGroup).toBeVisible();
  const firstCat = catGroup.getByRole('radio').first();
  await expect(firstCat).toBeVisible();
  await firstCat.click();

  // Радиогруппа уровней → кликаем первый radio
  const levelGroup = page.getByRole('radiogroup', { name: /Select level/i });
  await expect(levelGroup).toBeVisible();
  const firstLevel = levelGroup.getByRole('radio').first();
  await expect(firstLevel).toBeVisible();
  await firstLevel.click();

  // Кнопка Play должна стать доступной
  const playBtn = page.getByRole('button', { name: /^Play$/i });
  await expect(playBtn).toBeEnabled({ timeout: 10000 });
  await playBtn.click();

  // Переход на /play
  await expect(page).toHaveURL(/\/play$/);
});
