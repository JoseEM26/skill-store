---
name: implementation-planner
description: >-
  Use this skill to structure a step-by-step implementation runbook with code
  tasks, validation tests, acceptance checklist, final commit grouping, and an
  execution commit log for coding a feature.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/JoseEM26/skill-store'
---

# Feature Implementation Planner Skill

This skill guides the agent in drafting a granular, highly specific implementation runbook and acceptance checklist before writing any code. It divides the technical work into isolated Tasks (Tareas de Código), specifies exact architectural layer tags, file existence status (Existing vs New), target methods, code snippets, target screen scope, URLs, explicit verification commands, user-story motivations, consolidates Git commit units at the end, and provides an empty execution commit log section to track real git commits as they are pushed.

## Pre-Generation Discovery Protocol (MANDATORY — run before writing ANY path, task, or file)

Before drafting a single line of the plan, execute this discovery pass to guarantee accuracy:

1. **Detect real project conventions first.** Do NOT assume textbook Laravel without confirming it. Run targeted file searches (`find_by_name` / `grep_search`) for patterns. Determine if copy is inline in Blade/PHP or centralized, and verify if components are Livewire, Controllers, or Services.
2. **Verify every path with a tool call, never from memory or convention.** For each file under "Archivos Afectados", verify its existence. Only tag a file `[🟢 Existe en codebase]` after tool confirmation; tag `[✨ Por crear / Nuevo]` only after confirming it does not exist under any plausible name.
3. **Check whether the task is already implemented before proposing it.** Grep target files for the described behavior. If already implemented, mark the task as `✅ Ya implementado` with line-level evidence instead of generating duplicate instructions.
4. **Inherit verified context from the sibling requirements doc.** If `PLAN-REQUERIMIENTOS-HU-[Num].md` exists for this HU, read it first and maintain complete alignment of screen scope, URLs, and component targets — including its `🎯 Core Journey (In-Scope)` and `🚫 Fuera de Alcance (Decidido)` blocks (ver Directiva 10 de `requirements-analyst`). Ninguna tarea de este runbook puede tocar algo listado en "Fuera de Alcance" sin decirlo explícito y pedir confirmación primero; ese mismo Core Journey y Fuera de Alcance son lo que después hereda `success-criteria-planner` para el cierre, así que no se redefinen acá.
5. **Confirm test files before naming them.** Verify existing test suite files (`tests/Feature/...` or `tests/Unit/...`). Use actual test paths and filter names.

## Core Directives

1. **Tasks First (Tareas Técnicas):** Structure Section 2 strictly as **Tareas Técnicas de Código (Tasks)**, detailing step-by-step implementation and verification commands.
2. **NO GIT BRANCH REFERENCES:** Do NOT include Git branch names ("Rama base", "Rama de trabajo", "feature/...") in Section 1 or in the template. Focus Section 1 purely on models, Livewire components, Blade views, and PHPUnit test suite pre-requisites.
3. **Explicit File Existence Verification Status (`[🟢 Existe en codebase]` vs `[✨ Por crear / Nuevo]`):**
   In every Task under **Archivos Afectados**, explicitly verify and tag EACH target file:
   - `[🟢 Existe en codebase]: path/to/file.php` (Verificado con Glob/Grep que ya existe en el proyecto)
   - `[✨ Por crear / Nuevo]: path/to/file.php` (Verificado con Glob/Grep que NO existe bajo ningún nombre plausible)
4. **Explicit Architectural Layer Tagging per Task (`[Capas Afectadas]`):** Every Task MUST specify its explicit architectural layer tag:
   - `[🎨 UI / UX]` (Interacciones visuales, diseño responsive, alertas)
   - `[💻 Frontend / Blade]` (Vistas Blade, componentes UI, copy estático)
   - `[⚙️ Backend / Logic]` (Componentes Livewire, Controllers, Services, Jobs)
   - `[🗄️ Base de Datos / Migration]` (Modelos Eloquent, Migraciones, Tablas)
   - `[🧪 Testing / PHPUnit]` (Pruebas unitarias e integración)
   - `[🚀 DevOps / Config]` (Variables de entorno, config/mail.php)
5. **Strict UI Copy Boundary Directive (Regla de oro: Copy UI vs Backend/BD):**
   Changes like replacing `"Lote"` with `"Terreno"`, `"comprobante"` with `"Voucher"`, or `"ASBANC"` with `"ASBAN"` apply **EXCLUSIVELY TO USER-FACING UI/UX COPY** in Blade templates (`resources/views/livewire/...blade.php`).
   **PROHIBITED:** Never rename Eloquent models (`Lote.php`), DB tables (`slin_lote_cache`), database columns (`slin_asbanc`), controller classes, or PHP internal variables (`$lote`). Every task touching copy MUST include the warning: *"⚠️ Modificar ÚNICAMENTE la capa [🎨 UI / UX]. PROHIBIDO alterar la capa [⚙️ Backend / Base de Datos / Modelos]"*.
6. **Mandatory Screen Scope & URL Context (🌐 Enfoque de Pantalla, URL y Modales):** Every implementation plan MUST include header metadata specifying:
   - **Ruta / URL Afectada:** e.g. `/erp/solicitud-evidencia-pago/{id}/editar` or `/mi-portal/lotes/{id}`
   - **Pantalla Afectada (Focus Scope):** Explicitly clarify which screen is modified and which screen is NOT touched (e.g. "Afecta exclusivamente a SolicitudEvidenciaPagoEditar. NO modifica la lista principal solicitud-evidencia-pago-lista").
   - **Modal / Componente UI:** Exact modal name (e.g. `ModalConfirmacionCierre`, `AdjuntarVoucherPago`).
7. **Ultra-Specific Code Locations & Snippets (Dónde encontrar y qué editar):** Every task MUST specify:
   - **Capa Afectada:** Tag `[🎨 UI / UX]`, `[⚙️ Backend]`, `[🗄️ BD]`, etc.
   - **Ruta del Archivo:** Path and existence status (`[🟢 Existe en codebase]` or `[✨ Por crear / Nuevo]`).
   - **Ubicación Exacta:** Target method/function name, event listener, or Blade block.
   - **Snippet de Código Propuesto:** Exact PHP/Blade code snippet or logic to insert/modify.
8. **User Story Motivation Per Task (Como / Quiero / Para):** Every single Task MUST start with a clear, readable functional objective formatted as:
   - **Como:** [Rol de usuario o sistema]
   - **Quiero:** [Acción concreta de la tarea]
   - **Para:** [Beneficio de negocio o estabilidad técnica]
9. **Mandatory Acceptance Checklist:** Every implementation plan MUST include Section 3: **📋 Checklist de Verificación y Criterios de Aceptación**.
10. **Commits Grouped at the End:** Place Section 4: **📦 Registro y Agrupación de Commits Sugeridos (Git Commit Units)** near the end of the plan.
11. **Mandatory Real Commits Log Section:** Include Section 5: **📜 Historial y Registro de Commits Ejecutados en Git (Real Execution Log)**, initialized empty to log actual SHA hashes, messages, and timestamps as commits are executed during development.
12. **No Deployment Guides:** Keep the runbook strictly focused on coding, testing, tasks, checklist, and commits.
13. **Final Coherence Pass:** Re-read the complete draft once, end to end, to confirm every header field, screen scope, URL, and task goal are 100% aligned.
14. **El ejecutor es un agente de IA con acceso real a herramientas (Read/Edit/Bash), no un desarrollador humano leyendo un runbook (actualizado 07/09/2026 — "el obrero" pasó de ser un desarrollador o Gemini a ser el propio agente de Claude Code corriendo en este repo).** Esto cambia el estándar de qué es "suficientemente concreto":
    - **Cero placeholders donde el agente ya puede verificar el dato real.** Nada de `[ruta verificada con Glob/Grep]` como texto literal en el plan final — cada `Archivo (Estado)` lleva la ruta real, y cada `Método / Función Target` lleva el número de línea real, ambos confirmados con `Read`/`Grep` al momento de escribir el plan, no supuestos por convención ni por memoria de una sesión anterior.
    - **El snippet de código es el punto de partida real, no pseudocódigo.** Debe poder pegarse casi tal cual con la herramienta de edición — variables, nombres de método y sintaxis exactos del archivo real, no una aproximación ilustrativa.
    - **Orden de ejecución explícito, no implícito:** las Tareas se ejecutan en el orden en que aparecen, una por vez — el agente corre el `Comando de Verificación` de la Tarea N antes de empezar la Tarea N+1, nunca acumula varias tareas sin probar. Antes de editar, el agente vuelve a leer el archivo real (`Read`) para confirmar que la línea objetivo no cambió desde que se escribió el plan — el número de línea del plan es una referencia, no una garantía.
    - **Pausar solo ante una decisión real** (una ambigüedad de negocio, una elección de diseño no resuelta en el plan de requerimientos/arquitectura/BD ya aprobado) — nunca pedir confirmación por cada tarea trivial ya completamente especificada en el plan.
15. **Runbook de despliegue y rollback (agregado 07/09/2026):** Si la HU toca migraciones, un feature flag, un job/comando nuevo, o cualquier cosa que se despliega aparte del código de la app, el plan DEBE cerrar con un runbook de despliegue verificable — no basta el checklist de Pint/lint/push de la Sección 6 actual. Ver la Sección 6.1 del template: pasos de "antes" (credenciales/config nuevas, flag creada apagada), pasos de despliegue (orden real: migración antes o después del deploy del código, según si es aditiva o no), verificación posterior (qué mirar para confirmar que salió bien, con comando/pantalla concretos) y rollback explícito — escrito para que alguien que NO programó la historia pueda ejecutarlo sin pedir contexto. Si la HU no despliega nada aparte del código normal (sin migración, sin flag, sin job nuevo), decir explícito "No aplica — sin piezas de despliegue especiales" en vez de omitir la sección.
16. **Buscar los hermanos del bug, no solo el punto citado (agregado 13/09/2026 — lección de un retest de QA real: `H-03`, `H-15`, `H-42`, `H-47`, `N-01` quedaron "parcialmente" arreglados porque el fix cerró exactamente el `fichero:línea` que señalaba el hallazgo y ningún otro).** Antes de dar una tarea por terminada, si el fix corrige una validación, una fuga de datos, o un chequeo de permisos, correr un `grep` del mismo patrón/nombre de método/misma lógica en el resto del proyecto (mismo trait, mismo servicio, componentes hermanos del mismo módulo) y verificar si el mismo defecto existe en más de un lugar. Si existen 2+ ocurrencias, se arreglan las 2+ en la misma tarea — no se cierra "parcial" a propósito salvo que sea una decisión explícita de alcance, dicha en el plan.
17. **Los flags de estado nombran y reflejan un resultado verificado, nunca un intento (agregado 13/09/2026 — lección real: `alert_dispatched = true` se ponía tras *llamar* a la función de envío, sin mirar si mandó algo).** Toda columna/propiedad booleana de la forma `_dispatched`/`_sent`/`_completado`/`_enviado` debe derivarse del valor de retorno real de la operación que describe, nunca de haber llegado a esa línea de código. Al diseñar la tarea que setea ese flag, preguntar explícito: "¿qué pasa si la operación que este flag describe falla a medio camino? ¿el flag lo refleja?".
18. **Extraer a un lugar compartido la lógica que se repite en 2+ componentes, no duplicarla "por ahora" (agregado 13/09/2026 — lección real: la normalización de montos se reescribió con su propio regex en 3 pantallas distintas antes de unificarse en `MontoNormalizer`, y mientras tanto cada arreglo solo tocaba una).** Si una tarea va a escribir la misma validación/parseo/normalización que ya existe en otro componente del proyecto (confirmado con grep, no de memoria), la tarea es crear o reusar una clase de soporte compartida — nunca copiar el bloque de código a un segundo lugar.
19. **Nunca marcar una tarea "✅ Completada" sin pegar el comando real y su salida real que lo prueba (agregado 13/09/2026 — lección real: un plan llegó a decir "✅ RESUELTO" sobre un fix de seguridad que nunca se aplicó al código).** El `Comando de Verificación` de cada tarea se corre de verdad antes de tildarla, y su salida real (no un resumen parafraseado) queda citada en el resumen de cierre. Si la tarea cierra un hallazgo de seguridad/autorización/integridad de datos, además hace falta la verificación por mutación: romper a propósito lo que se acaba de arreglar, confirmar que el test nuevo muere, restaurar, confirmar que vuelve a verde — documentando las dos corridas, no solo la final.
20. **Deuda ajena encontrada en el camino va a su propia sección, nunca se ignora ni se mezcla con el alcance de la tarea (agregado 13/09/2026).** Es normal, al tocar código real, encontrar bugs preexistentes de otros programadores/otras HUs que no pediste arreglar. No los arregles de paso (eso es alcance no pedido) y no los ignores en silencio tampoco — anotalos en la Sección 7 del output (ver plantilla) con `fichero:línea`, qué es, y si parece bloqueante para lo que estás haciendo o no. Si de verdad bloquea la tarea actual (el fix no se puede verificar sin tocar esa deuda), decilo explícito y pedí confirmación antes de tocarla — no se asume que sí hay que arreglarla solo porque estorba.

---

## Output Template Structure (`PLAN-IMPLEMENTACION-HU-[Num].md`)

Save the implementation plan file at:
`docs/TRD---[ID]/[User]/[Date]/HU-[Num]/planes-tecnicos/[YYYY-MM-DD]/PLAN-IMPLEMENTACION-HU-[Num].md`

```markdown
# 🛠️ Plan de Implementación Técnico: HU-[Num] — [Title]

**Módulo:** [Module Name]  
**🌐 Enfoque de Pantalla:** [Pantalla exacta que afecta vs las que NO afecta]  
**🔗 Ruta / URL:** `[e.g. /erp/solicitud-evidencia-pago/{id}/editar]`  
**🖼️ Modal / Componente:** `[e.g. ModalConfirmacionCierre / AdjuntarVoucherPago]`  
**Fecha:** [YYYY-MM-DD]  
**Estado:** 🟡 En Planificación  

---

## 1. ⚙️ Pre-requisitos y Configuración Inicial
- **Modelos Involucrados:** `[ruta verificada con Glob/Grep]`
- **Componentes Livewire:** `[ruta verificada con Glob/Grep]`
- **Vistas Blade:** `[ruta verificada con Glob/Grep]`
- **Suite de Pruebas:** `[ruta verificada con Glob/Grep]`

---

## 2. 🚀 Runbook de Tareas Técnicas y Pasos de Código (Tasks)

### 🔹 Tarea 1: [Short Task Title]
* **Capa Afectada:** `[🎨 UI / UX]` / `[⚙️ Backend / Logic]` / `[🗄️ Base de Datos]` / `[🧪 Testing]`
* **Advertencia de Ámbito (Si aplica copy UI):** ⚠️ Modificar ÚNICAMENTE la capa `[🎨 UI / UX]`. PROHIBIDO alterar la capa `[⚙️ Backend / Base de Datos / Modelos]`.
* **Motivación Funcional (Historia de Usuario de la Tarea):**
  - **Como:** [Rol]
  - **Quiero:** [Acción]
  - **Para:** [Beneficio]
* **Ubicación del Código y Archivos Afectados:**
  - **Archivo (Estado):** `[🟢 Existe en codebase]` `app/Livewire/Erp/SolicitudEvidenciaPagoEditar.php`
  - **Método / Función Target:** `public function targetMethod()` (aprox. línea N)
* **Cambios Específicos y Snippet de Código:**
  - [Detailed step 1]
    ```php
    $montoAcumulado = $this->solicitud->evidencias()->where('estado', 'APROBADO')->sum('monto');
    ```
* **Comando de Verificación:**
  ```bash
  php artisan test --filter=TestClassName
  ```

---

## 3. 📋 Checklist de Verificación y Criterios de Aceptación

### 🟢 Pruebas de Código y Lógica de Negocio (Backend)
- [ ] **[Backend]:** [Acceptance criterion 1]

### 🎨 Pruebas de UI/UX y Responsividad (Frontend)
- [ ] **[UI / Blade]:** [Acceptance criterion 2]

### 🧪 Suite de Tests Automatizados (PHPUnit)
- [ ] **[PHPUnit]:** Executed test command and verified 100% tests PASSED without regressions.

---

## 4. 📦 Registro y Agrupación de Commits Sugeridos (Git Commit Units)

* **Commit 1 (`fix` / `feat`):** `type(HU-[Num]): commit description 1`
  - Incluye: Tarea 1 (Archivos modificados)

---

## 5. 📜 Historial y Registro de Commits Ejecutados en Git (Real Execution Log)

| # | SHA | Tipo / Mensaje de Commit | Fecha / Hora | Archivos Modificados | Estado |
|---|---|---|---|---|---|
| 1 | `[Pendiente]` | `type(HU-[Num]): commit description 1` | `YYYY-MM-DD HH:MM` | `app/...` | 🟡 Pendiente de ejecución |

---

## 6. 🏁 Cierre de Implementación
- [ ] Formateo de código con Laravel Pint (`vendor/bin/pint`).
- [ ] Confirmación de 0 lints/errores de sintaxis.
- [ ] Push de commits a la rama correspondiente.

### 6.1 🚀 Runbook de Despliegue y Rollback (ver Directiva 15)
*Si esta HU no toca migraciones/flags/jobs nuevos, escribir: "No aplica — sin piezas de despliegue especiales" y omitir las 4 sub-secciones.*

**Antes:**
- [ ] [Credenciales/config nueva a confirmar, ej. en el vault/`.env`]
- [ ] [Feature flag creada y APAGADA, si aplica]

**Despliegue:**
- [ ] [Orden real de pasos — ej. `php artisan migrate` antes/después del deploy del código, según si la migración es aditiva]
- [ ] [Encender el flag, si aplica — a qué % o para quién primero]

**Verificación posterior:**
- [ ] [Qué mirar en concreto para confirmar que salió bien — comando, pantalla o log real, no "revisar que funcione"]

**Rollback:**
- [ ] [Pasos exactos, ejecutables por alguien que no programó esta historia — ej. "Apagar el flag. La migración es aditiva y se queda" o, si no es aditiva, el paso real de reversión]

---

## 7. 🗂️ Deuda ajena / Hallazgos colaterales (fuera de alcance de esta tarea)
*Ver Directiva 20. Bugs o código de otros programadores/otras HUs, encontrados al tocar este código, que NO se arreglaron acá. Si no se encontró ninguno, escribir "Ninguno encontrado" — no omitir la sección.*

| # | fichero:línea | Qué es | ¿Bloquea esta tarea? |
|---|---|---|---|
| 1 | `[ruta:línea real]` | [descripción corta, verificada, no supuesta] | Sí/No — [si Sí, qué se decidió] |
```
