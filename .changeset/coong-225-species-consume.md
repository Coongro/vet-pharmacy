---
'@coongro/vet-pharmacy': patch
---

refactor(COONG-225 #9): consume la taxonomía de especies de `@coongro/patients`

Elimina `src/species.ts` (que duplicaba la taxonomía de Pacientes y el
normalizador SENASA) y consume `SPECIES` / `SPECIES_LABELS` / `SPECIES_ICON` /
`SPECIES_ENABLED_DEFAULT` / `speciesCodeFromText` desde `@coongro/patients`
(fuente única). Agrega `@coongro/patients` como dependencia. Sin cambio de
comportamiento (verificado en vivo: la columna ESPECIES de Medicamentos sigue
mostrando los chips correctos). Requiere `@coongro/patients` con los exports nuevos.
