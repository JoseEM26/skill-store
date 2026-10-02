---
name: work-unit-commits
description: >-
  Use this skill to generate a daily work log (in English) summarizing the
  commits and technical work done in the current session — distinct from the
  global `work-unit-commits` skill, which plans how to split changes into
  commits/PRs. This one documents what was already committed, after the fact.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/JoseEM26/skill-store'
---

# Work Unit Commits — Daily Log Generator

> ⚠️ **Recreado de memoria, con muy poca base** (05/09/2026, tras la pérdida del original) — de esta skill solo se sabía que "no era duplicado del global (que planifica cómo dividir commits) — es un generador de bitácora diaria en inglés". No tengo memorizado el cuerpo real ni su formato de salida exacto. Esta versión es una reconstrucción razonable, no una recuperación — es la que menos confianza tiene de las 8. Si la usás y algo no encaja con lo que recordabas, decímelo para ajustarla o para que la reescribamos juntos desde cero en vez de confiar en esta.

## Cuándo corre esta skill
Al final de una sesión de trabajo (o de un bloque de commits relacionados), cuando el usuario pide un resumen de lo que se hizo — en inglés, a diferencia del resto de la documentación del proyecto que es en español.

## Qué hace (mejor esfuerzo, sin el formato original confirmado)

1. Lee los commits reales de la sesión (`git log`, rango acordado con el usuario — nunca inventar un rango).
2. Por cada commit, resume en una línea en inglés: qué cambió y por qué, sin repetir el mensaje del commit palabra por palabra si ya es autoexplicativo.
3. Agrupa por tema/módulo si hay varios commits relacionados, en vez de listarlos sueltos uno por uno sin conexión.
4. No inventa horas ni estimaciones — si el usuario las quiere, se las pide explícitamente (mismo criterio que `nexora-planner`: nunca una cifra que el agente decide solo).

## Diferencia con el `work-unit-commits` global
El skill global (de `~/.claude/skills/`) decide **antes de commitear** cómo partir un cambio grande en unidades revisables. Este es **después**: documenta lo que ya se commiteó, como bitácora diaria en inglés — no reemplaza al global, lo complementa en el momento opuesto del flujo.
