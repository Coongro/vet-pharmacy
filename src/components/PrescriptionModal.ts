/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Modal overlay para detalle o creación de receta.
 * Usa UI.Dialog para manejo automático de ESC y backdrop click.
 */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import type { usePrescriptionMutations } from '../hooks/usePrescriptionMutations.js';

import { PrescriptionCreatePanel } from './PrescriptionCreatePanel.js';
import { PrescriptionDetailPanel } from './PrescriptionDetailPanel.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

export interface PrescriptionModalProps {
  mode: 'detail' | 'create';
  prescriptionId?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
  onStatusChanged?: () => void;
  mutations: ReturnType<typeof usePrescriptionMutations>;
}

export function PrescriptionModal({
  mode,
  prescriptionId,
  onClose,
  onCreated,
  onStatusChanged,
  mutations,
}: PrescriptionModalProps) {
  const dialogSize = mode === 'create' ? 'lg' : 'xl';

  const content =
    mode === 'create'
      ? h(PrescriptionCreatePanel, {
          mutations,
          onCancel: onClose,
          onCreated: (id: string) => {
            if (onCreated) onCreated(id);
          },
        })
      : prescriptionId
        ? h(PrescriptionDetailPanel, {
            selectedId: prescriptionId,
            mutations,
            onStatusChanged,
          })
        : null;

  return h(
    UI.Dialog,
    {
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) onClose();
      },
    },
    h(UI.DialogContent, { size: dialogSize }, content)
  );
}
