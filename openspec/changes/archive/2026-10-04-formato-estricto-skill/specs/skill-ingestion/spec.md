# Spec Delta

## MODIFIED Requirements

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
