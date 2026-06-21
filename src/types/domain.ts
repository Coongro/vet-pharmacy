// ─── Medication (bridge table que extiende products.items) ────────────────────

export interface Medication {
  id: string;
  product_id: string;
  active_ingredient: string;
  concentration: string | null;
  presentation: string | null;
  /** @deprecated Cache del nombre; la referencia canónica es `laboratory_id` (COONG-219). */
  laboratory: string | null;
  /** Referencia al maestro de laboratorios compartido (vademecum, COONG-219). */
  laboratory_id: string | null;
  species: string[] | null;
  administration_route: string | null;
  requires_prescription: boolean;
  controlled: boolean;
  senasa_registration: string | null;
  storage_conditions: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationData {
  id?: string;
  product_id: string;
  active_ingredient: string;
  concentration?: string | null;
  presentation?: string | null;
  laboratory?: string | null;
  laboratory_id?: string | null;
  species?: string[] | null;
  administration_route?: string | null;
  requires_prescription?: boolean;
  controlled?: boolean;
  senasa_registration?: string | null;
  storage_conditions?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type UpdateMedicationData = Partial<Omit<CreateMedicationData, 'product_id'>>;

// ─── Batch (lotes de medicamentos — FIFO) ────────────────────────────────────

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'recalled';

export interface Batch {
  id: string;
  product_id: string;
  batch_number: string;
  expiration_date: string;
  quantity: string; // numeric → string
  purchase_date: string | null;
  purchase_price: string | null;
  supplier: string | null;
  notes: string | null;
  status: BatchStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateBatchData {
  id?: string;
  product_id: string;
  batch_number: string;
  expiration_date: string;
  quantity: string;
  purchase_date?: string | null;
  purchase_price?: string | null;
  supplier?: string | null;
  notes?: string | null;
  status?: BatchStatus;
  metadata?: Record<string, unknown> | null;
}

export type UpdateBatchData = Partial<Omit<CreateBatchData, 'product_id'>>;

// ─── Prescription (recetas veterinarias) ─────────────────────────────────────

export type PrescriptionStatus =
  | 'active'
  | 'partially_dispensed'
  | 'dispensed'
  | 'expired'
  | 'cancelled';

export interface Prescription {
  id: string;
  number: number;
  pet_id: string | null;
  pet_name: string;
  owner_name: string;
  vet_name: string;
  vet_license: string | null;
  diagnosis: string | null;
  issued_at: string;
  valid_until: string | null;
  status: PrescriptionStatus;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreatePrescriptionData {
  id?: string;
  pet_id?: string | null;
  pet_name: string;
  owner_name: string;
  vet_name: string;
  vet_license?: string | null;
  diagnosis?: string | null;
  issued_at?: string;
  valid_until?: string | null;
  status?: PrescriptionStatus;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type UpdatePrescriptionData = Partial<CreatePrescriptionData>;

// ─── PrescriptionItem (items de receta) ──────────────────────────────────────

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  product_id: string | null;
  medication_name: string;
  dosage_amount: string | null; // numeric → string
  dosage_unit: string | null;
  route: string | null;
  frequency_hours: number | null;
  duration_amount: number | null;
  duration_unit: string | null;
  quantity: string; // numeric → string
  dispensed_quantity: string;
  batch_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreatePrescriptionItemData {
  id?: string;
  prescription_id: string;
  product_id?: string | null;
  medication_name: string;
  dosage_amount?: string | null;
  dosage_unit?: string | null;
  route?: string | null;
  frequency_hours?: number | null;
  duration_amount?: number | null;
  duration_unit?: string | null;
  quantity: string;
  dispensed_quantity?: string;
  batch_id?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type UpdatePrescriptionItemData = Partial<
  Omit<CreatePrescriptionItemData, 'prescription_id'>
>;

// ─── Prescription con items ──────────────────────────────────────────────────

export interface PrescriptionWithItems extends Prescription {
  items: PrescriptionItem[];
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export interface MedicationFilters {
  search?: string;
  active_ingredient?: string;
  laboratory?: string;
  species?: string;
  requires_prescription?: boolean;
  controlled?: boolean;
}

export interface BatchFilters {
  product_id?: string;
  status?: BatchStatus;
}

export interface PrescriptionFilters {
  search?: string;
  status?: PrescriptionStatus;
  from?: string;
  to?: string;
}

// ─── Dispensación ───────────────────────────────────────────────────────────

export interface BatchPreview {
  batchId: string;
  batchNumber: string;
  expirationDate: string;
  available: number;
  toConsume: number;
}

export interface ItemPreview {
  itemId: string;
  medicationName: string;
  quantity: number;
  productId: string | null;
  batches: BatchPreview[];
  hasStock: boolean;
}

export interface DispensationPreview {
  prescriptionId: string;
  items: ItemPreview[];
}

export interface DispenseResult {
  success: boolean;
  dispensedItems: number;
  modifiedBatches: number;
}
