// frontend/tests/start-screen.spec.ts
import { test, expect } from '@playwright/test';

test('Start screen loads, selects work and Play unlocks', async ({ page }) => {
  await page.goto('/');

  /* ---------- категории ---------- */
  const catSelect = page.getByRole('combobox', { name: /категорию/i });
  await expect(catSelect).toBeVisible();

  // ждём, пока подгрузятся реальные категории (минимум 2 option)
  await expect
    .poll(async () => await catSelect.locator('option').count())
    .toBeGreaterThan(1);

  /* ---------- сложности ---------- */
  const diffSelect = page.getByRole('combobox', { name: /сложность/i });
  await expect
    .poll(async () => await diffSelect.locator('option').count())
    .toBeGreaterThan(1);

  /* ---------- кнопка Играть ---------- */
  const playBtn = page.getByRole('button', { name: /играть/i });
  await expect(playBtn).toBeDisabled();

  // выбираем первые доступные значения
  await catSelect.selectOption({ index: 1 });
  await diffSelect.selectOption({ index: 1 });

  await expect(playBtn).toBeEnabled();

  // кликаем и проверяем переход на /play
  await playBtn.click();
  await expect(page).toHaveURL(/\/play/);
});
