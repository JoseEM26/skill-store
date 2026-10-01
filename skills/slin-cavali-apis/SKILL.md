---
name: slin-cavali-apis
description: >-
  Reference for the two external APIs this project consumes: SLIN
  (client/lote/cuota/cronograma/evidencia data) and CAVALI (letra digital /
  constancia de cancelación via SOAP). Use this before touching
  AybarSlinService, CavaliService, or any code that calls SLIN/CAVALI, to know
  which endpoint does what and how they combine into a full flow.
version: 1.0.0
author: Aybar-Corp
license: MIT
repository: 'https://github.com/Aybar-Corp/Skill-store'
---

# SLIN & CAVALI — Referencia de las APIs externas

> ⚠️ **Recreado de memoria** (05/09/2026, tras la pérdida del original) — el contenido de los métodos/rutas de abajo está **verificado contra el código real** (`app/Services/AybarSlinService.php`, `app/Services/CavaliService.php`, `routes/api.php`), pero la prosa y el orden son nuevos. Si algo no coincide con lo que recordabas del original, avisá y se corrige.

Este proyecto consume dos servicios de terceros para todo lo que tiene que ver con lotes, cuotas y letras digitales. Ninguno de los dos se llama directo desde un Livewire component — siempre a través de `AybarSlinService` o `CavaliService`.

## SLIN — datos de cliente, lote, cuota y evidencia

`app/Services/AybarSlinService.php`. Este proyecto expone además un proxy propio sobre estos mismos métodos en `routes/api.php` (prefijo `/api/slin/*`, sin autenticación — ver `DOCUMENTACION/05-API/01-endpoints-internos.md`), usado por integraciones externas y por las pantallas de prueba (`/api/test-slin/*`, con parámetros hardcodeados, solo para diagnóstico manual).

| Método | Ruta expuesta | Qué hace |
|---|---|---|
| `getCliente(string $dni)` | `GET /api/slin/cliente/{dni}` | Trae los datos del cliente por DNI. |
| `getLotes(string $idCliente, string $idEmpresa)` | `GET /api/slin/lotes` | Lista los lotes de un cliente dentro de una unidad de negocio (empresa). |
| `resolverCliente(string $dni)` / `resolverLotes(...)` | — (uso interno) | Variante con manejo de fallback/caché sobre los métodos de arriba — usar estos, no los directos, cuando el llamador necesita degradar a la copia local si SLIN no responde. |
| `getCronogramaEstadoCuenta(array $params)` | `GET /api/slin/cuota-estado-cuenta` | El cronograma de cuotas y el estado de cuenta **unificados** — es el que unifica lo que antes eran dos llamadas separadas (`estado-cuenta` y `cuotas`). |
| `obtenerEvidPago(array $params, string $numeroCuota)` | — | Consulta si una cuota puntual ya tiene evidencia de pago registrada en SLIN. |
| `postGuardarEvidencia(array $params)` | `POST /api/slin/guardar-evidencia` | Envía la evidencia de pago (voucher) al sistema externo. **Un solo documento por request** — SLIN no acepta reemplazar/adjuntar más de un comprobante en el mismo envío (confirmado con Rosario). |
| `obtenerComprobanteBase64(string $empresa, string $comprobante)` | `GET /api/slin/comprobante` | Trae el comprobante (PDF) del pago, en base64. |
| `obtenerClientesEnParalelo(array $dnis)` / `obtenerLotesEnParalelo(...)` / `obtenerCronogramasEnParalelo(...)` | — | Variantes en batch (`Http::pool`) de los métodos de arriba, para sincronizaciones masivas (ver `cuotas:sync`/`clientes-lotes:sync`) — no usar la versión singular en un loop cuando existe la versión en paralelo, es la diferencia entre 700ms/lote y varios segundos.

**Reglas que ya se verificaron con el proveedor / con negocio:**
- SLIN nunca recibe más de un comprobante por solicitud de evidencia — un reenvío exige un request nuevo, no un "adjuntar más".
- Los datos de SLIN son la fuente de verdad; la copia local (`slin_lote_cache`, `slin_cuotas_cache`, etc.) es un caché con fecha de sincronización explícita, nunca se presenta como dato en vivo sin decir cuán viejo es.

## CAVALI — letra digital / constancia de cancelación

`app/Services/CavaliService.php`. Comunicación por SOAP, no REST — a diferencia de SLIN.

| Método | Ruta expuesta | Qué hace |
|---|---|---|
| `existeConstancia(string $numeroLetra)` | `GET /cavali/constancia/validar/{numeroLetra}` | Devuelve `true`/`false` rápido, sin traer el PDF — optimizado con una búsqueda de texto simple (`strpos`) sobre la respuesta en vez de parsear el XML/Base64 completo, para no pagar ese costo solo para saber si existe. |
| `consultar(string $numeroLetra)` | `GET /cavali/constancia/ver/{numeroLetra}` | Trae el array procesado `[codigo, base64, error]` — el PDF real de la constancia, si existe. |

**Nota de caché:** hay una ventana corta (documentada en el propio código, ~30 min) antes de la cual no se confía en que "no existe" — una letra recién emitida puede tardar en propagarse del lado de CAVALI, así que un `false` inmediato después de emitir no es necesariamente definitivo.

## Cómo se combinan en un flujo real

Un flujo típico de evidencia de pago:
1. `AybarSlinService::getCliente()` / `resolverCliente()` — identificar al cliente por DNI.
2. `resolverLotes()` — sus lotes dentro de la empresa/unidad de negocio.
3. `getCronogramaEstadoCuenta()` — el cronograma de cuotas de ese lote.
4. El cliente sube su voucher → `postGuardarEvidencia()` — se envía a SLIN.
5. Si el trámite involucra una letra digital, `CavaliService::existeConstancia()` primero (rápido) y `consultar()` recién cuando hace falta el PDF real.

Antes de tocar cualquiera de los dos servicios, confirmá con `grep` cuál método real ya cubre lo que necesitás — es común que ya exista una variante (singular, en paralelo, o con fallback) que resuelve el caso sin escribir código nuevo.
