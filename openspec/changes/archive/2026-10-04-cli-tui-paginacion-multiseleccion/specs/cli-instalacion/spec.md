# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard interactivo de pantalla completa (`tui`)
El CLI SHALL proveer el comando `tui`, que muestra un dashboard de pantalla completa con
navegación por teclado (flechas o `j`/`k`), filtro de texto en vivo sobre la lista de skills, y
permite traer (`pull`) la skill seleccionada al presionar Enter, saliendo con Esc o `q`. El
dashboard SHALL reflejar exactamente las mismas reglas de visibilidad/autenticación que `list` y
`search` (skills privadas/pausadas propias incluidas si hay sesión, ajenas nunca visibles). La
lista SHALL mostrarse como una ventana deslizante de 5 ítems visibles a la vez (sin importar
cuántos resultados haya en total), y SHALL permitir marcar varios ítems con la tecla Tab
para traerlos todos juntos al presionar Enter.

#### Scenario: Navegación y selección
- **WHEN** el usuario ejecuta `tui`, navega la lista con las flechas y presiona Enter sobre una
  skill sin haber marcado ninguna con Tab
- **THEN** el CLI trae (`pull`) esa skill al directorio destino, igual que lo haría el comando
  `pull` directo

#### Scenario: Filtro en vivo
- **WHEN** el usuario escribe texto mientras el dashboard está abierto
- **THEN** la lista se filtra en vivo a las skills cuyo nombre, slug o descripción coincide, sin
  necesidad de confirmar con Enter para filtrar

#### Scenario: Salida sin seleccionar
- **WHEN** el usuario presiona Esc o `q` sin haber seleccionado ninguna skill
- **THEN** el CLI cierra el dashboard sin traer ningún archivo

#### Scenario: Sesión autenticada muestra skills propias privadas/pausadas
- **WHEN** el usuario tiene una sesión activa (`login` previo) y ejecuta `tui`
- **THEN** el dashboard incluye sus propias skills privadas/pausadas junto a las públicas, sin
  mostrar privadas/pausadas de otros usuarios

#### Scenario: Ventana deslizante con más de 5 resultados
- **WHEN** la lista filtrada tiene más de 5 skills y el usuario navega con flecha abajo más allá
  del último ítem visible
- **THEN** la ventana visible se desplaza mostrando los siguientes ítems, manteniendo siempre como
  máximo 5 filas de skills en pantalla

#### Scenario: Selección múltiple y pull en lote
- **WHEN** el usuario marca varios ítems con la tecla Tab (en una o más posiciones de la
  ventana deslizante) y presiona Enter
- **THEN** el CLI trae (`pull`) todos los ítems marcados, uno por uno, informando el resultado de
  cada uno
