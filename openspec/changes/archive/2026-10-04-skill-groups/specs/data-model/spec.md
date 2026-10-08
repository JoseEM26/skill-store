# Spec Delta

## ADDED Requirements

### Requirement: Agrupación de skills propias
El sistema SHALL permitir que un usuario agrupe un conjunto de sus propias skills bajo un nombre,
y que una misma skill pertenezca a más de un grupo a la vez, sin que borrar un grupo borre las
skills que contiene.

#### Scenario: Una skill en varios grupos
- **WHEN** un usuario agrega la misma skill propia a dos grupos distintos
- **THEN** ambas agrupaciones quedan registradas de forma independiente, sin conflicto

#### Scenario: Borrado de un grupo no borra sus skills
- **WHEN** un usuario borra un grupo que contiene varias skills
- **THEN** las skills siguen existiendo en el catálogo, solo desaparece la agrupación
