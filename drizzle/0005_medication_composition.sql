CREATE TABLE "module_vet_pharmacy_medication_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"medication_id" uuid NOT NULL,
	"substance" text NOT NULL,
	"amount" numeric,
	"unit" text,
	"raw_strength" text,
	"source" text
);
--> statement-breakpoint
ALTER TABLE "module_vet_pharmacy_medications" ALTER COLUMN "active_ingredient" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_vet_pharmacy_med_components_med" ON "module_vet_pharmacy_medication_components" USING btree ("medication_id");--> statement-breakpoint
-- Migración de datos: preservar la composición de medicamentos ya cargados.
-- El active_ingredient de texto único pasa a ser un componente; la concentración
-- previa se conserva como raw_strength. source='legacy' los distingue de los
-- cargados luego desde un vademécum.
INSERT INTO "module_vet_pharmacy_medication_components" ("id", "medication_id", "substance", "raw_strength", "source")
SELECT gen_random_uuid(), "id", "active_ingredient", "concentration", 'legacy'
FROM "module_vet_pharmacy_medications"
WHERE "active_ingredient" IS NOT NULL AND "active_ingredient" <> '';