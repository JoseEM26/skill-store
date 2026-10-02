---
name: qa-test-designer
description: >-
  Use this skill BEFORE writing any code, once a HU already has its
  PLAN-REQUERIMIENTOS (with Gherkin acceptance criteria) and/or
  PLAN-ARQUITECTURA, to design the test strategy: prioritized test cases
  (P0-P3), a coverage matrix mapping each criterion to a test level, and open
  questions to the business. It does NOT audit code already written (that is
  `qa-analyst`) — this designs what to test, before it exists.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/JoseEM26/skill-store'
---

# QA Test Designer Skill

Esta skill diseña la **estrategia de pruebas de una HU antes de que exista código**, a partir de los criterios de aceptación ya definidos (nunca inventa reglas de negocio nuevas). Es el complemento inverso de `qa-analyst`: esa audita el código ya escrito comparándolo contra la HU; esta decide, antes de codificar, **qué hay que probar y con qué prioridad**, para que `implementation-planner` reciba una Sección 3 (Checklist de Verificación) ya fundamentada y no inventada al vuelo.

## Cuándo corre esta skill
Después de que exista `PLAN-REQUERIMIENTOS-HU-[Num].md` (con sus criterios en Gherkin) para esta HU — o, si no existe formalmente, al menos una historia con formato "Como/Quiero/Para" y algún criterio de aceptación identificable. Nunca antes de eso: sin criterios reales no hay nada que priorizar, solo se estaría adivinando.

## Core Directives

1. **Nunca inventar criterios nuevos.** Los casos de prueba salen de los criterios Gherkin ya escritos en `PLAN-REQUERIMIENTOS-HU-[Num].md` (o el equivalente que exista) — si un caso obvio no está cubierto por ningún criterio existente, se marca como pregunta pendiente a negocio (Sección 5 del output), no se agrega como si el criterio ya existiera.
2. **Prioridad P0-P3, con criterio explícito, no a ojo:**
   - **P0 — Bloqueante:** camino feliz del criterio principal de la HU, o cualquier caso que toque dinero, seguridad/permisos, o pérdida de datos si falla.
   - **P1 — Camino no feliz núcleo:** el error/rechazo/validación que el propio Gherkin ya declaró como escenario.
   - **P2 — Edge case:** condición de carrera, estado intermedio, null/vacío no declarado explícitamente pero plausible por el dominio.
   - **P3 — Cosmético:** copy, formato visual, algo que si falla no rompe el flujo ni los datos.
3. **Pirámide de pruebas, respetando las convenciones reales de este proyecto (ver `CLAUDE.md` / `docs/STANDARDS_CRUD_LIVEWIRE.md`):**
   - **Unitarias:** `PHPUnit\Framework\TestCase` puro (sin `RefreshDatabase`), método `test_` — solo para lógica sin dependencia de BD (ej. un Enum, un cálculo, un Value Object). Precedente: `AsbanRuleTest.php`.
   - **Feature:** `extends Tests\TestCase` + `use RefreshDatabase` + atributo `#[Test]` — para Livewire components, Controllers, Services que tocan BD. Es el nivel por defecto de este proyecto.
   - **E2E / manual:** solo cuando el criterio cruza un servicio externo real (SLIN/CAVALI) que no tiene sentido mockear en Feature, o cuando toca una integración visual que ningún test automatizado cubre hoy en este repo — declarar explícito por qué no alcanza con Feature.
4. **Matriz de cobertura obligatoria:** cada criterio Gherkin del `PLAN-REQUERIMIENTOS` tiene que aparecer en la matriz de la Sección 1 del output, con su prioridad y su nivel de test asignado — un criterio sin fila en la matriz es un hueco, no una omisión aceptable.
5. **Datos de prueba reales del proyecto, nunca inventados genéricos:** identificar qué factories/seeders ya existen (`database/factories/`, `database/seeders/`) y reusarlos; si hace falta un dato que no tiene factory (ej. un estado específico de `EstadoSolicitudEvidenciaPago`, un enum particular), decirlo explícito en la Sección 4, no asumir que "ya existe algo parecido".
6. **Regresión explícita:** si el código a tocar es compartido por otro módulo/HU (mismo Service, misma tabla, mismo Livewire component reusado), listar qué suite de tests existente hay que correr en paralelo para detectar una regresión cruzada — mismo criterio que ya usa este proyecto (ver memoria de sesión: diffear la suite completa antes/después para aislar regresiones reales).
9. **Todo control de seguridad nuevo lleva su caso "camino legítimo sigue funcionando", no solo el caso de ataque (agregado 13/09/2026 — lección real: un `#[Locked]` nuevo se probó solo contra el intento de reescritura, y rompió 16 tests reales porque el componente es `#[Lazy]` y el montaje de test no corría `mount()` — nadie volvió a correr la suite completa hasta un retest externo).** Cuando la matriz de cobertura incluya un P0 de seguridad/permisos (un `abort()`, un `#[Locked]`, una validación de pertenencia), agregar SIEMPRE, junto al caso de ataque, un caso que confirme que el usuario legítimo con datos propios reales sigue pasando — y listar en la Sección 6 (Regresión Cruzada) la corrida completa de la suite del componente tocado, antes y después del cambio, no solo el test nuevo en aislado.
7. **No escribe el código del test.** Esta skill entrega el diseño/estrategia (qué casos, qué prioridad, qué nivel, qué datos) — el código real de cada test lo escribe quien implementa (`implementation-planner` + la codificación real), siguiendo este documento como especificación.
8. **Preguntas pendientes van al documento, no se resuelven adivinando.** Si un caso relevante depende de una regla de negocio que el `PLAN-REQUERIMIENTOS` no aclaró (ej. "¿qué pasa si el monto es exactamente cero?"), se anota en la Sección 5 — nunca se decide sobre la marcha qué debería pasar.

## Output Template (`docs/TRD---[ID]/[User]/[Date]/HU-[Num]/planes-tecnicos/[YYYY-MM-DD]/PLAN-PRUEBAS-HU-[Num].md`)

```markdown
# 🧪 Plan de Pruebas: HU-[Num] — [Title]

**Basado en:** `PLAN-REQUERIMIENTOS-HU-[Num].md` (criterios Gherkin ya definidos ahí, no se reinventan acá)
**Fecha:** [YYYY-MM-DD]
**Estado:** 🟡 Diseño de pruebas — antes de codificar

---

## 1. Matriz de Cobertura
| # | Criterio (Gherkin, citado del PLAN-REQUERIMIENTOS) | Prioridad | Nivel de test | Test propuesto (archivo/método) |
|---|---|---|---|---|

## 2. Catálogo de Casos por Prioridad

### 🔴 P0 — Bloqueantes
- [Caso concreto, con el dato de entrada y el resultado esperado]

### 🟠 P1 — Camino no feliz núcleo
- [Caso concreto]

### 🟡 P2 — Edge cases
- [Caso concreto]

### ⚪ P3 — Cosmético
- [Caso concreto]

## 3. Pirámide de Pruebas Propuesta
- **Unitarias** (`PHPUnit\Framework\TestCase`, sin BD): [qué lógica pura se cubre acá, si alguna]
- **Feature** (`Tests\TestCase` + `RefreshDatabase` + `#[Test]`): [qué componentes/servicios]
- **E2E / manual**: [solo si aplica, con la razón explícita de por qué Feature no alcanza]

## 4. Datos de Prueba Necesarios
- **Factories/seeders reusados:** [ruta real]
- **Factory/estado faltante (si aplica):** [qué falta y por qué no alcanza lo existente]

## 5. Riesgos y Preguntas Pendientes al Negocio
- [Nunca inventado — solo lo que el PLAN-REQUERIMIENTOS no cerró]

## 6. Regresión Cruzada
- **Módulos/tests que comparten código con esta HU:** [ruta de la suite existente a correr en paralelo]
```
