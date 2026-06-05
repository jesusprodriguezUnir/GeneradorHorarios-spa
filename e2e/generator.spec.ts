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

    // Step 4: Generate — objetivos + motor en vivo + candidatas
    await expect(page.getByTestId('generate-button')).toBeVisible();

    // Iniciar la espera del request de backend en paralelo al click
    const generatePromise = page.waitForResponse(response =>
      response.url().includes('/api/schedules/generate') && response.ok()
    );

    await page.getByTestId('generate-button').click();

    // El motor en vivo se anima mientras el backend genera en paralelo
    await expect(page.getByTestId('live-engine')).toBeVisible();

    // Esperar a que el backend termine de generar
    await generatePromise;

    // Aparecen las soluciones candidatas (hasta 60s incluyendo la animación)
    await expect(page.getByTestId('candidate-card').first()).toBeVisible({ timeout: 60000 });

    // Elegir una candidata → abre el horario real
    await page.getByTestId('choose-candidate').first().click();
    await page.waitForURL(/\/horarios\/.+/);
    await expect(page.getByTestId('page-title')).toBeVisible();
  });
});
