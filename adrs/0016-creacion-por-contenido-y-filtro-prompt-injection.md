# ADR 0016: Creación de skill por contenido completo + filtro heurístico de prompt injection

## Estado

Aceptado (implementado como ítem #20 del backlog)

## Contexto

Hoy, crear una skill nueva desde el panel (`/admin/skills`) obliga a pasar primero por un
formulario de metadata suelta (`slug`, `name`, `description`, `license`, `repositoryUrl`); recién
una vez creada la skill se puede cambiar a "pegar el `.md` completo" (`handleSubmitContent` tiene
`if (!initialData?.id) return;`, bloqueando ese camino para la creación). Esto es incoherente con
ADR-0014 (formato estricto): el frontmatter ya trae `name`/`description`/`license`, y
`repositoryUrl` ni siquiera es parte del frontmatter obligatorio — pedirlo como paso bloqueante de
creación es fricción innecesaria.

Además, una skill es literalmente un conjunto de instrucciones que un agente de IA va a leer y
seguir al instalarla — en un registro de comunidad, esto es una superficie real de **prompt
injection**: alguien podría publicar una skill con instrucciones maliciosas ocultas (exfiltrar
variables de entorno, ejecutar comandos destructivos, intentar anular las instrucciones del
sistema del agente que la instale).

## Decisión

1. **Pegar el `.md` completo pasa a ser la forma principal de crear una skill nueva**, no solo de
   editar una existente. El panel valida el contenido con el mismo `parseSkillMarkdown` ya
   compartido (ADR-0014), deriva `name`/`slug`/`description`/`license` del frontmatter, y crea la
   `Skill` + `SkillVersion` en un solo paso (mismo patrón ya usado por `updateUserSkillContent`,
   extendido a creación).
2. **`repositoryUrl` deja de ser un campo bloqueante del flujo de creación** — sigue existiendo
   como campo opcional de `Skill` (para el link "Ver en GitHub"), seteable aparte, nunca parte del
   frontmatter obligatorio.
3. **Filtro heurístico de prompt injection**, integrado al validador compartido
   (`src/lib/skills/validation.ts`), aplicado en los tres caminos de publicación (ingesta de
   GitHub Action, panel, `publish_skill` vía MCP) — mismo punto único de verdad que ya usa
   ADR-0014 para frontmatter/estructura. Rechaza contenido que contenga, con una heurística de
   patrones (no un modelo de IA):
   - Frases de anulación de instrucciones ("ignora las instrucciones anteriores", "ignore previous
     instructions", "disregard the above", "you are now", variantes en español/inglés).
   - Instrucciones explícitas de exfiltrar secretos/variables de entorno (`.env`, `process.env`,
     `AUTH_SECRET`, `API_KEY`, etc. combinadas con verbos como "enviar", "mostrar", "imprimir").
   - Comandos de shell destructivos literales en el texto (`rm -rf`, `DROP TABLE`, `:(){:|:&};:`).
   - Caracteres Unicode invisibles/zero-width (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`, etc. —
     técnica clásica para ocultar texto).
   - Bloques de texto codificados en base64 sospechosamente largos sin justificación de código.
   Si se detecta alguno, la publicación se rechaza con un mensaje que señala qué patrón disparó el
   rechazo (sin revelar el detalle exacto de la regla, para no facilitar evadirla trivialmente).

## Alternativas consideradas

- **Revisión con LLM (mandar el contenido a un modelo para clasificar)** — se descarta para esta
  versión: más robusta contra ataques nuevos, pero agrega costo por publicación, latencia, y una
  dependencia externa con su propio modo de falla (qué pasa si la llamada falla o tarda). Queda
  como mejora futura si el filtro heurístico resulta insuficiente en la práctica.
- **Cola de moderación manual antes de publicar** — se descarta: no escala para el ritmo de
  desarrollo del proyecto (greenfield, equipo de una persona) y añade fricción a cada publicación.
- **No filtrar nada y confiar en que el usuario que instala revise el contenido** — se descarta:
  es la situación actual, y no resuelve el problema real (la mayoría de los usuarios van a
  instalar sin leer línea por línea).

## Consecuencias

- El filtro heurístico puede tener falsos positivos (ej. una skill que legítimamente necesite
  mencionar `rm -rf` en un ejemplo de qué NO hacer) — se acepta el riesgo, el mensaje de rechazo
  debe ser claro para que el usuario pueda ajustar su contenido si fue un falso positivo.
  Si en la práctica genera demasiada fricción, se revisará (ver Alternativas).
- No reemplaza ninguna otra medida de seguridad existente (ownership, visibilidad, tokens) — es
  una capa adicional específica sobre el *contenido* de la skill.
- Las 13 skills de ejemplo y cualquier skill ya publicada no se re-validan retroactivamente (mismo
  criterio que ADR-0013/0014: aplica solo a publicaciones nuevas).
