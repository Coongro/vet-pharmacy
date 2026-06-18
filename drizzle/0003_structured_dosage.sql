-- Estructurar campos de dosificación: texto libre → campos tipados
-- Alineado con consultations (Coongro/consultations#34)

ALTER TABLE "module_vet_pharmacy_prescription_items" ADD COLUMN "dosage_amount" numeric;
ALTER TABLE "module_vet_pharmacy_prescription_items" ADD COLUMN "dosage_unit" text;
ALTER TABLE "module_vet_pharmacy_prescription_items" ADD COLUMN "frequency_hours" integer;
ALTER TABLE "module_vet_pharmacy_prescription_items" ADD COLUMN "duration_amount" integer;
ALTER TABLE "module_vet_pharmacy_prescription_items" ADD COLUMN "duration_unit" text;

ALTER TABLE "module_vet_pharmacy_prescription_items" DROP COLUMN IF EXISTS "dosage";
ALTER TABLE "module_vet_pharmacy_prescription_items" DROP COLUMN IF EXISTS "frequency";
ALTER TABLE "module_vet_pharmacy_prescription_items" DROP COLUMN IF EXISTS "duration";
