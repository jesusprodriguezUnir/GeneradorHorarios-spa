# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: schedule-result.spec.ts >> Schedule result >> Switch tabs and publish schedule
- Location: e2e\schedule-result.spec.ts:7:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('publish-button')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('publish-button')

```

```yaml
- complementary:
  - text: Lectivo
  - navigation:
    - text: Gestion
    - link "Panel":
      - /url: /dashboard
      - img
      - text: Panel
    - link "Estructura":
      - /url: /estructura
      - img
      - text: Estructura
    - link "Generador":
      - /url: /generador
      - img
      - text: Generador
    - link "Horarios":
      - /url: /horarios
      - img
      - text: Horarios
    - link "Colegio":
      - /url: /config
      - img
      - text: Colegio
  - text: Tema oscuro
  - button "Alternar tema":
    - img
  - text: D Director/a CEIP Miguel Hernández
  - button "Cerrar sesion":
    - img
- banner:
  - text: CEIP Miguel Hernández
  - button "Todo el colegio 3 etapas":
    - img
    - text: Todo el colegio 3 etapas
    - img
  - button "Jornada completa Oct – May · partida":
    - img
    - text: Jornada completa Oct – May · partida
    - img
  - text: Jefatura de estudios
- main:
  - heading "Horarios generados" [level=1]
  - text: failed 2025/2026 6 conflictos
  - button "Exportar PDF":
    - img
    - text: Exportar PDF
  - button "Volver a generar"
  - text: "Horario:"
  - combobox:
    - option "2025/2026 — failed" [selected]
    - option "2025/2026 — failed"
  - img
  - text: 90 Calidad del horario Equilibrada
  - img
  - text: Bien Huecos docentes 90 Difíciles por la mañana 88 Jornadas agrupadas 86 Equilibrio diario 95 Cambios de aula 90 Preferencias satisfechas 92
  - img
  - text: "Reglas obligatorias: todas cumplidas"
  - img
  - text: "Preferencias: 92% satisfechas"
  - img
  - text: 6 ajustes manuales sugeridos
  - button "Jornada completa Oct – May"
  - button "Jornada reducida Jun + Sep"
  - text: 6 ses/día · partida
  - button "Por grupo"
  - button "Por profesor"
  - button "Por aula"
  - combobox:
    - option "1ºA" [selected]
    - option "1ºA"
    - option "1ºA"
    - option "1ºB"
    - option "1ºC"
    - option "2ºA"
    - option "2ºA"
    - option "2ºA"
    - option "2ºB"
    - option "2ºC"
    - option "3ºA"
    - option "3ºA"
    - option "3ºA"
    - option "3ºB"
    - option "3ºC"
    - option "4ºA"
    - option "4ºA"
    - option "4ºB"
    - option "4ºC"
    - option "5ºA"
    - option "5ºB"
    - option "5ºC"
    - option "6ºA"
    - option "6ºB"
    - option "6ºC"
  - text: Lunes Martes Miércoles Jueves Viernes 09:00 10:00
  - img
  - img
  - img
  - img
  - img
  - text: 10:00 11:00
  - img
  - img
  - img
  - img
  - img
  - text: 11:00 11:30
  - img
  - text: RECREO ESCOLAR • 11:00 – 11:30 11:30 12:30
  - img
  - img
  - img
  - img
  - img
  - text: 12:30 13:30
  - img
  - img
  - img
  - img
  - img
  - text: 13:30 14:30
  - img
  - img
  - img
  - img
  - img
  - text: "Leyenda: Mat. Lengua Inglés Naturales Sociales E. Física Plástica Música Religión Tutoría"
  - heading "Conflictos detectados (6)" [level=3]
  - text: El profesor asignado a 'Primera Lengua Extranjera (Inglés)' (1ºA) no tiene la especialidad requerida.
  - list:
    - listitem: Asigna un profesor con la especialidad 'Inglés' a esta sesión.
    - listitem: Ve a Configuración → Profesores para revisar las especialidades registradas.
  - text: El profesor asignado a 'Primera Lengua Extranjera (Inglés)' (3ºA) no tiene la especialidad requerida.
  - list:
    - listitem: Asigna un profesor con la especialidad 'Inglés' a esta sesión.
    - listitem: Ve a Configuración → Profesores para revisar las especialidades registradas.
  - text: El profesor asignado a 'Primera Lengua Extranjera (Inglés)' (2ºA) no tiene la especialidad requerida.
  - list:
    - listitem: Asigna un profesor con la especialidad 'Inglés' a esta sesión.
    - listitem: Ve a Configuración → Profesores para revisar las especialidades registradas.
  - text: El profesor asignado a 'Primera Lengua Extranjera (Inglés)' (1ºA) no tiene la especialidad requerida.
  - list:
    - listitem: Asigna un profesor con la especialidad 'Inglés' a esta sesión.
    - listitem: Ve a Configuración → Profesores para revisar las especialidades registradas.
  - text: El profesor asignado a 'Primera Lengua Extranjera (Inglés)' (2ºA) no tiene la especialidad requerida.
  - list:
    - listitem: Asigna un profesor con la especialidad 'Inglés' a esta sesión.
    - listitem: Ve a Configuración → Profesores para revisar las especialidades registradas.
  - text: El profesor asignado a 'Primera Lengua Extranjera (Inglés)' (3ºA) no tiene la especialidad requerida.
  - list:
    - listitem: Asigna un profesor con la especialidad 'Inglés' a esta sesión.
    - listitem: Ve a Configuración → Profesores para revisar las especialidades registradas.
- alertdialog
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAs } from './fixtures';
  3  | 
  4  | const ADMIN_EMAIL = 'elena.castro@ceip-miguel-hernandez.es';
  5  | 
  6  | test.describe('Schedule result', () => {
  7  |   test('Switch tabs and publish schedule', async ({ page }) => {
  8  |     await loginAs(page, ADMIN_EMAIL);
  9  | 
  10 |     // Generate a schedule first
  11 |     await page.goto('/generador');
  12 |     for (let i = 0; i < 3; i++) {
  13 |       await page.getByTestId('wizard-next').click();
  14 |     }
  15 | 
  16 |     // Iniciar la espera del request de backend en paralelo al click
  17 |     const generatePromise = page.waitForResponse(response =>
  18 |       response.url().includes('/api/schedules/generate') && response.ok()
  19 |     );
  20 | 
  21 |     await page.getByTestId('generate-button').click();
  22 | 
  23 |     // El motor en vivo se anima mientras el backend genera en paralelo
  24 |     await expect(page.getByTestId('live-engine')).toBeVisible();
  25 | 
  26 |     // Esperar a que el backend termine de generar
  27 |     await generatePromise;
  28 | 
  29 |     // Aparecen las soluciones candidatas (hasta 60s incluyendo la animación)
  30 |     await expect(page.getByTestId('candidate-card').first()).toBeVisible({ timeout: 60000 });
  31 | 
  32 |     // Elegir una candidata → abre el horario real
  33 |     await page.getByTestId('choose-candidate').first().click();
  34 |     await page.waitForURL(/\/horarios\/.+/);
  35 | 
  36 |     // Check tabs
  37 |     await expect(page.getByTestId('view-tab-group')).toBeVisible();
  38 |     await page.getByTestId('view-tab-teacher').click();
  39 |     await page.getByTestId('view-tab-room').click();
  40 |     await page.getByTestId('view-tab-group').click();
  41 | 
  42 |     // Publish
> 43 |     await expect(page.getByTestId('publish-button')).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  44 |     await page.getByTestId('publish-button').click();
  45 | 
  46 |     // Esperar y aceptar el p-confirmDialog de confirmación de publicación
  47 |     const confirmDialog = page.getByRole('alertdialog', { name: 'Confirmar publicación' });
  48 |     await expect(confirmDialog).toBeVisible();
  49 |     await confirmDialog.getByRole('button', { name: 'Publicar' }).click();
  50 | 
  51 |     // Verify status badge updated
  52 |     await expect(page.getByTestId('status-badge')).toContainText('Publicado');
  53 |   });
  54 | });
  55 | 
```