import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures';

const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';

test.describe('Schedule result', () => {
  test('Switch tabs and publish schedule', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);

    // Generate a schedule first
    await page.goto('/generador');
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('wizard-next').click();
    }
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('result-box')).toBeVisible({ timeout: 60000 });
    await page.getByTestId('view-schedule-button').click();
    await page.waitForURL(/\/horarios\/.+/);

    // Check tabs
    await expect(page.getByTestId('view-tab-group')).toBeVisible();
    await page.getByTestId('view-tab-teacher').click();
    await page.getByTestId('view-tab-room').click();
    await page.getByTestId('view-tab-group').click();

    // Publish
    await expect(page.getByTestId('publish-button')).toBeVisible();
    await page.getByTestId('publish-button').click();

    // Verify status badge updated
    await expect(page.getByTestId('status-badge')).toContainText('Publicado');
  });
});
