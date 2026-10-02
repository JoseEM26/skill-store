# skill-ingestion Specification

## Purpose
Define las reglas de validación estricta de archivos `SKILL.md`, control de versionado semántico (SemVer), generación de tags/releases e ingesta automatizada de entidades `Skill` y `SkillVersion` en la base de datos PostgreSQL.

## Requirements

### Requirement: Validación estructural y de frontmatter en SKILL.md
El sistema SHALL validar que cada archivo `SKILL.md` dentro del directorio `skills/` contenga un bloque frontmatter YAML válido con todos los campos obligatorios: `name`, `version`, `description`, `author`, `license` y `repository`.

#### Scenario: SKILL.md con frontmatter válido y completo
- **WHEN** se ejecuta la validación sobre un `SKILL.md` con sintaxis YAML correcta y todos los campos obligatorios presentes
- **THEN** la validación resulta exitosa

#### Scenario: SKILL.md con YAML mal formado o campos faltantes
- **WHEN** se ejecuta la validación sobre un `SKILL.md` con sintaxis YAML rota o con ausencia de campos requeridos (ej. sin `version` o sin `description`)
- **THEN** la validación falla con un mensaje de error descriptivo y el pipeline se detiene antes de cualquier acción posterior

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
