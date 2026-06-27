---
"@coongro/vet-pharmacy": patch
---

Refactor (COONG-224): el alta de medicamentos consume el buscador compartido `CatalogSearch` de `@coongro/vademecum` en vez de su copia inline. Se elimina el buscador duplicado (~300 líneas) y su CSS muerto, sin cambios de comportamiento.
