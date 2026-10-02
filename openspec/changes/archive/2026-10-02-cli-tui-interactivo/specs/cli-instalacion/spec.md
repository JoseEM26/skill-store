# Spec Delta

## ADDED Requirements

### Requirement: Dashboard interactivo de pantalla completa (`tui`)
El CLI SHALL proveer el comando `tui`, que muestra un dashboard de pantalla completa con
navegación por teclado (flechas o `j`/`k`), filtro de texto en vivo sobre la lista de skills, y
permite traer (`pull`) la skill seleccionada al presionar Enter, saliendo con Esc o `q`. El
dashboard SHALL reflejar exactamente las mismas reglas de visibilidad/autenticación que `list` y
`search` (skills privadas/pausadas propias incluidas si hay sesión, ajenas nunca visibles).

#### Scenario: Navegación y selección
- **WHEN** el usuario ejecuta `tui`, navega la lista con las flechas y presiona Enter sobre una
  skill
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
