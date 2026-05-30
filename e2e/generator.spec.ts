import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures';

const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';

test.describe('Generator', () => {
  test('Full generation flow', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);

    await page.goto('/generador');
    await expect(page.getByTestId('wizard-next')).toBeVisible();

    // Step 1: Config
    await expect(page.getByTestId('school-schedule-type')).toBeVisible();
    await page.getByTestId('wizard-next').click();

    // Step 2: Assignments
    await page.getByTestId('wizard-next').click();

    // Step 3: Constraints
    await page.getByTestId('wizard-next').click();

    // Step 4: Generate
    await expect(page.getByTestId('generate-button')).toBeVisible();
    await page.getByTestId('generate-button').click();

    // Wait for progress overlay
    await expect(page.getByTestId('progress-overlay')).toBeVisible();

    // Wait for result (up to 60s)
    await expect(page.getByTestId('result-box')).toBeVisible({ timeout: 60000 });

    // View schedule
    await page.getByTestId('view-schedule-button').click();
    await page.waitForURL(/\/horarios\/.+/);
    await expect(page.getByTestId('page-title')).toBeVisible();
  });
});
