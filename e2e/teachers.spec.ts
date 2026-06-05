import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures';

const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';

test.describe('Teachers Config', () => {
  test('CRUD flow for teachers within stage accordions', async ({ page }) => {
    // 1. Iniciar sesión como administrador
    await loginAs(page, ADMIN_EMAIL);

    // 2. Ir a Configuración y seleccionar la pestaña de Profesores
    await page.goto('/config');
    await page.getByTestId('config-tab-teachers').click();

    // 3. Verificar que la sección de profesores está visible
    await expect(page.getByTestId('config-teachers-section')).toBeVisible();

    // 4. Localizar el acordeón de Primaria dinámicamente (sin GUIDs hardcoded)
    const primariaAccordion = page.locator('.etapa-accordion').filter({ hasText: 'Educación Primaria' });
    const primariaHeader = primariaAccordion.locator('.etapa-header');

    // Debería estar expandido por defecto
    await expect(primariaAccordion.locator('p-table')).toBeVisible();

    // Colapsarlo
    await primariaHeader.click();
    await expect(primariaAccordion.locator('p-table')).not.toBeVisible();

    // Expandirlo de nuevo
    await primariaHeader.click();
    await expect(primariaAccordion.locator('p-table')).toBeVisible();

    // 5. Añadir un nuevo profesor
    await page.getByTestId('add-teacher-btn').click();

    const testSuffix = Date.now();
    const testName = `Juan Perez Test E2E ${testSuffix}`;
    const testEmail = `juan.perez.test.${testSuffix}@ceip-miguel-hernandez.es`;

    await page.getByTestId('teacher-name-input').fill(testName);
    await page.getByTestId('teacher-email-input').fill(testEmail);

    // Seleccionar etapa Primaria en las checkboxes por texto de etiqueta
    const stageCheckbox = page.locator('label').filter({ hasText: 'Educación Primaria' }).locator('input[type="checkbox"]');
    await stageCheckbox.click();

    // Guardar cambios
    await page.getByTestId('save-teacher-btn').click();

    // Esperar a que el modal de crear/editar profesor desaparezca completamente
    await expect(page.getByTestId('teacher-modal')).not.toBeVisible();
    await expect(page.locator('.p-overlay-mask')).not.toBeVisible();

    // 6. Verificar que el profesor aparece en el acordeón de Primaria
    await expect(primariaAccordion).toContainText(testName);

    // 7. Borrar el profesor de prueba
    const teacherRow = primariaAccordion.locator('tr').filter({ hasText: testName });
    await teacherRow.locator('.btn-del').click();

    // Esperar a que el p-confirmDialog de PrimeNG esté completamente visible y clicar su botón de aceptar
    const confirmDialog = page.getByRole('alertdialog', { name: 'Eliminar profesor' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Eliminar' }).click();

    // 8. Verificar que el profesor ya no aparece
    await expect(primariaAccordion).not.toContainText(testName);
  });
});
