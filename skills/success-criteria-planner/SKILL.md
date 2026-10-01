---
name: success-criteria-planner
description: >-
  Use this skill AFTER implementation-planner's runbook has been executed (code
  written, tasks checked off, tests run) to produce a short closing sign-off
  document verifying each success criterion with real command/output evidence,
  confirming no scope creep happened against the HU's documented out-of-scope
  list, and giving a final go/no-go verdict. It does NOT design tests
  (qa-test-designer) or audit code smells (qa-analyst) — it only verifies, with
  evidence, whether what was built matches what was scoped.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/Aybar-Corp/Skill-store'
---

# Success Criteria Planner Skill

Esta skill cierra el ciclo de una HU con un documento corto, legible sin entrar al runbook técnico completo, que confirma **con evidencia real** si lo que se construyó cumple lo que se scopeó. Es el complemento posterior de `implementation-planner`: esa skill genera el runbook de tareas de código; esta skill audita, después de ejecutado, si el Core Journey se logró, si los criterios de éxito tienen prueba real, y si no se coló nada fuera del alcance decidido.

## Cuándo corre esta skill

Después de que `implementation-planner` haya terminado su runbook — tareas marcadas, comandos de verificación corridos, suite de tests en verde. Nunca antes: sin código real ejecutado no hay nada que verificar, solo se estaría repitiendo el checklist de tareas como si ya estuviera probado.

## Core Directives

1. **Nunca inventa criterios nuevos.** Todo lo que se verifica acá ya estaba declarado en documentos previos de la misma HU — nunca se agrega un criterio de éxito nuevo en este paso. Si al cerrar aparece un criterio obvio que nadie escribió antes, se anota en la Sección 5 (Hallazgos No Contemplados) como algo a decidir, no se aprueba ni se rechaza solo.
2. **Hereda, no redefine, el Core Journey y el Fuera de Alcance.** El `🎯 Core Journey (In-Scope)` y el bloque `🚫 Fuera de Alcance (Decidido)` se citan tal cual aparecen en `PLAN-REQUERIMIENTOS-HU-[Num].md` (Directiva 10 de `requirements-analyst`) — se copian literalmente, no se parafrasean ni se amplían.
3. **Los criterios de éxito P0/P1 salen de `PLAN-PRUEBAS-HU-[Num].md`** (si existe) — cada caso P0/P1 de esa matriz se convierte en una fila de la Sección 2 de este documento. Si no existe `PLAN-PRUEBAS`, los criterios salen de los criterios Gherkin del `PLAN-REQUERIMIENTOS` directamente, y se anota esa ausencia en la Sección 5.
4. **Evidencia real, nunca resumida ni parafraseada (mismo estándar que la Directiva 19 de `implementation-planner`):** cada fila de la Sección 2 lleva el comando de verificación real y su salida real pegada (o la captura/pantalla si es una verificación de UI que no tiene comando). "Se probó y funciona" sin comando+salida no es una verificación válida — la fila queda en 🟡 Pendiente de evidencia, nunca en ✅.
5. **Verificación explícita de no-scope-creep:** cada ítem del bloque `🚫 Fuera de Alcance (Decidido)` heredado del `PLAN-REQUERIMIENTOS` se revisa contra los archivos realmente tocados (`git diff`/`git show` del commit o rango de commits de la HU) — si algo de esa lista terminó tocado de todas formas, se marca explícito en la Sección 3, con el archivo:línea real, nunca se omite en silencio.
6. **Veredicto por criterio, no solo un veredicto global:** cada fila de la Sección 2 cierra en uno de tres estados — `✅ Cumplido` (con evidencia), `🔴 No cumplido` (con qué falta), `🟡 Cumplido parcial` (qué parte falta, explícito). El veredicto global de la Sección 4 es la agregación de esos estados, nunca una impresión aparte.
7. **No duplica la Sección 3 de `implementation-planner`.** Ese checklist de tareas técnicas sigue siendo la fuente del detalle de implementación; este documento es el resumen ejecutivo de cierre — referencia esa sección por número de tarea en vez de repetir su contenido.
8. **Refleja la deuda ajena heredada, no la resuelve.** Si `implementation-planner` (Sección 7, Directiva 20) reportó deuda ajena encontrada en el camino, este documento solo confirma si esa deuda bloquea o no el cierre de esta HU — no la arregla ni la vuelve a analizar acá.
9. **No incluye guía de despliegue.** El runbook de despliegue/rollback ya vive en `implementation-planner` (Sección 6.1) — este documento no lo repite, solo puede referenciarlo si su ejecución real forma parte de algún criterio de éxito.

---

## Output Template (`PLAN-CIERRE-HU-[Num].md`)

Guardar en: `docs/TRD---[ID]/[User]/[Date]/HU-[Num]/planes-tecnicos/[YYYY-MM-DD]/PLAN-CIERRE-HU-[Num].md`

```markdown
# ✅ Plan de Cierre y Criterios de Éxito: HU-[Num] — [Title]

**Basado en:** `PLAN-REQUERIMIENTOS-HU-[Num].md` (Core Journey + Fuera de Alcance) y `PLAN-PRUEBAS-HU-[Num].md` (casos P0/P1), si existen.
**Runbook ejecutado:** `PLAN-IMPLEMENTACION-HU-[Num].md`
**Fecha de cierre:** [YYYY-MM-DD]
**Estado:** 🟡 Verificando / ✅ Cerrado / 🔴 Bloqueado

---

## 1. 🎯 Core Journey — Verificación

> [Cita literal del Core Journey del PLAN-REQUERIMIENTOS, sin parafrasear]

* **Comando/pasos de verificación real:**
  ```bash
  [comando real corrido]
  ```
* **Salida real obtenida:**
  ```
  [salida real, no resumida]
  ```
* **Veredicto:** ✅ Cumplido / 🔴 No cumplido / 🟡 Parcial — [detalle si no es ✅]

## 2. 📋 Criterios de Éxito (heredados de PLAN-PRUEBAS / Gherkin)

| # | Criterio (citado, no reinventado) | Prioridad | Comando de verificación | Salida real | Veredicto |
|---|---|---|---|---|---|
| 1 | [criterio] | P0 | `[comando]` | `[salida]` | ✅/🔴/🟡 |

## 3. 🚫 Verificación de No-Scope-Creep

| # | Ítem de "Fuera de Alcance" (citado del PLAN-REQUERIMIENTOS) | ¿Se tocó igual? | Evidencia (archivo:línea / git diff) |
|---|---|---|---|
| 1 | [ítem] | No / Sí — [explicar por qué] | `[ruta:línea o rango de commit]` |

## 4. 🗂️ Deuda ajena heredada (de la Sección 7 del PLAN-IMPLEMENTACION)
- [Citar qué deuda se reportó ahí y si bloquea este cierre o no. "Ninguna heredada" si el implementation plan no reportó nada.]

## 5. ❓ Hallazgos No Contemplados
- [Cualquier criterio obvio que apareció al verificar y que ningún documento previo declaró — se anota para decisión, nunca se aprueba solo]

## 6. 🏁 Veredicto Final
- **Estado:** ✅ Listo para PR/merge / 🔴 Bloqueado — [qué falta] / 🟡 Cierre parcial — [qué se difiere y por qué]
```
