/**
 * Helpers puros (sin dependencia de React ni UI).
 */

import type { ItemDraft } from './types.js';

export function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '';
  try {
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(
      (diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000)
    );
    if (years > 0) return months > 0 ? `${years}a ${months}m` : `${years}a`;
    return months > 0 ? `${months}m` : '<1m';
  } catch {
    return '';
  }
}

export const SEX_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
};

export function emptyItem(): ItemDraft {
  return {
    key: String(Date.now() + Math.random()),
    medication_name: '',
    product_id: null,
    dosage_amount: '',
    dosage_unit: 'mg/kg',
    route: 'Oral',
    frequency_hours: null,
    duration_amount: null,
    duration_unit: 'días',
    quantity: '',
  };
}

/** Calcula cantidad a dispensar basado en frecuencia y duración */
export function calcDispensQuantity(item: ItemDraft): string {
  if (!item.frequency_hours || !item.duration_amount) return '';
  if (item.duration_unit !== 'días') return '';
  const dosesPerDay = Math.ceil(24 / item.frequency_hours);
  const total = dosesPerDay * item.duration_amount;
  return String(total);
}
