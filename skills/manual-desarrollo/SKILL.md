---
name: manual-desarrollo
description: >-
  Use this skill when an approved PLAN-MANUAL-<MODULO>.md from
  manual-planificacion already exists and the user wants the final user manual
  generated, with real screenshots of the running app. Triggers: "genera el
  manual de [módulo]", "ejecuta el plan del manual", "arma el manual final de
  [módulo]".
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/Aybar-Corp/Skill-store'
---

# Manual Generation Skill

Ejecuta un `PLAN-MANUAL-<MODULO>.md` ya aprobado (salida de `manual-planificacion`) y produce el manual de usuario final, con capturas reales tomadas por Antigravity y el PDF final para compartir.

**REQUIRED SUB-SKILL:** usa `herdr-antigravity-multiagent` para delegar la toma de capturas — este skill no tiene navegador propio.

## Core Directives

1. **No corre sin plan aprobado:** si no existe `docs/MANUALES/<modulo>/PLAN-MANUAL-<MODULO>.md` con el checklist de aprobación marcado, no generar nada — pedir primero que se corra `manual-planificacion` o que se confirme la aprobación pendiente.

2. **Reusar hechos, no re-derivarlos — pero traducidos a lenguaje 100% de usuario final, nunca técnico.** El plan aprobado (columna "Explicación" + referencias `archivo:línea`) es la fuente de verdad del COMPORTAMIENTO — de ahí sale qué hace cada acción, nunca se vuelve a leer el código para reinterpretarlo. Pero ese comportamiento se **reescribe en prosa llana dirigida a quien usa el ERP día a día** (un asesor, un supervisor), no a un desarrollador. El manual final **nunca** contiene: nombres de archivo, números de línea, nombres de clase o método (`ConstanciaLista.php`, `eliminarConstancia()`, `ConstanciaExport::headings()`), atributos de código (`wire:click`, `wire:model`, `$this->authorize(...)`), nombres de tabla/columna de base de datos, ni jerga de programación en general. Se describe qué ve el usuario, qué hace al hacer clic, qué reglas de negocio debe conocer y qué pasa después — como si se lo explicaras a alguien que jamás abrió el código.

   *Ejemplo de traducción correcta:*
   - ❌ Técnico (nunca así en el manual): "Botón verde con `wire:click=\"exportExcelFiltro\"` (`constancia-lista.blade.php:99-101`). El método `exportExcelFiltro()` (`ConstanciaLista.php:90-103`) verifica `$this->authorize('constancia.exportar-filtro')`, compila los filtros activos y retorna `Excel::download(new ConstanciaExport($filtros), ...)`."
   - ✅ Para el usuario (así sí): "Descarga en un archivo Excel todas las constancias que coincidan con los filtros que tengas aplicados en ese momento — si no aplicaste ningún filtro, descarga el listado completo tal como se ve en pantalla. Solo lo pueden usar los usuarios con permiso para exportar."

   La trazabilidad técnica (`archivo:línea`) sigue viviendo en `PLAN-MANUAL-<MODULO>.md` — es la evidencia interna de que no se inventó nada, y ahí sí se conserva. Pero jamás se copia al `MANUAL-<MODULO>.md` final.

3. **Armar la lista de capturas pendientes:** tomar la columna "Captura necesaria" de cada fila del plan (URL, rol, pasos previos, nombre de archivo) y convertirla en una tarea autocontenida para un agente `agy` — incluir la URL base de la app corriendo (confirmar con el usuario cuál instancia usar si hay más de un worktree/pane corriendo, ver `herdr-antigravity-multiagent`).

4. **Delegar la toma de capturas a Antigravity vía Herdr:** invocar `herdr-antigravity-multiagent` con esa lista completa de capturas (una por acción UX, en el orden del plan), pidiendo que cada archivo se guarde en `docs/MANUALES/<modulo>/capturas/<nombre-exacto-del-plan>.png`.

5. **Verificación independiente (obligatoria, sin excepciones):** cuando el agente reporte terminado, **no confiar en el "listo"** — listar `docs/MANUALES/<modulo>/capturas/` y confirmar que cada archivo esperado por el plan existe de verdad, con tamaño > 0. Esto hereda la regla ya establecida en `herdr-antigravity-multiagent`: un estado idle/done del agente no certifica que el resultado sea correcto.

6. **Captura faltante ⇒ placeholder explícito, nunca texto huérfano:** si una captura no se pudo tomar (falló la navegación, el elemento no apareció, etc.), esa sección del manual lleva `[CAPTURA PENDIENTE: <motivo real>]` en el lugar de la imagen — nunca se publica una explicación de una acción UX sin su imagen ni se inventa que sí existe.

7. **Ensamblado 1:1 con el plan:** el manual final tiene las mismas secciones y el mismo orden que el plan aprobado; cada acción UX se muestra como el par **captura + explicación**, nunca solo texto para algo que el plan marcó como necesitando imagen.

8. **Señalización obligatoria del elemento (nunca una captura muda):** antes de tomar cualquier captura, resaltar visualmente el elemento exacto que esa fila describe — inyectar un estilo de contorno/resaltado (ej. `outline: 3px solid #EF4444; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(239,68,68,.18)`) sobre el DOM element correspondiente antes del screenshot, o dibujar un marcador numerado (①②③) si la captura es compartida entre varias filas (ver la Directiva de consolidación de `manual-planificacion`). Una captura de pantalla completa sin ninguna indicación de qué mirar no es válida — se rechaza y se rehace.

9. **Datos personales reales: permitidos en la imagen, prohibidos en el texto.** Cuando la captura se toma contra una base de datos con datos reales (DNI, nombre completo, correo de un cliente real), la IMAGEN puede mostrarlos tal cual — es una captura fiel de la app corriendo, no se maquilla. Pero el TEXTO del manual (`MANUAL-<MODULO>.md`, `.html`, captions, explicaciones, y `PLAN-MANUAL-<MODULO>.md`) **nunca** transcribe ese DNI/nombre/correo real en prosa — se reemplaza por un dato sintético genérico (`DNI de ejemplo`, `Cliente de prueba`, `Empresa/Proyecto de ejemplo`) o se describe el campo sin repetir el valor (`el DNI ingresado por el usuario`). Esto sigue la regla del proyecto (`CLAUDE.md`: "Nunca hardcodear un DNI, nombre completo o correo real... en documentación") — nace de un hallazgo de QA real que costó purgar todo el historial de git.

10. **Esperar estado estable antes de capturar (nunca un "Cargando..." por accidente):** si la pantalla depende de una respuesta asíncrona (petición Livewire, llamada a SLIN, carga diferida de un modal), esperar explícitamente a que el overlay/spinner desaparezca y el contenido final esté renderizado antes de tomar la captura. Solo se captura un estado de carga cuando la fila del plan pide mostrar justamente eso (ej. "overlay cargando filtros") — en cualquier otro caso, un spinner o un "Cargando..." en la imagen final es un defecto, no un resultado válido.

11. **Estilo visual obligatorio (Plantilla HTML y Sistema de Diseño) — el HTML es solo un paso intermedio, nunca un entregable:** para lograr que el PDF final tenga el diseño correcto, se renderiza un HTML temporal usando `.claude/skills/manual-desarrollo/plantilla-visual.html` como base y se convierte ese HTML a PDF con Chromium/Puppeteer — pero ese `.html` intermedio **no se entrega ni se deja como archivo final** junto al manual (se genera en un directorio de trabajo temporal y se descarta, o se sobreescribe en cada corrida). El usuario solo pidió `.md` (fuente) y `.pdf` (entregable) — nunca generar ni conservar un `MANUAL-<MODULO>.html` como salida del manual. Se deben aplicar las siguientes directrices visuales y de estructura al construir ese HTML temporal:
   - **Tipografía:** `Sora` (Google Fonts, pesos 600, 700) para el título de portada, cabeceras de sección y números de badge; `IBM Plex Sans` (pesos 400, 500, 600) para textos descriptivos y subtítulos; `IBM Plex Mono` para códigos, rutas y tags técnicos.
   - **Paleta de Colores:** Portada verde-petróleo oscuro (`#033744`, píldoras `#184954`, píldora superior con bullet `#205560`), fondo de lienzo `#F4F7F6`, tarjetas de contenido blancas con bordes redondeados (24px) y sombra suave.
   - **Badges de Sección vs Pasos:** Círculo de número de sección en menta pálido (`#E3EDEE` con número en `#033A45`); listas de pasos numerados en círculos color durazno (`#FDECE0` con número marrón-naranja `#C2410C`).
   - **Cajas de Aviso:** Tips en fondo menta-gris (`#E3EDEE`, borde `#D8E4E1`, icono 💡); advertencias en fondo durazno (`#FDECE0`, borde `#FDEADE`, icono ⚠️ y textos en negrita `#A3540A`).
   - **Tag de Captura Real:** Antes de cada captura real, incluir el tag píldora verde `✓ CAPTURA REAL — /ruta/exacta` (`#E3F3E8` con texto `#15803D` en mayúsculas espaciadas), la imagen dentro del frame con esquinas redondeadas y borde `#E9EDF1`, y debajo el caption centrado en cursiva `#55716D`.
   - **Ilustraciones conceptuales:** Si se explican diagramas o selectores esquemáticos sin captura real, utilizar el mini-frame estilo ventana Mac (barra `#DDE9E6`, botones rojo `#EF7373`, amarillo `#ECC16B`, verde `#74C58C`, cuerpo `#EAF1EF`).
   - **Sección 'Lista de estados' (Obligatoria si el módulo maneja estados):** Si el módulo posee flujos con estados o badges de color, incluir al final una sección con un grid de 2 columnas de tarjetas con sus píldoras semánticas (`Nuevo` en azul `#E5F2FD`/#`2196F3`, `En Gestión` en amarillo/mostaza `#F6ECD9`/#`A16207`, `En Espera Cliente` en durazno `#FDECE0`/#`C2410C`, `Derivado` en gris-menta `#EAF6F4`/#`55716D`, `Cerrado`/`Completada` en verde `#EAF6F4`/#`15803D`, `Eliminado`/`Vencida` en rosado `#FBE3EA`/#`D1355C`, `Atendido` en gris `#E9EDF1`/#`64748B`) y su descripción explicativa debajo.
   - **Sección 'Preguntas frecuentes' (FAQ):** Incluir opcionalmente un bloque de preguntas frecuentes al cierre con emoji 🧑💼 por pregunta y respuesta clara.
   - **Footer:** Pie de página centrado en gris `#7C948F` con la nomenclatura: `Manual de Usuario · Módulo de [Nombre] · ERP Aybar Corp`.

12. **Formato final — solo Markdown + PDF (nunca HTML como entregable):** producir únicamente `docs/MANUALES/<modulo>/MANUAL-<MODULO>.md` (fuente estructurada) y `docs/MANUALES/<modulo>/MANUAL-<MODULO>.pdf` (entregable final, con el estilo de `plantilla-visual.html` ya aplicado). El HTML usado para renderizar el PDF es descartable (ver Directiva 11) — si por error queda un `MANUAL-<MODULO>.html` en la carpeta del manual, se borra antes de terminar la tarea.

13. **Gate de aprobación final:** presentar el manual (ruta del `.md` y del `.pdf`) para revisión humana antes de dar la tarea por terminada — no asumir que generado = aprobado.

## Plantilla de renderizado interno (nunca se entrega como `.html`)

Antes de convertir a PDF, el contenido se estructura en el HTML temporal utilizando el sistema de clases de `plantilla-visual.html`:

```html
<div class="page-container">
  <!-- Portada con Hero y Tarjeta TOC -->
  <div class="cover-wrapper">...</div>

  <!-- Secciones 1..N en tarjetas blancas -->
  <div class="section-card">
    <div class="section-header">
      <div class="section-badge">1</div>
      <h2 class="section-title">Nombre de la Sección</h2>
    </div>
    <p class="section-intro">Explicación general...</p>
    
    <!-- Pasos numerados con badges durazno -->
    <ul class="steps-list">
      <li class="step-item"><div class="step-badge">1</div><div class="step-content">...</div></li>
    </ul>

    <!-- Caja Tip o Advertencia -->
    <div class="callout-box callout-tip"><span class="callout-icon">💡</span><div>...</div></div>

    <!-- Bloque de Captura -->
    <div class="capture-block">
      <div class="capture-tag">✓ CAPTURA REAL — /erp/modulo/ruta</div>
      <div class="capture-frame"><img src="capturas/01-nombre.png" alt="..."></div>
      <div class="capture-caption">Descripción de la captura en cursiva</div>
    </div>
  </div>

  <!-- Sección Lista de estados (si aplica) -->
  <div class="section-card">
    <div class="section-header"><div class="section-badge">N</div><h2 class="section-title">Lista de estados</h2></div>
    <div class="status-grid">...</div>
  </div>

  <!-- Preguntas frecuentes (opcional) -->
  <div class="section-card">...</div>

  <footer class="manual-footer">Manual de Usuario · Módulo de [Nombre] · ERP Aybar Corp</footer>
</div>
```

## Quick Reference

| Situación | Acción |
|---|---|
| No hay `PLAN-MANUAL-<MODULO>.md` aprobado | Detener y pedir `manual-planificacion` primero |
| Hay más de una instancia de la app corriendo (varios worktrees) | Confirmar con el usuario cuál URL usar antes de delegar capturas |
| Agy reporta "listo" | Verificar archivos en disco igual — nunca confiar a ciegas |
| Falta una captura tras verificar | `[CAPTURA PENDIENTE: motivo]`, nunca omitir la fila |
| Captura terminada | Debe traer el elemento resaltado (outline/box-shadow) o marcador numerado — nunca una pantalla muda |
| Pantalla con spinner/carga al momento de capturar | Esperar a que resuelva antes de capturar (salvo que la fila pida mostrar justo ese estado) |
| Ensamblado visual | Usar `.claude/skills/manual-desarrollo/plantilla-visual.html` como base de un HTML temporal (descartable) antes de convertir a PDF |
| Módulo con estados o badges | Incluir sección final 'Lista de estados' con grid de 2 columnas de badges semánticos |
| Manual armado | Convertir directo a PDF (nunca dejar un `.html` como entregable), luego pedir aprobación humana |
| Formato final entregado | Solo `.md` + `.pdf` — nunca generar/conservar `MANUAL-<MODULO>.html` |
| Redactando una explicación del manual final | Cero código: nada de `archivo.php:línea`, nombres de clase/método, `wire:click`, nombres de tabla/columna — describir en lenguaje de usuario qué hace la acción y qué debe saber |
