import { getHostReact, views } from '@coongro/plugin-sdk';
import { StockPanel } from '@coongro/products';

const React = getHostReact();
const h = React.createElement;

/**
 * View contribution que inyecta el panel de Stock/Lotes en products.detail.open.
 * Modelo B (COONG-220+): el catálogo muestra el stock read-only y enlaza a
 * "Lotes y stock" para gestionar; la gestión inline (BatchTable) se retiró.
 * Recibe { productId } como prop desde el host view.
 */
export function BatchTableSection(props: Record<string, unknown>): ReturnType<typeof h> | null {
  const productId = props.productId as string | undefined;
  if (!productId) return null;
  return h(StockPanel, {
    productId,
    onGestionar: () => views.open('kit-veterinary.lotes.open', { productId }),
  } as any);
}
