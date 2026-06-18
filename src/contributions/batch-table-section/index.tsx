import { getHostReact } from '@coongro/plugin-sdk';

import { BatchTable } from '../../components/BatchTable.js';

const React = getHostReact();
const h = React.createElement;

/**
 * View contribution que inyecta tabla de lotes en products.detail.open.
 * Recibe { productId } como prop desde el host view.
 */
export function BatchTableSection(props: Record<string, unknown>): ReturnType<typeof h> | null {
  const productId = props.productId as string | undefined;
  if (!productId) return null;
  return h(BatchTable, { productId });
}
