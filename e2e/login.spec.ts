import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';
const TEACHER_EMAIL = 'laura.fernandez@ceip-miguel-hernandez.es';

test.describe('Login', () => {
  test('Admin can login and see dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await page.getByTestId(`user-option-${ADMIN_EMAIL}`).click();
    await page.waitForURL('/dashboard');
    await expect(page.getByTestId('nav-desktop-dashboard')).toBeVisible();
    const email = await page.evaluate(() => localStorage.getItem('lectivo_email'));
    expect(email).toBe(ADMIN_EMAIL);
  });

  test('Teacher can login and see schedule', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId(`user-option-${TEACHER_EMAIL}`).click();
    await page.waitForURL('/horario');
    const email = await page.evaluate(() => localStorage.getItem('lectivo_email'));
    expect(email).toBe(TEACHER_EMAIL);
  });

  test('Logout returns to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId(`user-option-${ADMIN_EMAIL}`).click();
    await page.waitForURL('/dashboard');
    await page.getByTestId('logout-button').click();
    await page.waitForURL('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
  });
});
