# ADR 0012: Repositorio de la plataforma privado, separado del código de cada skill

## Estado

Aceptado (ya implementado — el repositorio `JoseEM26/skill-store` ya se configuró como privado)

## Contexto

El repositorio `JoseEM26/skill-store` contiene tanto el código fuente de la plataforma (el
monolito Next.js: frontend, API, servidor MCP — ver ADR-0001, ADR-0002) como la carpeta `skills/`
usada para poblar el catálogo durante el desarrollo. Mientras el repo era público, cualquiera que
entrara al catálogo y clickeara "Ver en GitHub" en una skill de ejemplo terminaba viendo —y podía
clonar— el código completo de la plataforma, no solo el de esa skill. El dueño del proyecto no
quiere que el código de la plataforma en sí sea de libre acceso, aunque sí quiere que el registro
funcione como una comunidad abierta donde cualquiera pueda publicar e instalar skills.

El PRD (heredado, ver "Supuestos y riesgos abiertos") ya anticipaba que el dueño de una skill en la
plataforma no tiene por qué ser el dueño del repo real de esa skill — el campo `repository` de cada
skill es independiente del repo de la plataforma. Las 13 skills de ejemplo usadas para probar el
catálogo apuntaban a este mismo repo solo por comodidad al bootstrapear datos de prueba, no porque
el diseño lo exigiera.

## Decisión

- El repositorio de la plataforma (`JoseEM26/skill-store`) pasa a **privado**. Protege el código
  del producto en sí sin afectar el funcionamiento del registro: Vercel sigue desplegando sin
  cambios desde un repo privado (soportado de forma nativa), y el catálogo público sigue
  funcionando igual (lee de Postgres, no del repo de GitHub en tiempo de request).
- El campo `repository` de cada skill publicada por la comunidad debe apuntar al repo propio de su
  dueño — nunca al repo de la plataforma. Cada dueño controla la visibilidad de su propio repo de
  forma completamente independiente de la visibilidad del repo de la plataforma.
- Las 13 skills de ejemplo quedan como dato de demo/desarrollo con un `repository` que ya no es
  navegable públicamente (apunta al repo ahora privado) — queda pendiente decidir si se actualizan,
  se reemplazan por skills reales, o se dejan así por ser contenido interno de prueba (ver PRD.md
  → Historial de cambios).

## Alternativas consideradas

- **Separar en dos repos: uno privado para la plataforma y otro público solo para `skills/`** —
  resolvería el problema de raíz sin dejar ninguna skill de ejemplo con un link roto, pero exige
  migrar el workflow de GitHub Actions (ítem #4, `github-actions-ingesta`) para que lea de un repo
  distinto al del propio deploy, cambio no trivial. Se descarta por ahora; si en el futuro se
  decide mantener skills de ejemplo navegables públicamente, esta es la alternativa a revisar.

## Consecuencias

- El código de la plataforma deja de ser públicamente clonable — resuelve directamente la
  preocupación del dueño.
- El link "Ver en GitHub" de las 13 skills de ejemplo actuales ya no lleva a ningún lado público
  (404 para quien no tenga acceso al repo) hasta que se resuelva qué hacer con ellas.
- Ya no se puede compartir el link del repo libremente para mostrar el código a terceros sin
  invitarlos antes como colaboradores.
