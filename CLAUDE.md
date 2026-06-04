# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos del Proyecto

### Desarrollo y Compilación

- **Servidor de desarrollo**: `npm run dev` o `ng serve`
- **Compilación de producción**: `npm run build` o `ng build`

### Calidad de Código

- **Ejecutar linter**: `npm run lint` o `ng lint`
- **Formatear código**: `npx prettier --write .`

### Pruebas

- **Ejecutar tests unitarios (Vitest, sin watch)**: `npm test -- --watch=false`
- **Ejecutar con cobertura**: `npm run test:cov`
- **Ejecutar pruebas E2E (Playwright)**: `npm run e2e`

---

## Arquitectura

### Stack principal

Angular 21, **Zoneless** (`provideZonelessChangeDetection`), **Standalone Components** (sin `NgModule`), esbuild. Bootstrap en `src/main.ts` → `src/app/app.config.ts`. Rutas lazy en `src/app/app.routes.ts`.

### Estructura de `src/app/`

```text
core/          Servicios singleton: auth, guards, API por dominio, SignalR, modelos
features/      Páginas lazy-loaded: dashboard, generator, schedule-result, config, my-schedule, teacher-profile, login
shared/        Componentes reutilizables: schedule-grid, ui/ (logo-mark, lec-icon, gp-ring, quality-scorecard, …)
shell/         AppShellComponent — layout autenticado con sidebar/nav
```

### Reglas de código obligatorias

- `ChangeDetectionStrategy.OnPush` en todos los componentes.
- Control-flow moderno: `@if`, `@for` (con `track` de clave de dominio estable, no `$index`), `@switch`.
- `inject()` en lugar de inyección por constructor.
- **Signals**: estado mutable privado (`private readonly _x = signal(...)`), expuesto como `asReadonly()` o `computed()`.

### Capa de API (`src/app/core/api/`)

Un servicio por recurso (`schools-api.service.ts`, `teachers-api.service.ts`, etc.), todos `providedIn: 'root'`. Patrón obligatorio: `firstValueFrom(this.http.get<T>(...))` con `async/await`. Nunca `.subscribe()` manual.

### Realtime

`GenerationHubService` (`src/app/core/realtime/`) encapsula SignalR (`@microsoft/signalr`). Expone `state` y `progress` como Signals de solo lectura. URL en `environment.signalrUrl`.

### Entornos

- Dev: `src/environments/environment.ts` → `apiUrl: http://localhost:5000/api`
- Prod: `src/environments/environment.prod.ts` → rutas relativas `/api` y `/hubs/generation`

---

## Sistema de Diseño (Lectivo Design System)

### Tokens globales

`src/styles.scss` es la única fuente de verdad de tokens. Contiene: paleta OKLCH (modo claro + `.lectivo-dark`), sistema de sombras, radios, espaciado, escala tipográfica Geist y colores por asignatura. No duplicar valores aquí en archivos de componentes.

### Paleta de marca

- **Primario**: `--primary` = `oklch(0.45 0.135 272)` (índigo profundo)
- **Acento**: `--accent` = `oklch(0.76 0.15 38)` (coral cálido)
- **Madrid** (motor): `--madrid` = `oklch(0.47 0.18 16)` (carmesí institucional)

Nunca codificar valores `oklch(... 200)` (teal) ni `rgba(99,102,241,...)` (indigo-500 literal) — son tokens heredados ya eliminados. Usar siempre `var(--primary*)`, `var(--shadow-primary)` o los valores oklch del sistema de diseño actual.

### Colores por asignatura

Diez pares `--subj-{key}` / `--subj-{key}-fg` para la rejilla de horarios. No tocar el hue de estas variables aunque algunos coincidan con la marca.

### Estilos de componente

- Usar `scss` (no `css`) con `@use` para módulos.
- Componentes con plantillas inline (la mayoría): incluir los `styles` directamente como template literal en el decorador `@Component`.
- Secciones de `config/`: usan archivos HTML/SCSS externos; ver `config-shared-styles.scss` para tokens compartidos.
- Clases utilitarias `.lec-card`, `.lec-badge` definidas en `styles.scss`; usarlas en lugar de recrearlas.

### UI y PrimeNG

- PrimeNG Aura con tema Lectivo; las variables `--p-primary-*` están mapeadas en `styles.scss` para heredar los tokens de marca.
- Modo oscuro: clase `.lectivo-dark` sobre `<html>`. La selección está configurada en `app.config.ts` (`darkModeSelector: '.lectivo-dark'`).
