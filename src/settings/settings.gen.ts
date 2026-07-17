/**
 * AUTO-GENERADO por Coongro Builder — NO editar a mano.
 * Se regenera al guardar la página de settings desde /dev/builder.
 * La lógica de negocio va en un hook de dominio que consume esto.
 */
/* eslint-disable */

import { useSettings } from '@coongro/plugin-sdk';

function toBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

/** Tipo de cada setting por su key punteada (para getSetting). */
export interface VetPharmacySettingsByKey {
  'vet-pharmacy.usePrescriptions': boolean;
  'vet-pharmacy.prescription.validityDays': number;
}

/** Settings del plugin con defaults aplicados y coerción por tipo. */
export interface VetPharmacySettings {
  /** Usar recetas formales — Activá el circuito completo de recetas (emisión, dispensación por lote, validez). Desactivado (modo simple): registrás los medicamentos directo en la consulta o por venta de mostrador, sin recetas formales. · `vet-pharmacy.usePrescriptions` · default: `false` */
  readonly usePrescriptions: boolean;
  /** Validez de receta controlada (días) — Días de validez para recetas de medicamentos controlados · `vet-pharmacy.prescription.validityDays` · default: `10` */
  readonly prescriptionValidityDays: number;
}

/** Nombre de prop → key punteada del manifest. */
export const SETTING_KEYS = {
  usePrescriptions: 'vet-pharmacy.usePrescriptions',
  prescriptionValidityDays: 'vet-pharmacy.prescription.validityDays',
} as const;

/** Valores por defecto (los mismos del manifest). */
export const SETTING_DEFAULTS = {
  'vet-pharmacy.usePrescriptions': false,
  'vet-pharmacy.prescription.validityDays': 10,
} as const;

const COERCE: {
  [K in keyof VetPharmacySettingsByKey]: (
    values: Record<string, unknown>
  ) => VetPharmacySettingsByKey[K];
} = {
  'vet-pharmacy.usePrescriptions': (values) =>
    toBool(values['vet-pharmacy.usePrescriptions'], false),
  'vet-pharmacy.prescription.validityDays': (values) =>
    toNum(values['vet-pharmacy.prescription.validityDays'], 10),
};

/** Lee UNA setting tipada desde los valores crudos del tenant (para handlers). */
export function getSetting<K extends keyof VetPharmacySettingsByKey>(
  values: Record<string, unknown>,
  key: K
): VetPharmacySettingsByKey[K] {
  return COERCE[key](values);
}

/** Construye el objeto tipado desde los valores crudos (sin hook: handlers/tests). */
export function readVetPharmacySettings(values: Record<string, unknown>): VetPharmacySettings {
  return {
    usePrescriptions: COERCE['vet-pharmacy.usePrescriptions'](values),
    prescriptionValidityDays: COERCE['vet-pharmacy.prescription.validityDays'](values),
  };
}

/**
 * Hook reactivo: settings tipadas del plugin con defaults aplicados.
 * Envolvé esto en un hook de dominio si necesitás lógica de negocio.
 */
export function useVetPharmacySettings(): { settings: VetPharmacySettings; loading: boolean } {
  const { values, loading } = useSettings('vet-pharmacy.');
  return { settings: readVetPharmacySettings(values), loading };
}
