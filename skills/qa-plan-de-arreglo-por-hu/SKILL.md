---
name: qa-plan-de-arreglo-por-hu
description: >-
  Usar al convertir los hallazgos "INTRODUCIDO" de un informe de QA ya
  certificado en un plan de arreglo separado por cada HU afectada — uno por HU,
  nunca combinados — con prioridad, criterio FIX/implementación y qué hallazgos
  son ajenos a esa HU.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/Aybar-Corp/Skill-store'
---

# Plan de arreglo por HU

## Cuándo corre esta skill

Después de que ya existe un informe de certificación (`qa-certificacion-de-sprint`) con
hallazgos clasificados y verificados (`fichero:línea`, severidad, criticidad, origen). Esta
skill **no re-analiza código desde cero** ni vuelve a decidir si un hallazgo es real: parte
de lo que el informe ya cerró.

No corre para armar el requerimiento de una HU nueva (eso es `requirements-analyst`) ni para
escribir el paso a paso de código (eso es `implementation-planner`/`resolver-hu`). Corre en
el punto intermedio: cuando ya sabés qué está roto (el informe) pero todavía no está separado
por HU ni priorizado para que alguien lo ejecute.

## Relación con las skills hermanas

- **`qa-de-modulo`** decide si un hallazgo es FIX o IMPLEMENTACIÓN (tabla ya fija) — se
  invoca esa tabla, no se reproduce acá.
- **`qa-issue-para-el-equipo`** arma el issue por **EQUIPO** (quien recibe el trabajo hoy).
  Esta skill arma el plan por **HU** (el corte que necesita quien va a implementar HU por
  HU). No son excluyentes: pueden convivir sobre el mismo informe.
- **`qa-defectos-capturados`** decide qué se guarda como prueba en rojo con `QA_DEFECTOS` —
  si un hallazgo de la HU ya tiene un caso guardado así, el plan lo cita como su propio
  retest, no inventa uno nuevo.
- **`qa-evidencias`** es de dónde sale la evidencia que cada punto del plan cita.
- **`implementation-planner`** (o `resolver-hu`/`desarrollar-hu` si se ataca la HU completa
  de una sola vez) es quien recibe este plan como entrada y lo convierte en código real,
  snippet por snippet, con verificación `Read`/`Grep` antes de cada edición. Esta skill
  **no escribe ni sugiere código**, solo localiza y prioriza.

## Core Directives

1. **Mapear cada hallazgo `INTRODUCIDO` a su HU real, verificado contra el código** — nunca
   por el nombre de la carpeta de documentación ni por el número de "frente" que le puso el
   analista (`Anexo C` del informe suele traer esa correspondencia, pero se confirma, no se
   copia ciegamente: un hallazgo puede tocar código de más de una HU a la vez).
2. **Un archivo por HU, nunca combinados.** Si dos HUs comparten un hallazgo (ej. un fichero
   que las dos tocan), el hallazgo aparece en los dos planes, cada uno con su propio
   `fichero:línea` y su propia prioridad — no se resuelve "para las dos" en un solo lugar.
3. **Clasificar cada hallazgo de esa HU: FIX o IMPLEMENTACIÓN**, con el criterio ya fijo de
   `qa-de-modulo` (el código existe pero contradice lo documentado = FIX; no hay código para
   ese requisito = IMPLEMENTACIÓN). No inventar un tercer criterio.
4. **Priorizar dentro de la HU por severidad de CONSECUENCIA, no por esfuerzo de arreglo** —
   igual que ya hace el informe de origen. Lo bloqueante va primero, siempre, aunque sea lo
   más caro de arreglar.
5. **Separar lo ajeno a esa HU con la misma regla de las "4 razones"** de
   `qa-issue-para-el-equipo` (es tuyo / se te imputó antes y se levanta / afecta a tu merge /
   explica un ámbar de tu semáforo). Si un hallazgo tocado por la HU no encaja en ninguna,
   **no entra en el plan de esa HU** — se anota en una sección aparte, "no es de esta HU", con
   su dueño real.
6. **No inventar una decisión de negocio para cerrar un hallazgo.** Si el hallazgo es una
   decisión abierta (clase `DE PROCESO`, ej. `PRO-nn` en el informe de origen), se anota como
   **pregunta pendiente**, nunca como tarea con un arreglo sugerido — decidir en silencio es
   el origen del siguiente bug.
7. **Cada punto del plan lleva seis campos fijos**, sin excepción: `fichero:línea`, qué pasa,
   por qué el test actual no lo agarra (si aplica), arreglo sugerido en una frase (no el
   snippet — eso es de `implementation-planner`), el criterio de aceptación original de la HU
   que ese arreglo recupera, y evidencia (la ruta del hallazgo en el informe de origen).
8. **Si el plan reordena o cambia cómo se hacía algo antes** (ej. un nuevo orden de arreglo
   entre HUs que dependen entre sí, un flujo de escalado distinto para lo ajeno a la HU),
   explicarlo con un diagrama Mermaid — nunca en texto ni ASCII. No es obligatorio si no hay
   ningún cambio de flujo que mostrar (una HU con un solo hallazgo suelto no necesita
   diagrama).
9. **No marcar un hallazgo como resuelto ni bajarle la prioridad sin evidencia nueva.** Este
   plan hereda el estado que trae el informe de origen; si algo cambió desde entonces
   (alguien ya lo arregló), se verifica contra el código antes de retirarlo del plan, no se
   asume.

## Output Template (`docs/TRD---[ID]/[Persona]/HU-[Num]/fix-qa/PLAN-ARREGLO-HU-[Num].md`)

Va **dentro de la carpeta de la HU real** (la misma que ya usa `requirements-analyst`/`implementation-planner` para esa HU), en una subcarpeta `fix-qa/` — nunca en un árbol paralelo separado por fecha o por vuelta de retest. Si ya existe `PLAN-ARREGLO-HU-[Num].md` de una vuelta anterior en esa misma carpeta, esta vuelta **actualiza ese mismo archivo** (una sección `✅ RESUELTO — [fecha]` arriba por cada hallazgo que ya cerró, y los hallazgos nuevos de la vuelta actual se agregan a la Sección 1) — no se crea un segundo archivo con la fecha en el nombre.

```markdown
# Plan de Arreglo: HU-[Num] — [Título]

**Informe de origen:** `[ruta del informe de QA]`, hallazgos [lista de IDs, ej. H-07, H-08, H-09, H-10]
**Estado real de la HU en el informe:** [ej. "No implementada" / "Implementada con defectos"]

## 1. Hallazgos que corresponden a esta HU

| # | fichero:línea | Qué pasa | Por qué el test no lo agarra | FIX / IMPLEMENTACIÓN | Prioridad |
|---|---|---|---|---|---|
| H-07 | `EstadoCuentaVer.php:139` | ... | ... | FIX | Alta — bloqueante |

## 2. Arreglo sugerido por hallazgo

- **H-07** — [una frase, sin snippet]. Recupera el criterio de aceptación: "[cita textual del
  criterio de la HU original]". Evidencia: `[ruta:línea del informe de origen]`.

## 3. Orden de arreglo dentro de la HU

[Lista numerada, bloqueantes primero. Diagrama Mermaid solo si el punto 8 de las Directivas
aplica — ej. si el orden entre hallazgos de esta HU y otra HU importa.]

## 4. Preguntas pendientes (decisiones de negocio, no tareas)

- [Hallazgo `PRO-nn`]: [la pregunta tal cual, sin proponer una respuesta]

## 5. Hallazgos ajenos a esta HU

| # | Por qué se descartó de este plan | Dueño real |
|---|---|---|
| PRE-nn | No pasó ninguna de las 4 razones | [rol/equipo real] |

## 6. Próximo paso

Este plan pasa a `implementation-planner` (o `resolver-hu` si se ataca la HU completa de una
sola sesión) para convertir cada punto de la sección 2 en código real.
```
