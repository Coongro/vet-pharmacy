/**
 * Constantes de medicación estructurada — copia local de @coongro/consultations.
 *
 * Se duplican A PROPÓSITO: el import cross-plugin en build-time
 * (`@coongro/consultations/constants/medication`) NO resuelve de forma confiable —
 * el plugin loader solo resuelve symlinks `@coongro/*` de nivel raíz, no subpaths
 * profundos — y rompía el build de vet-pharmacy (TS2307). Mantenerlas acá desacopla
 * el plugin. Si cambian en consultations, sincronizar este archivo.
 */

export const DOSAGE_UNITS = ['mg/kg', 'mg', 'ml', 'UI/kg', 'gotas', 'comp.'] as const;
export type DosageUnit = (typeof DOSAGE_UNITS)[number];

export const ROUTES = ['Oral', 'IM', 'IV', 'SC', 'Tópica', 'Oftálmica', 'Ótica'] as const;
export type Route = (typeof ROUTES)[number];

export const FREQUENCY_HOURS = [6, 8, 12, 24, 48, 72] as const;
export type FrequencyHours = (typeof FREQUENCY_HOURS)[number];

export const FREQUENCY_LABELS: Record<number, string> = {
  6: 'Cada 6 horas',
  8: 'Cada 8 horas',
  12: 'Cada 12 horas',
  24: 'Cada 24 horas',
  48: 'Cada 48 horas',
  72: 'Cada 72 horas',
};

export const DURATION_UNITS = ['días', 'semanas', 'meses'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];
