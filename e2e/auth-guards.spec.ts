import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';
const TEACHER_EMAIL = 'laura.fernandez@ceip-miguel-hernandez.es';

test.describe('Auth guards', () => {
  test('Teacher redirected from /dashboard to /horario', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId(`user-option-${TEACHER_EMAIL}`).click();
    await page.waitForURL('/horario');

    await page.goto('/dashboard');
    await page.waitForURL('/horario');
  });

  test('Teacher redirected from /generador to /horario', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId(`user-option-${TEACHER_EMAIL}`).click();
    await page.waitForURL('/horario');

    await page.goto('/generador');
    await page.waitForURL('/horario');
  });

  test('Unauthenticated user redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
  });
});
