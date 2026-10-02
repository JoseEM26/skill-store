# Spec Delta

## MODIFIED Requirements

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
