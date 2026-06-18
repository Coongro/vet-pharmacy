/**
 * Tipos internos del formulario de creación de receta.
 */

export interface PetResult {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  sex?: string;
  birth_date?: string | null;
  weight_kg?: string | null;
  microchip_number?: string | null;
  owner_id?: string;
  owner_name?: string;
}

export interface ContactResult {
  id: string;
  name: string;
  type?: string;
  phone?: string | null;
  email?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  address?: string | null;
}

export interface ConsultationResult {
  id: string;
  pet_id: string;
  vet_name: string;
  date: string;
  reason: string;
  diagnosis?: string | null;
  treatment?: string | null;
  weight_kg?: string | null;
}

export interface ConsultationMedResult {
  id: string;
  name: string;
  dosage_amount?: string | null;
  dosage_unit?: string | null;
  route?: string | null;
  frequency_hours?: number | null;
  duration_amount?: number | null;
  duration_unit?: string | null;
  notes?: string | null;
}

export interface ItemDraft {
  key: string;
  medication_name: string;
  product_id: string | null;
  dosage_amount: string;
  dosage_unit: string;
  route: string;
  frequency_hours: number | null;
  duration_amount: number | null;
  duration_unit: string;
  quantity: string;
}
