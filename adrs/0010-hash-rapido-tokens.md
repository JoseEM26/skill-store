# ADR 0010: Hash rápido para tokens de acceso (reemplaza bcrypt/argon2 del PRD)

## Estado

Aceptado

## Contexto

El PRD (Stack técnico) especificaba bcrypt/argon2 para hashear los tokens de acceso al MCP, "como
un PAT de GitHub". bcrypt/argon2 están diseñados deliberadamente para ser lentos, porque protegen
contraseñas de baja entropía elegidas por humanos frente a ataques de fuerza bruta. Un token de
acceso de este sistema es un secreto aleatorio de alta entropía generado por el propio backend, no
una contraseña — no necesita esa resistencia, y sí se valida en cada llamada MCP y cada request de
API autenticado, justo en la ruta que el propio TECH-DESIGN ya marca como en riesgo por los límites
de duración de funciones serverless de Vercel.

## Decisión

Los tokens de acceso se hashean con SHA-256 (u otro hash criptográfico rápido) antes de guardarse,
buscados por índice único sobre el hash. Reemplaza la elección de bcrypt/argon2 del PRD para este
caso específico.

## Alternativas consideradas

- **bcrypt/argon2 (como decía el PRD)** — mismo estándar que un PAT de GitHub en apariencia, pero
  GitHub y Stripe de hecho usan hashes rápidos para sus tokens de alta entropía, no bcrypt/argon2;
  aplicarlo aquí agrega decenas o cientos de ms por invocación sin ganar protección real adicional,
  justo en la ruta MCP ya identificada como sensible a límites de tiempo de ejecución.

## Consecuencias

- Validación de token prácticamente instantánea en cada llamada MCP/API, sin sumar latencia
  artificial a una ruta ya marcada como riesgo de duración serverless.
- Una fuga de la base de datos sigue sin exponer el token en texto plano (el objetivo original de
  hashear se mantiene) — pero, a diferencia de bcrypt/argon2, un atacante con la base filtrada y
  capacidad de cómputo masivo podría intentar fuerza bruta más rápido por hash; se acepta porque el
  espacio de búsqueda de un token aleatorio de alta entropía ya lo hace inviable en la práctica, algo
  que no aplica a una contraseña humana de baja entropía.
