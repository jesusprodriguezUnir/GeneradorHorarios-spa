# CLAUDE.md

Este archivo contiene la guía de comandos y directrices de desarrollo para el proyecto **Lectivo (GeneradorHorarios-spa)**.

## Comandos del Proyecto

### Desarrollo y Compilación
- **Servidor de desarrollo**: `npm run dev` o `ng serve`
- **Compilación de producción**: `npm run build` o `ng build`
- **Analizar bundles**: `npm run build -- --stats-json`

### Calidad de Código
- **Ejecutar linter**: `npm run lint` o `ng lint`
- **Formatear código**: `npx prettier --write .`

### Pruebas
- **Ejecutar tests unitarios (Vitest)**: `npm test -- --watch=false` o `ng test`
- **Ejecutar con cobertura**: `npm run test:cov`
- **Ejecutar pruebas E2E (Playwright)**: `npm run e2e`

---

## Directrices de Desarrollo y Arquitectura

### 1. Angular Stack Moderno
- **Angular 21+**, **Zoneless** (`provideZonelessChangeDetection`), **Standalone Components** (sin `NgModule`).
- Control-flow moderno obligatorio: usar `@if`, `@for` (con `track` de clave de dominio estable, no `$index`), `@switch`.
- Estrategia de cambio **OnPush** universal (`ChangeDetectionStrategy.OnPush`).

### 2. Estructura de Servicios y API
- **Arquitectura modular de API**: En lugar de servicios monolíticos, crear servicios por dominio en `src/app/core/api/` (ej. `schools-api.service.ts`, `teachers-api.service.ts`).
- **HTTP asíncrono**: Consumir endpoints de API mediante `HttpClient` convirtiendo los Observables en Promesas con `firstValueFrom(http.get(...))` combinados con `async/await`. Evitar suscripciones manuales (`.subscribe`).
- **Realtime (SignalR)**: Encapsular conexiones SignalR en servicios reactivos específicos (ej. `GenerationHubService`) exponiendo estados y progresos mediante Signals de lectura controlada.

### 3. Gestión de Estado (Light Store Pattern)
- Mantener los stores basados en Signals ligeros y encapsulados.
- El estado mutable/escribible debe ser privado (ej. `private readonly _state = signal(...)`).
- Exponer el estado a componentes/servicios externos usando envolturas de sólo lectura (`asReadonly()` o `computed()`).

### 4. Estilos y CSS
- Estilos globales del diseño Lectivo en `src/app/styles.css`.
- Para estilos específicos de componentes, usar Sass (`scss`) con la sintaxis de módulos moderna (`@use` en lugar de `@import`).
- Mover los estilos inline o duplicados a clases SCSS estructuradas en lugar de ad-hoc.
