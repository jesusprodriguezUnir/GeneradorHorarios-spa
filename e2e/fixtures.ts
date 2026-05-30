import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId(`user-option-${email}`).click();
  await page.waitForURL(/\/(dashboard|horario)/);
}
