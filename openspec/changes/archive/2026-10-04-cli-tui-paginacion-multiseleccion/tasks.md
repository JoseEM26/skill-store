# Tasks

## 1. Ventana deslizante y selección múltiple en `tui`

- [x] 1.1 En `src/lib/cli/tui.tsx`, agregar cálculo de ventana deslizante (5 ítems visibles) a
      partir de `selectedIndex` sobre la lista filtrada, y mostrar un indicador de posición (ej.
      "3-7 de 23") en el footer.
- [x] 1.2 Agregar estado `selectedKeys: Set<string>` (claves `owner/slug`); la tecla Tab
      hace toggle sobre el ítem resaltado, marcándolo visualmente (ej. `[x]` antes del nombre).
- [x] 1.3 Al presionar Enter: si `selectedKeys` no está vacío, hacer `pull` de cada ítem marcado en
      secuencia (reusando `handlePull` tal cual existe, sin cambiar su firma), mostrando el
      resultado de cada uno; si está vacío, mantener el comportamiento actual (pull solo del ítem
      resaltado).
- [x] 1.4 Tests: la ventana deslizante nunca muestra más de 5 ítems y se desplaza correctamente al
      navegar más allá del último visible; marcar 2+ ítems con Tab y presionar Enter dispara
      `handlePull` una vez por cada uno marcado; sin marcar nada, Enter sigue trayendo solo el
      ítem resaltado (regresión del comportamiento anterior).

## 2. Verificación integral

- [x] 2.1 Ejecutar `pnpm test && pnpm build && pnpm lint` y verificar que no quede ningún test
      roto.
