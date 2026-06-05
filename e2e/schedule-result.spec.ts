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

    // Check tabs
    await expect(page.getByTestId('view-tab-group')).toBeVisible();
    await page.getByTestId('view-tab-teacher').click();
    await page.getByTestId('view-tab-room').click();
    await page.getByTestId('view-tab-group').click();

    // Publish
    await expect(page.getByTestId('publish-button')).toBeVisible();
    await page.getByTestId('publish-button').click();

    // Esperar y aceptar el p-confirmDialog de confirmación de publicación
    const confirmDialog = page.getByRole('alertdialog', { name: 'Confirmar publicación' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Publicar' }).click();

    // Verify status badge updated
    await expect(page.getByTestId('status-badge')).toContainText('Publicado');
  });
});
