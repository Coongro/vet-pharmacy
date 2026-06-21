---
"@coongro/vet-pharmacy": minor
---

Autofill de alta de medicamentos vía vademécum SENASA (COONG-218): el alta/edición de medicamentos en Farmacia integra el buscador del vademécum (@coongro/vademecum + provider SENASA) y autocompleta la ficha clínica desde el padrón, con carga manual de fallback y gating por país. La composición pasa a ser una lista de principios activos (con orden estable) en vez de texto único. Incluye el fix del diálogo de confirmación de borrado, que ahora va anidado dentro del FormDialog (evita que el DismissableLayer del modal padre lo trate como click-afuera y cierre ambos modales).
