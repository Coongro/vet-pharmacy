CREATE TABLE "module_vet_pharmacy_medications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"active_ingredient" text NOT NULL,
	"concentration" text,
	"presentation" text,
	"laboratory" text,
	"species" jsonb,
	"administration_route" text,
	"requires_prescription" boolean NOT NULL,
	"controlled" boolean NOT NULL,
	"senasa_registration" text,
	"storage_conditions" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_vet_pharmacy_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"batch_number" text NOT NULL,
	"expiration_date" timestamp NOT NULL,
	"quantity" numeric NOT NULL,
	"purchase_date" timestamp,
	"purchase_price" numeric,
	"supplier" text,
	"notes" text,
	"status" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_vet_pharmacy_prescriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" serial NOT NULL,
	"pet_id" text,
	"pet_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"vet_name" text NOT NULL,
	"vet_license" text,
	"diagnosis" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"status" text NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_vet_pharmacy_prescription_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prescription_id" text NOT NULL,
	"product_id" text,
	"medication_name" text NOT NULL,
	"dosage" text NOT NULL,
	"duration" text,
	"quantity" numeric NOT NULL,
	"dispensed_quantity" numeric NOT NULL,
	"batch_id" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
