# ADR 0006: Resiliencia / manejo de errores

## Estado

Aceptado

## Contexto

El PRD (casos borde) exige que si la API de GitHub cae o alcanza rate limit, el backend responda
con los últimos datos cacheados en Postgres en vez de fallar toda la petición. Es la única
dependencia externa crítica del sistema, con bajo volumen de tráfico esperado (proyecto de una
sola persona, free tier).

## Decisión

Cada llamada a la API de GitHub se envuelve en un try/catch; si falla o excede rate limit, se sirve
el último dato equivalente guardado en Postgres (ej. release/tag de una skill) en vez de propagar
el error al cliente. Si una skill nunca tuvo un fetch exitoso (recién publicada, sin nada que
cachear todavía) y la llamada falla, se responde con un error explícito ("metadata no disponible
aún") en vez de inventar o mostrar campos vacíos que puedan confundirse con datos válidos.

## Alternativas consideradas

- **Circuit breaker (ej. `opossum`)** — valioso cuando hay llamadas repetidas y frecuentes a una
  dependencia inestable que conviene dejar de golpear por un tiempo; con una sola integración
  externa de bajo volumen, es una dependencia y una capa de complejidad sin beneficio real medible.
- **Retry con backoff exponencial** — agrega latencia percibida al usuario cuando GitHub
  efectivamente está caído, sin garantizar más éxito que ir directo al fallback de cache.

## Consecuencias

- Cero dependencias nuevas, lógica simple y localizada en el punto de llamada a GitHub.
- Si GitHub está caído por un período largo, el dato mostrado puede quedar desactualizado hasta que
  la API vuelva a responder — aceptado porque el PRD ya exige mostrar dato cacheado antes que
  fallar, no dato en tiempo real garantizado.
