# skill-ingestion Specification

## Purpose
Define las reglas de validación estricta de archivos `SKILL.md`, control de versionado semántico (SemVer), generación de tags/releases e ingesta automatizada de entidades `Skill` y `SkillVersion` en la base de datos PostgreSQL.

## Requirements

### Requirement: Validación estructural y de frontmatter en SKILL.md
El sistema SHALL validar que cada `SKILL.md` contenga un bloque frontmatter YAML válido con los
campos obligatorios `name`, `description`, `license`, `compatibility`, `metadata.version` (SemVer)
y `metadata.author`, Y que el cuerpo del documento contenga, en este orden, las 6 secciones
obligatorias como headings `## N. <Título>`: "1. Propósito y Cuándo Usar", "2. Flujo de Trabajo
(Workflow)", "3. Reglas y Restricciones (Criterios de Diseño)", "4. Árbol de Decisión (Si aplica)",
"5. Ejemplos Ejecutables", "6. Manejo de Errores y Casos Excepcionales". Este mismo validador SHALL
usarse igual desde la ingesta de GitHub Action, el panel admin y la tool MCP `publish_skill` cuando
reciba contenido.

#### Scenario: SKILL.md con frontmatter válido y completo
- **WHEN** se valida un `SKILL.md` con el frontmatter completo (`name`, `description`, `license`,
  `compatibility`, `metadata.version`, `metadata.author`) y las 6 secciones del body presentes en
  orden
- **THEN** la validación resulta exitosa

#### Scenario: SKILL.md con YAML mal formado o campos faltantes
- **WHEN** se ejecuta la validación sobre un `SKILL.md` con sintaxis YAML rota, o que usa el schema
  anterior (`version`/`author` sueltos en vez de `metadata.version`/`metadata.author`, o sin
  `compatibility`)
- **THEN** la validación falla con un mensaje descriptivo señalando los campos faltantes y el
  pipeline se detiene antes de cualquier acción posterior

#### Scenario: Frontmatter válido pero falta una sección obligatoria del body
- **WHEN** se valida un `SKILL.md` con frontmatter correcto pero al que le falta alguna de las 6
  secciones obligatorias (por ejemplo, no tiene "## 6. Manejo de Errores y Casos Excepcionales")
- **THEN** la validación falla señalando qué sección falta, sin ingestar el archivo

#### Scenario: Secciones del body fuera de orden
- **WHEN** se valida un `SKILL.md` con las 6 secciones presentes pero en un orden distinto al
  especificado
- **THEN** la validación falla señalando el problema de orden

### Requirement: Validación de Semantic Versioning (SemVer)
El sistema SHALL verificar que el campo `version` de cada `SKILL.md` cumpla estrictamente con la especificación SemVer (SemVer 2.0.0) y sea estrictamente superior a la versión previa registrada para la misma skill.

#### Scenario: Versión SemVer válida con incremento correcto
- **WHEN** se valida una actualización de skill cuya versión cumple formato SemVer y es mayor que la versión actual registrada en la base de datos o en los tags de git
- **THEN** la verificación de versionado resulta exitosa

#### Scenario: Versión inválida o sin incremento
- **WHEN** se intenta publicar una versión que no cumple formato SemVer (ej. `v1`, `beta-1` sin número base) o cuya versión es menor o igual a una ya publicada para esa skill
- **THEN** la validación falla y rechaza la publicación

### Requirement: Ingesta de Skill y SkillVersion en PostgreSQL
El sistema SHALL parsear los metadatos de los `SKILL.md` validados y persistir o actualizar el
registro en la tabla `Skill` e insertar el nuevo registro en la tabla `SkillVersion` en la base de
datos PostgreSQL local, incluyendo el contenido completo de cada archivo del directorio de la
skill (no solo el frontmatter parseado).

#### Scenario: Ingesta de una nueva skill
- **WHEN** se ejecuta la ingesta de una skill válida que no existe previamente en la base de datos
- **THEN** el sistema crea el registro `Skill` asociado al usuario dueño correspondiente, crea el
  primer registro en `SkillVersion`, y guarda el contenido completo de cada archivo del directorio
  de la skill (ruta relativa → contenido)

#### Scenario: Ingesta de una nueva versión de una skill existente
- **WHEN** se ejecuta la ingesta de una nueva versión de una skill ya registrada
- **THEN** el sistema actualiza los campos modificados de `Skill` (como `description`, `license`,
  `repositoryUrl`) e inserta una nueva fila en `SkillVersion` con el contenido completo de los
  archivos de esa versión, preservando intactas las versiones anteriores

#### Scenario: Skill con archivos adicionales a SKILL.md
- **WHEN** se ingiere una skill cuyo directorio contiene, además de `SKILL.md`, otros archivos
  (por ejemplo una plantilla HTML)
- **THEN** el contenido de todos esos archivos adicionales queda guardado junto al de `SKILL.md`,
  cada uno bajo su ruta relativa dentro del directorio de la skill

### Requirement: Publicación de Tag y Release en Git
El sistema SHALL generar el git tag correspondiente al publicar una nueva versión de skill en la rama principal.

#### Scenario: Creación de tag al publicar
- **WHEN** se procesa exitosamente una nueva versión de skill en la rama principal
- **THEN** se crea el tag de git correspondiente con el identificador y versión de la skill

### Requirement: Filtro heurístico de prompt injection en el contenido de una skill
El sistema SHALL rechazar la publicación de una skill (por ingesta de GitHub Action, panel o
`publish_skill` vía MCP) cuyo contenido contenga patrones heurísticos asociados a prompt
injection: frases de anulación de instrucciones, instrucciones explícitas de exfiltrar secretos o
variables de entorno, comandos destructivos de shell literales, caracteres Unicode invisibles, o
bloques de texto codificado en base64 sospechosamente largos. Este filtro SHALL aplicarse igual en
los tres caminos de publicación, como parte del mismo validador compartido que ya aplica el
formato estricto de frontmatter/estructura (ADR-0014).

#### Scenario: Contenido con frase de anulación de instrucciones
- **WHEN** se valida un contenido de skill que incluye una frase como "ignora las instrucciones
  anteriores" o equivalente
- **THEN** la validación falla, señalando que el contenido fue rechazado por contener un patrón de
  riesgo, sin publicarse

#### Scenario: Contenido con instrucción de exfiltrar variables de entorno
- **WHEN** se valida un contenido de skill que instruye explícitamente mostrar o enviar el valor de
  variables de entorno o secretos
- **THEN** la validación falla de la misma manera

#### Scenario: Contenido con Unicode invisible
- **WHEN** se valida un contenido de skill que contiene caracteres Unicode de ancho cero o
  invisibles (usados típicamente para ocultar texto)
- **THEN** la validación falla de la misma manera

#### Scenario: Contenido legítimo sin patrones de riesgo
- **WHEN** se valida un contenido de skill que cumple el formato estricto y no contiene ninguno de
  los patrones de riesgo
- **THEN** la validación resulta exitosa, igual que antes de este cambio
