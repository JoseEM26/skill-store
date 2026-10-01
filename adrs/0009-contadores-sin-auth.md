# ADR 0009: Contadores de popularidad como excepción a la regla de escritura

## Estado

Aceptado

## Contexto

El PRD (Seguridad transversal) exige que toda escritura tenga token válido + scope correcto + ser
dueño del recurso, las tres condiciones. Pero el propio PRD pide contadores automáticos
(`downloadsCount`, `installsCount`) que se incrementan con el botón público "Descargar" en la web
(sin login) y al ejecutar el comando de instalación vía MCP o CLI de cualquier usuario, no solo del
dueño de la skill — una escritura literal sobre un recurso ajeno, sin token ni dueño, que contradice
la regla de las tres condiciones si se aplica sin excepción. ADR-0007 ya define un mecanismo de
rate limiting básico por IP en endpoints públicos.

## Decisión

Los endpoints de incrementar `downloadsCount`/`installsCount` son públicos, sin autenticación ni
verificación de dueño — se tratan como una excepción explícita a la regla de las tres condiciones,
porque no modifican el recurso en sí (nombre, descripción, versión, etc.), solo un contador
agregado. Quedan protegidos únicamente por el rate limiting general por IP ya definido en ADR-0007.

## Alternativas consideradas

- **Deduplicación adicional por IP/sesión anónima** (ej. "1 conteo por IP cada X minutos" específico
  para esta ruta, además del rate limiting general) — reduciría más la inflación del contador por
  clicks repetidos, pero suma una segunda capa de lógica de conteo sobre la misma tabla de
  rate limiting para un caso de abuso que el rate limiting general ya mitiga razonablemente.

## Consecuencias

- El "botón Descargar" público y el comando de instalación vía MCP funcionan sin fricción de login,
  tal como el PRD los describe.
- Un atacante que rote de IP puede seguir inflando o intentando manipular los contadores dentro de
  los límites del rate limiting general — no hay garantía criptográfica de que un conteo represente
  una instalación real. Aceptado porque son contadores informativos ("no reseñas ni calificación"),
  no una señal de confianza crítica del sistema.
