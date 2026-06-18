/**
 * @coongro/vet-pharmacy — Entry point principal (browser-safe)
 *
 * Exportar aquí: hooks, componentes, tipos, utilidades.
 * NO exportar schema tables ni repositories (usan drizzle-orm, solo backend).
 * Para exports server-only → usar server.ts
 */

// Types
export type {
  Medication,
  CreateMedicationData,
  UpdateMedicationData,
  Batch,
  BatchStatus,
  CreateBatchData,
  UpdateBatchData,
  Prescription,
  PrescriptionStatus,
  CreatePrescriptionData,
  UpdatePrescriptionData,
  PrescriptionItem,
  CreatePrescriptionItemData,
  UpdatePrescriptionItemData,
  PrescriptionWithItems,
  MedicationFilters,
  BatchFilters,
  PrescriptionFilters,
  BatchPreview,
  ItemPreview,
  DispensationPreview,
  DispenseResult,
} from './types/domain.js';

// Hooks
export {
  useMedication,
  useMedications,
  useBatches,
  usePrescriptions,
  usePrescription,
  usePrescriptionMutations,
} from './hooks/index.js';

// Components
export { ExpirationBadge } from './components/ExpirationBadge.js';
export { MedicationFields } from './components/MedicationFields.js';
export { BatchTable } from './components/BatchTable.js';
