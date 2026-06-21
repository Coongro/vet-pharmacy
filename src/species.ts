/**
 * Catálogo de especies — taxonomía de Pacientes (code/label/icon), compartido
 * entre el alta de medicamento (chips) y la lista (tabla/dropdown).
 *
 * Replica labels e iconos de @coongro/patients porque no hay un paquete común y
 * en este sistema un plugin NO importa el frontend de otro (los plugins se
 * comunican vía SDK/settings/actions). Las especies HABILITADAS se leen en vivo
 * de los settings del tenant con `useSettings('patients.')` — esa parte sí es la
 * misma configuración que Pacientes, no una copia.
 */

export interface SpeciesDef {
  /** Código interno, igual que en patients (dog, cat, …). Es lo que se guarda. */
  code: string;
  /** Etiqueta en español para mostrar. */
  label: string;
  /** Nombre de icono Lucide (coherente con SPECIES_ICON de patients). */
  icon: string;
}

export const SPECIES: readonly SpeciesDef[] = [
  { code: 'dog', label: 'Perro', icon: 'Dog' },
  { code: 'cat', label: 'Gato', icon: 'Cat' },
  { code: 'bird', label: 'Ave', icon: 'Bird' },
  { code: 'reptile', label: 'Reptil', icon: 'Turtle' },
  { code: 'rodent', label: 'Roedor', icon: 'Rabbit' },
  { code: 'other', label: 'Otro', icon: 'PawPrint' },
];

export const SPECIES_LABEL: Record<string, string> = Object.fromEntries(
  SPECIES.map((s) => [s.code, s.label])
);
export const SPECIES_ICON: Record<string, string> = Object.fromEntries(
  SPECIES.map((s) => [s.code, s.icon])
);

/** Defaults de especies habilitadas (mismos que el manifest de patients). */
export const SPECIES_ENABLED_DEFAULT: Record<string, boolean> = {
  dog: true,
  cat: true,
  bird: false,
  reptile: false,
  rodent: false,
  other: true,
};

/**
 * Mapea la taxonomía de SENASA (mayúscula/plural, incluye ganado) a los códigos
 * de Pacientes. El ganado (bovino/equino/porcino/ovino) no tiene equivalente de
 * mascota, así que cae en 'other'.
 */
export function senasaSpeciesToCode(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('canino') || t.includes('perro')) return 'dog';
  if (t.includes('felino') || t.includes('gato')) return 'cat';
  if (t.includes('ave') || t.includes('avi')) return 'bird';
  if (t.includes('reptil')) return 'reptile';
  if (t.includes('roedor')) return 'rodent';
  return 'other';
}
