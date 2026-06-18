import { getHostReact } from '@coongro/plugin-sdk';

import { MedicationFields } from '../../components/MedicationFields.js';

const React = getHostReact();
const h = React.createElement;

/**
 * View contribution que inyecta campos farmacéuticos en products.detail.open.
 * Recibe { productId } como prop desde el host view.
 */
export function MedicationFieldsSection(
  props: Record<string, unknown>
): ReturnType<typeof h> | null {
  const productId = props.productId as string | undefined;
  if (!productId) return null;
  return h(MedicationFields, { productId });
}
