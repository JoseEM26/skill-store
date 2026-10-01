---
name: transcript-processor
description: >-
  Use this skill when the user provides a raw meeting transcript, chat history,
  or audio transcription. It corrects technical terminology, categorizes topics
  by User Story (HU) and Area, and separates Completed work, Pending work, and
  Decisions requiring third-party/PO approval.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/Aybar-Corp/Skill-store'
---

# Transcript Processor & Multi-HU Optimizer Skill

This skill guides the agent in processing raw meeting transcripts, conversational audios, or chat logs into highly structured, actionable markdown files. It breaks down complex discussions by User Story (HU), domain area, and status (Done, Pending, Third-Party Decisions).

## Naming Convention Rule
Always save the processed output file in the target directory using the format:  
`[YYYY-MM-DD]-acta-[nombre-descriptivo-corto].md`  
Where `[YYYY-MM-DD]` is the date identified in the transcript (or the current session date if not explicitly stated), and `[nombre-descriptivo-corto]` summarizes the core topic of the meeting.
0. **Filter Out Irrelevant Content (nuevo, 07/09/2026 — encontrado al usar la skill en una transcripción real):** A raw transcript mixes real project decisions with personal chatter (courses, PC/hardware talk, someone's calendar, unrelated projects). Before doing anything else, silently exclude anything that maps to no HU, no área, and no pending decision — do not summarize it "just in case", and do not ask the user whether to keep it unless it is genuinely ambiguous whether something is project-relevant. Add one short scope note at the top of the acta naming what kind of content was excluded (not a full transcript of it) so the reader knows the omission was deliberate, not a miss.
1. **Technical Correction:** Fix spelling, terminology (e.g., SLIN, ASBANC, Cavali), and syntax.
2. **Multi-HU Segmentation:** Group discussions by explicit HU (e.g., HU-01, HU-14, HU-26) when multiple features are mentioned.
3. **Strict Status Breakdown:** Categorize every action item into:
   - ✅ **Lo Hecho:** Implementations or decisions already completed.
   - 🛠️ **Lo Faltante:** Technical tasks that remain to be coded.
   - ❓ **Pendiente de Decisión (PO / Terceros / Área):** Gaps that require clarification from Rosario (PO), Pedro, Backoffice, Legal, o Comunicaciones.
4. **Area Mapping:** Categorize impacts by business domain (Portal Cliente, Backoffice, Integración SLIN, Comunicaciones/Mailing).
5. **Classify Scope Per HU (feeds `requirements-analyst` and `nexora-planner` downstream — decide it HERE, from what the PO actually described, not later from a shorter doc):** For each HU, answer two yes/no questions straight from what was said in the meeting:
   - Does it need a new table/column or any schema change? → if yes, `db-designer` runs later.
   - Does it touch more than one architectural layer/component (not just one function or one screen's copy)? → if yes, `architecture-planner` runs later.
   Tag the HU with exactly one classification:
   - 🐛 **Bugfix puntual** (both no) — later skills skip `db-designer`/`architecture-planner` entirely for this HU.
   - 🔧 **Cambio chico** (one yes) — only the skill the "yes" requires runs.
   - 🏗️ **HU compleja** (both yes, or genuinely unclear from what was said) — full pipeline.
   If the meeting didn't give enough detail to answer confidently, default to 🏗️ and say why in the HU's own section — never guess down to save downstream work.

---

## Output Template Structure (`acta-reunion-[Fecha].md`)

```markdown
# 📝 Acta de Reunión: [Título Principal de la Sesión]

**Fecha:** [Fecha de la reunión]  
**Participantes:** [Listado de participantes, e.g., Rosario (PO), Pedro, Jose Angel]  
**Origen:** [Origen, e.g., Audio WhatsApp, Grabación Meet]  

---

## 1. 🎯 Resumen Ejecutivo
Breve resumen (1 párrafo) de los temas centrales tratados y los objetivos acordados.

---

## 2. 🧩 Desglose por Historias de Usuario (HUs)

### 📌 [HU-XX] — [Título de la HU]
* **Área Afectada:** [e.g., Portal Cliente / Backoffice / Integración SLIN]
* **Estado en la reunión:** [e.g., En progreso / En revisión UX / Pendiente de aprobación]
* **📊 Clasificación de Alcance:** [🐛 Bugfix puntual / 🔧 Cambio chico / 🏗️ HU compleja] — [db-designer: Sí/No] · [architecture-planner: Sí/No]

#### 🟢 Lo Hecho (Completado)
* [Elemento resuelto o funcionalidad ya construida]

#### 🟡 Lo Faltante (Pendiente de Desarrollo)
* [ ] [Tarea técnica concreta por programar]

#### ❓ Pendiente de Decisión (PO / Terceros / Áreas)
> [!IMPORTANT]
> **Requiere definición de:** [Rosario (PO) / Pedro / Comunicaciones / Backoffice]  
> **Pregunta / Punto a decidir:** [Detalle del vacío o decisión pendiente]

---

### 📌 [HU-YY] — [Título de otra HU]
*(Repetir la estructura para cada HU tratada en la reunión)*

---

## 3. 🏢 Tareas Generales por Áreas (Sin HU asignada)
* **Backoffice:** [Acción]
* **Comunicaciones / Mailing:** [Acción]
* **Infraestructura / BD:** [Acción]

---

## 4. 📋 Checklist Consolidado de Próximos Pasos
- [ ] **[Desarrollador / Modulo]:** [Acción prioritaria 1]
- [ ] **[PO / Rosario]:** [Resolver decisión pendiente X]
```
