# Spec Delta

## ADDED Requirements

### Requirement: Contenido completo de cada versión de skill
El sistema SHALL almacenar el contenido completo de cada archivo de una skill (ruta relativa →
contenido) junto a su `SkillVersion`, de forma que una versión publicada sea recuperable sin
depender de que el repositorio de origen siga disponible.

#### Scenario: Skill con un solo archivo
- **WHEN** se publica una versión de una skill cuyo único archivo es `SKILL.md`
- **THEN** el contenido completo de `SKILL.md` queda guardado junto a esa `SkillVersion`

#### Scenario: Skill con archivos adicionales
- **WHEN** se publica una versión de una skill que incluye archivos adicionales además de
  `SKILL.md` (por ejemplo una plantilla)
- **THEN** el contenido de cada archivo adicional también queda guardado, asociado a su ruta
  relativa dentro del directorio de la skill
