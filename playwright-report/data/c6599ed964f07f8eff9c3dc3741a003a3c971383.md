# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teachers.spec.ts >> Teachers Config >> CRUD flow for teachers within stage accordions
- Location: e2e\teachers.spec.ts:7:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.etapa-accordion').filter({ hasText: 'Educación Primaria' })
Expected substring: "Juan Perez Test E2E 1780654222787"
Received string:    "Educación Primaria 6 – 12 años · 29 profesores Nombre Email Tipo H. máx/semana EspecialidadesH. asignadasAcciones MR  Marcos Ruiz marcos.ruiz@ceip-miguel-hernandez.esEspecialista / Interino25hEducación Física18/25 MI  Marta Iglesias marta.iglesias@ceip-miguel-hernandez.esEspecialista / Interino25hInglés (habilitación)0/25 PC  Patricia Castro patricia.castro@ceip-miguel-hernandez.esEspecialista / Interino25hEducación Física18/25 JP  Javier Pardo javier.pardo@ceip-miguel-hernandez.esEspecialista / Interino25hEducación Física18/25 MN  Manuel Navarro manuel.navarro@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 AG  Ana García ana.garcia@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 GJ  Guillermo Jiménez guillermo.jimenez@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 TP  Tomás Peña tomas.pena@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 LF  Laura Fernández laura.fernandez@ceip-miguel-hernandez.esEspecialista / Interino25hInglés (habilitación)24/25 DR  Diana Rodríguez diana.rodriguez@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/251–10 de 29 1  2  3 10"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('.etapa-accordion').filter({ hasText: 'Educación Primaria' })
    13 × locator resolved to <div _ngcontent-ng-c1031974646="" class="etapa-accordion etapa-accordion--open">…</div>
       - unexpected value "Educación Primaria 6 – 12 años · 29 profesores Nombre Email Tipo H. máx/semana EspecialidadesH. asignadasAcciones MR  Marcos Ruiz marcos.ruiz@ceip-miguel-hernandez.esEspecialista / Interino25hEducación Física18/25 MI  Marta Iglesias marta.iglesias@ceip-miguel-hernandez.esEspecialista / Interino25hInglés (habilitación)0/25 PC  Patricia Castro patricia.castro@ceip-miguel-hernandez.esEspecialista / Interino25hEducación Física18/25 JP  Javier Pardo javier.pardo@ceip-miguel-hernandez.esEspecialista / Interino25hEducación Física18/25 MN  Manuel Navarro manuel.navarro@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 AG  Ana García ana.garcia@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 GJ  Guillermo Jiménez guillermo.jimenez@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 TP  Tomás Peña tomas.pena@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/25 LF  Laura Fernández laura.fernandez@ceip-miguel-hernandez.esEspecialista / Interino25hInglés (habilitación)24/25 DR  Diana Rodríguez diana.rodriguez@ceip-miguel-hernandez.esDefinitivo / Generalista25hGeneralista15/251–10 de 29 1  2  3 10"

```

```yaml
- button "Educación Primaria 6 – 12 años · 29 profesores":
  - text: Educación Primaria 6 – 12 años · 29 profesores
  - img
- textbox "Buscar profesores de Educación Primaria…"
- table:
  - rowgroup:
    - row "Nombre Email Tipo H. máx/semana Especialidades H. asignadas Acciones":
      - columnheader "Nombre":
        - text: Nombre
        - img
      - columnheader "Email":
        - text: Email
        - img
      - columnheader "Tipo":
        - text: Tipo
        - img
      - columnheader "H. máx/semana":
        - text: H. máx/semana
        - img
      - columnheader "Especialidades"
      - columnheader "H. asignadas"
      - columnheader "Acciones"
  - rowgroup:
    - row "MR Marcos Ruiz marcos.ruiz@ceip-miguel-hernandez.es Especialista / Interino 25h Educación Física 18/25":
      - cell "MR Marcos Ruiz"
      - cell "marcos.ruiz@ceip-miguel-hernandez.es"
      - cell "Especialista / Interino"
      - cell "25h"
      - cell "Educación Física"
      - cell "18/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "MI Marta Iglesias marta.iglesias@ceip-miguel-hernandez.es Especialista / Interino 25h Inglés (habilitación) 0/25":
      - cell "MI Marta Iglesias"
      - cell "marta.iglesias@ceip-miguel-hernandez.es"
      - cell "Especialista / Interino"
      - cell "25h"
      - cell "Inglés (habilitación)"
      - cell "0/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "PC Patricia Castro patricia.castro@ceip-miguel-hernandez.es Especialista / Interino 25h Educación Física 18/25":
      - cell "PC Patricia Castro"
      - cell "patricia.castro@ceip-miguel-hernandez.es"
      - cell "Especialista / Interino"
      - cell "25h"
      - cell "Educación Física"
      - cell "18/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "JP Javier Pardo javier.pardo@ceip-miguel-hernandez.es Especialista / Interino 25h Educación Física 18/25":
      - cell "JP Javier Pardo"
      - cell "javier.pardo@ceip-miguel-hernandez.es"
      - cell "Especialista / Interino"
      - cell "25h"
      - cell "Educación Física"
      - cell "18/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "MN Manuel Navarro manuel.navarro@ceip-miguel-hernandez.es Definitivo / Generalista 25h Generalista 15/25":
      - cell "MN Manuel Navarro"
      - cell "manuel.navarro@ceip-miguel-hernandez.es"
      - cell "Definitivo / Generalista"
      - cell "25h"
      - cell "Generalista"
      - cell "15/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "AG Ana García ana.garcia@ceip-miguel-hernandez.es Definitivo / Generalista 25h Generalista 15/25":
      - cell "AG Ana García"
      - cell "ana.garcia@ceip-miguel-hernandez.es"
      - cell "Definitivo / Generalista"
      - cell "25h"
      - cell "Generalista"
      - cell "15/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "GJ Guillermo Jiménez guillermo.jimenez@ceip-miguel-hernandez.es Definitivo / Generalista 25h Generalista 15/25":
      - cell "GJ Guillermo Jiménez"
      - cell "guillermo.jimenez@ceip-miguel-hernandez.es"
      - cell "Definitivo / Generalista"
      - cell "25h"
      - cell "Generalista"
      - cell "15/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "TP Tomás Peña tomas.pena@ceip-miguel-hernandez.es Definitivo / Generalista 25h Generalista 15/25":
      - cell "TP Tomás Peña"
      - cell "tomas.pena@ceip-miguel-hernandez.es"
      - cell "Definitivo / Generalista"
      - cell "25h"
      - cell "Generalista"
      - cell "15/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "LF Laura Fernández laura.fernandez@ceip-miguel-hernandez.es Especialista / Interino 25h Inglés (habilitación) 24/25":
      - cell "LF Laura Fernández"
      - cell "laura.fernandez@ceip-miguel-hernandez.es"
      - cell "Especialista / Interino"
      - cell "25h"
      - cell "Inglés (habilitación)"
      - cell "24/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
    - row "DR Diana Rodríguez diana.rodriguez@ceip-miguel-hernandez.es Definitivo / Generalista 25h Generalista 15/25":
      - cell "DR Diana Rodríguez"
      - cell "diana.rodriguez@ceip-miguel-hernandez.es"
      - cell "Definitivo / Generalista"
      - cell "25h"
      - cell "Generalista"
      - cell "15/25"
      - cell:
        - button "Editar profesor":
          - img
        - button "Eliminar profesor":
          - img
- text: 1–10 de 29
- button "First Page":
  - img
- button "Previous Page" [disabled]:
  - img
- button "1"
- button "2"
- button "3"
- button "Next Page":
  - img
- button "Last Page":
  - img
- combobox "Rows per page": "10"
- button "dropdown trigger":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAs } from './fixtures';
  3  | 
  4  | const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';
  5  | 
  6  | test.describe('Teachers Config', () => {
  7  |   test('CRUD flow for teachers within stage accordions', async ({ page }) => {
  8  |     // 1. Iniciar sesión como administrador
  9  |     await loginAs(page, ADMIN_EMAIL);
  10 | 
  11 |     // 2. Ir a Configuración y seleccionar la pestaña de Profesores
  12 |     await page.goto('/config');
  13 |     await page.getByTestId('config-tab-teachers').click();
  14 | 
  15 |     // 3. Verificar que la sección de profesores está visible
  16 |     await expect(page.getByTestId('config-teachers-section')).toBeVisible();
  17 | 
  18 |     // 4. Localizar el acordeón de Primaria dinámicamente (sin GUIDs hardcoded)
  19 |     const primariaAccordion = page.locator('.etapa-accordion').filter({ hasText: 'Educación Primaria' });
  20 |     const primariaHeader = primariaAccordion.locator('.etapa-header');
  21 | 
  22 |     // Debería estar expandido por defecto
  23 |     await expect(primariaAccordion.locator('p-table')).toBeVisible();
  24 | 
  25 |     // Colapsarlo
  26 |     await primariaHeader.click();
  27 |     await expect(primariaAccordion.locator('p-table')).not.toBeVisible();
  28 | 
  29 |     // Expandirlo de nuevo
  30 |     await primariaHeader.click();
  31 |     await expect(primariaAccordion.locator('p-table')).toBeVisible();
  32 | 
  33 |     // 5. Añadir un nuevo profesor
  34 |     await page.getByTestId('add-teacher-btn').click();
  35 | 
  36 |     const testSuffix = Date.now();
  37 |     const testName = `Juan Perez Test E2E ${testSuffix}`;
  38 |     const testEmail = `juan.perez.test.${testSuffix}@ceip-miguel-hernandez.es`;
  39 | 
  40 |     await page.getByTestId('teacher-name-input').fill(testName);
  41 |     await page.getByTestId('teacher-email-input').fill(testEmail);
  42 | 
  43 |     // Seleccionar etapa Primaria en las checkboxes por texto de etiqueta
  44 |     const stageCheckbox = page.locator('label').filter({ hasText: 'Educación Primaria' }).locator('input[type="checkbox"]');
  45 |     await stageCheckbox.click();
  46 | 
  47 |     // Guardar cambios
  48 |     await page.getByTestId('save-teacher-btn').click();
  49 | 
  50 |     // Esperar a que el modal de crear/editar profesor desaparezca completamente
  51 |     await expect(page.getByTestId('teacher-modal')).not.toBeVisible();
  52 |     await expect(page.locator('.p-overlay-mask')).not.toBeVisible();
  53 | 
  54 |     // 6. Verificar que el profesor aparece en el acordeón de Primaria
> 55 |     await expect(primariaAccordion).toContainText(testName);
     |                                     ^ Error: expect(locator).toContainText(expected) failed
  56 | 
  57 |     // 7. Borrar el profesor de prueba
  58 |     const teacherRow = primariaAccordion.locator('tr').filter({ hasText: testName });
  59 |     await teacherRow.locator('.btn-del').click();
  60 | 
  61 |     // Esperar a que el p-confirmDialog de PrimeNG esté completamente visible y clicar su botón de aceptar
  62 |     const confirmDialog = page.getByRole('alertdialog', { name: 'Eliminar profesor' });
  63 |     await expect(confirmDialog).toBeVisible();
  64 |     await confirmDialog.getByRole('button', { name: 'Eliminar' }).click();
  65 | 
  66 |     // 8. Verificar que el profesor ya no aparece
  67 |     await expect(primariaAccordion).not.toContainText(testName);
  68 |   });
  69 | });
  70 | 
```