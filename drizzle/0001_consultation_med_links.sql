CREATE TABLE "module_vet_pharmacy_consultation_med_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"consultation_medication_id" text NOT NULL,
	"medication_id" text,
	"product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
