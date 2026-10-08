# Spec Delta

## ADDED Requirements

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
