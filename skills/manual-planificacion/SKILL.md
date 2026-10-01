---
name: manual-planificacion
description: >-
  Use this skill when the user wants to plan a user manual for an ERP module
  before it gets generated — mapping every screen, filter, button, alert and
  user-facing action into a structured outline with the exact screenshot and
  explanation each one needs. Triggers: "planifica el manual de [módulo]",
  "prepara la documentación de [módulo]", "arma el manual de usuario de
  [módulo]".
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/Aybar-Corp/Skill-store'
---

# Manual Planning Skill

Convierte un módulo real del ERP (rutas + componentes Livewire + permisos) en un plan estructurado y verificado del manual de usuario que se va a generar después con `manual-desarrollo`. Esta skill **no escribe el manual ni toma capturas** — solo decide qué va a tener, en qué orden, y qué captura + explicación necesita cada pieza.

## Core Directives

1. **Localizar el módulo real primero:** identificar `routes/erp/<modulo>.php`, los componentes Livewire (`Lista`, `Crear`, `Editar`, `Ver`, sub-componentes como Auditoría), los permisos Spatie que los protegen, y las vistas Blade asociadas. Si el módulo vive en una rama que no es la actual (como pasó con Archivamiento en `equipo-a-dev`/`prod`), decirlo explícito y confirmar contra qué rama se está planificando.

2. **Trazabilidad real, nunca inventada:** toda afirmación sobre qué hace una acción, un filtro o una validación va acompañada de `archivo:línea` verificado con `Read`/`Grep` en el momento — igual que el resto de skills de este repo. Si un comportamiento solo se puede confirmar viéndolo correr (ej. un texto de un toast, un estado visual), no se asume: se anota en "Preguntas abiertas / Verificar en vivo".

3. **Granularidad por acción UX (obligatorio, sin excepciones):** cada acción con la que un usuario interactúa —cada botón, cada filtro, cada campo de comentario, cada modal de confirmación, cada alerta/toast (`alertaLivewire`), cada estado de carga, cada fila clickeable, cada paginación— es su propia entrada en el plan, nunca agrupada de forma genérica ("la lista tiene filtros" no alcanza; cada filtro va aparte). Cada entrada debe tener **las dos cosas**:
   - **Captura necesaria:** debe incluir obligatoriamente el formato exacto de tag: `✓ CAPTURA REAL — /ruta/exacta` (en mayúsculas con letras espaciadas y la ruta relativa del ERP), rol/usuario con el que hay que entrar, pasos previos para dejar la pantalla en el estado correcto (ej. "aplicar filtro Estado=Pendiente, luego capturar"), y el nombre de archivo que va a tener esa captura (`NN-<slug>.png`).
   - **Explicación:** qué hace esa acción, con qué datos, qué reglas de validación aplica, qué pasa después (éxito/error), sacada del código real (directiva 2).

   Una entrada sin ambas cosas no está completa — si de verdad no aplica una captura a una entrada (p.ej. un comportamiento puramente interno sin UI o límite técnico del entorno local), decirlo explícito con el motivo real, nunca omitirlo en silencio.

   **Consolidación permitida para reducir cantidad de imágenes (sin perder trazabilidad):** cuando 2 o más filas describen elementos simples que coexisten en la misma franja visual de una sola pantalla ya estable (ej. varios inputs de una misma barra de filtros, varios botones de una misma cabecera), pueden compartir **una sola captura anotada** con marcadores numerados (①②③...) — un recuadro/flecha por elemento, nunca una captura muda. En ese caso, cada fila sigue existiendo por separado (una fila = una explicación), pero todas apuntan al mismo archivo de imagen y el plan lo deja explícito: `Captura compartida con filas N.x, N.y (marcador ②)`. **No consolidar** elementos que disparan su propio estado distinto de pantalla (un modal, una alerta de éxito/error, un estado de carga, una fila de datos específica, un resultado de búsqueda): esos siempre llevan su captura propia.

4. **Filtros, uno por uno:** para cada filtro del listado, leer la propiedad/método real del componente Livewire (ej. `updatedFiltroEstado()`, el `where`/`scope` que dispara) y describir exactamente qué campo consulta, qué valores acepta y si se combina con otros filtros. Cada filtro es una entrada de la directiva 3, no una línea suelta en un párrafo.

5. **Orden final del manual y Lista de Estados:** proponer el índice de secciones en el orden en que un usuario real recorrería el módulo (típicamente: Acceso/permisos → Lista → Filtros → Crear/Subir evidencia → Comentarios → Editar → Ver/Detalle → Alertas → Auditoría). **Obligatorio:** evaluar si el módulo analizado maneja estados de ciclo de vida o badges de colores (ej. en tablas, filtros o transiciones de flujo como Solicitudes, Tickets, Constancias); si es así, el plan DEBE incluir obligatoriamente una sección final de **Lista de estados** que mapee cada estado a su píldora semántica y significado operativo para la plantilla visual. Opcionalmente, proponer también una sección de **Preguntas frecuentes** para dudas operativas comunes.

6. **Preguntas abiertas explícitas:** todo lo que no se pudo determinar leyendo código (copys que solo aparecen en runtime, comportamiento condicional no evidente, permisos que dependen de seeds) va en una lista aparte al final del plan — nunca se adivina ni se deja fuera sin avisar.

7. **Gate de aprobación humana:** el plan termina pidiendo aprobación explícita antes de que `manual-desarrollo` pueda usarlo. No se avanza a generación en el mismo turno salvo que el usuario ya haya dicho que apruebe todo de una vez.

8. **Cobertura exhaustiva de TODA la funcionalidad (obligatorio, checklist antes de cerrar el plan):** "cubrir lo principal" no alcanza. Antes de dar el plan por completo, enumerar todos los métodos públicos y bindings de interacción del/de los componente(s) del módulo (`wire:click`, `wire:model`, `wire:submit`, rutas de `Route::get/post`, botones y acciones de los exports/imports) y cruzarlos uno por uno contra las filas de la directiva 3. Si un método, botón o ruta del código real no tiene su fila correspondiente, se agrega antes de cerrar — nunca se entrega un plan que documente solo una selección representativa. Este cruce (lista de métodos/bindings encontrados vs. filas del plan) se deja explícito al final de cada sección, no solo mencionado de pasada.

## Output Template (`docs/MANUALES/<modulo>/PLAN-MANUAL-<MODULO>.md`)

```markdown
# Plan de Manual: [Nombre del Módulo]

**Rama analizada:** [nombre de rama / worktree]
**Rutas base:** `routes/erp/<modulo>.php`
**Componentes Livewire:** [lista con paths]
**Permisos involucrados:** [modulo-x.ver, accion.crear, ...]
**Fecha de planificación:** [YYYY-MM-DD]

## Índice de secciones
1. [Sección 1]
2. [Sección 2]
...
N. [Lista de estados (si el módulo posee badges/estados de color)]
N+1. [Preguntas frecuentes (opcional)]

## Sección N: [Título]
**Propósito:** [para qué sirve esta parte del módulo, en 1-2 frases]
**Referencias de código:** [archivo:línea, archivo:línea, ...]

| # | Acción UX | Captura necesaria (Tag · URL · rol · pasos previos · archivo) | Explicación (con base en código) |
|---|-----------|----------------------------------------------------------------|-----------------------------------|
| N.1 | [ej. Aplicar filtro "Estado"] | `✓ CAPTURA REAL — /erp/<modulo>` · rol: [x] · pasos: [...] · archivo: `NN-<slug>.png` | [qué hace, archivo:línea] |
| N.2 | [ej. Botón "Subir voucher"] | `✓ CAPTURA REAL — /erp/<modulo>/crear` · rol: [x] · pasos: [...] · archivo: `NN-<slug>.png` | ... |

*(una fila por cada acción real, sin agrupar)*

**Cruce de cobertura de esta sección:** [lista de todos los `wire:click`/`wire:model`/`wire:submit`/rutas encontrados en el componente] → [cada uno mapeado a su fila N.x, o marcado como excluido con motivo]

## Sección: Lista de estados (Obligatoria si el módulo maneja estados)
**Propósito:** Mapeo exhaustivo de cada estado del módulo a su píldora semántica y significado operativo.

| Estado | Color/Badge semántico | Disparador en código (Enum / Estado) | Significado para el usuario |
|---|---|---|---|
| [ej. Pendiente] | [ej. Amarillo / Mostaza] | `EstadoEnum::PENDIENTE` (`Model.php:12`) | [explicación] |

## Preguntas abiertas / Verificar en vivo
- [ítem 1, con el motivo por el que no se pudo confirmar leyendo código]

## Aprobación
- [ ] El usuario revisó el índice y las acciones listadas.
- [ ] Se verificó la cobertura exhaustiva (directiva 8): ninguna acción/método/ruta del código quedó fuera del plan.
- [ ] Se incluyó la sección de Lista de estados si el módulo maneja badges o estados de flujo.
- [ ] El usuario aprueba pasar a `manual-desarrollo` con este plan.
```
