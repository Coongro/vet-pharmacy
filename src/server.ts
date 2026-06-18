/**
 * @coongro/vet-pharmacy — Exportaciones server-only
 *
 * Schema tables y repositories (dependen de drizzle-orm).
 * NO importar desde el browser — usar '@coongro/vet-pharmacy' para hooks/componentes.
 */
export * from './schema/index.js';
export { MedicationRepository } from './repositories/medication.repository.js';
export { BatchRepository } from './repositories/batch.repository.js';
export { PrescriptionRepository } from './repositories/prescription.repository.js';
export { PrescriptionItemRepository } from './repositories/prescription-item.repository.js';
export { ConsultationMedLinkRepository } from './repositories/consultation-med-link.repository.js';
