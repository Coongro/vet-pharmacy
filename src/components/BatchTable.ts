/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI, actions, usePlugin } from '@coongro/plugin-sdk';

import { useBatches } from '../hooks/useBatches.js';
import type { Batch, BatchStatus, CreateBatchData } from '../types/domain.js';

import { ExpirationBadge } from './ExpirationBadge.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useCallback } = React;
const h = React.createElement;

interface BatchTableProps {
  productId: string;
}

// ─── Estado del formulario de creación ───────────────────────────────────────

interface CreateFormState {
  batch_number: string;
  expiration_date: string;
  quantity: string;
  purchase_date: string;
  purchase_price: string;
  supplier: string;
  notes: string;
}

function emptyCreateForm(): CreateFormState {
  return {
    batch_number: '',
    expiration_date: '',
    quantity: '',
    purchase_date: '',
    purchase_price: '',
    supplier: '',
    notes: '',
  };
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<BatchStatus, string> = {
  active: 'Activo',
  depleted: 'Agotado',
  expired: 'Vencido',
  recalled: 'Retirado',
};

const STATUS_VARIANT: Record<BatchStatus, string> = {
  active: 'success-soft',
  depleted: 'secondary',
  expired: 'destructive',
  recalled: 'warning',
};

// ─── Skeleton de fila ─────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return h(
    UI.TableRow,
    { key: `skeleton-${index}` },
    h(UI.TableCell, null, h(UI.Skeleton, { className: 'h-4 w-[60%]' })),
    h(UI.TableCell, null, h(UI.Skeleton, { className: 'h-4 w-[70%]' })),
    h(UI.TableCell, null, h(UI.Skeleton, { className: 'h-4 w-[40%]' })),
    h(UI.TableCell, null, h(UI.Skeleton, { className: 'h-4 w-[80%]' })),
    h(UI.TableCell, null, h(UI.Skeleton, { className: 'h-5 w-[50%] rounded-full' })),
    h(UI.TableCell, null, h(UI.Skeleton, { className: 'h-6 w-20' }))
  );
}

// ─── Formulario de creación (dialog) ─────────────────────────────────────────

interface CreateFormProps {
  open: boolean;
  saving: boolean;
  form: CreateFormState;
  onChange: (field: keyof CreateFormState, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function CreateFormDialog({ open, saving, form, onChange, onSubmit, onCancel }: CreateFormProps) {
  function renderField(
    field: keyof CreateFormState,
    label: string,
    type: string,
    required?: boolean
  ) {
    return h(
      'div',
      { className: 'flex flex-col gap-1' },
      h(
        UI.Label,
        { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' },
        label + (required ? ' *' : '')
      ),
      h(UI.Input, {
        size: 'sm',
        type,
        value: form[field],
        required: required ?? false,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(field, e.target.value),
      })
    );
  }

  return h(
    UI.FormDialog,
    {
      open,
      onOpenChange: (val: boolean) => {
        if (!val) onCancel();
      },
      title: 'Agregar lote',
      size: 'lg',
      footer: h(
        'div',
        { className: 'flex justify-end gap-2' },
        h(
          UI.Button,
          {
            variant: 'default',
            size: 'sm',
            onClick: onSubmit,
            disabled: saving,
          },
          saving ? 'Guardando...' : 'Guardar lote'
        ),
        h(
          UI.Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: onCancel,
            disabled: saving,
          },
          'Cancelar'
        )
      ),
    },
    h(
      'div',
      { className: 'grid grid-cols-3 gap-3 gap-x-5' },
      renderField('batch_number', 'Número de lote', 'text', true),
      renderField('expiration_date', 'Vencimiento', 'date', true),
      renderField('quantity', 'Cantidad', 'number', true),
      renderField('purchase_date', 'Fecha de compra', 'date'),
      renderField('purchase_price', 'Precio de compra', 'number'),
      renderField('supplier', 'Proveedor', 'text'),
      h(
        'div',
        { className: 'flex flex-col gap-1 col-span-3' },
        h(
          UI.Label,
          { className: 'text-[11px] uppercase tracking-wide text-cg-text-muted' },
          'Notas'
        ),
        h(UI.Input, {
          size: 'sm',
          type: 'text',
          value: form.notes,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange('notes', e.target.value),
        })
      )
    )
  );
}

// ─── Fila de batch ────────────────────────────────────────────────────────────

interface BatchRowProps {
  batch: Batch;
  confirmingDeleteId: string | null;
  onDeleteRequest: (id: string) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (id: string) => void;
}

function BatchRow({
  batch,
  confirmingDeleteId,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: BatchRowProps) {
  const isConfirming = confirmingDeleteId === batch.id;

  return h(
    UI.TableRow,
    null,
    // Lote
    h(UI.TableCell, { className: 'font-medium' }, batch.batch_number),
    // Vencimiento
    h(
      UI.TableCell,
      null,
      h(ExpirationBadge, { expirationDate: batch.expiration_date }),
      h('span', { className: 'text-[11px] text-cg-text-muted ml-1.5' }, batch.expiration_date)
    ),
    // Cantidad
    h(UI.TableCell, null, batch.quantity),
    // Proveedor
    h(
      UI.TableCell,
      null,
      batch.supplier ? batch.supplier : h('span', { className: 'text-cg-text-muted italic' }, '—')
    ),
    // Estado
    h(
      UI.TableCell,
      null,
      h(UI.Badge, { variant: STATUS_VARIANT[batch.status] }, STATUS_LABEL[batch.status])
    ),
    // Acciones
    h(
      UI.TableCell,
      null,
      isConfirming
        ? h(UI.InlineConfirm, {
            message: '¿Eliminar?',
            onConfirm: () => onDeleteConfirm(batch.id),
            onCancel: onDeleteCancel,
          })
        : h(
            UI.Button,
            {
              variant: 'destructive',
              size: 'xs',
              onClick: () => onDeleteRequest(batch.id),
            },
            'Eliminar'
          )
    )
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BatchTable({ productId }: BatchTableProps) {
  const { toast } = usePlugin();
  const { batches, loading, refetch } = useBatches(productId);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFormState>(emptyCreateForm);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // ─── Handlers del formulario ────────────────────────────────────────────

  const handleFormChange = useCallback((field: keyof CreateFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleOpenForm = useCallback(() => {
    setForm(emptyCreateForm());
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!form.batch_number.trim()) {
      toast.error('Error', 'El número de lote es requerido');
      return;
    }
    if (!form.expiration_date) {
      toast.error('Error', 'La fecha de vencimiento es requerida');
      return;
    }
    if (!form.quantity) {
      toast.error('Error', 'La cantidad es requerida');
      return;
    }

    setSaving(true);
    try {
      const data: CreateBatchData = {
        product_id: productId,
        batch_number: form.batch_number.trim(),
        expiration_date: form.expiration_date,
        quantity: form.quantity,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price || null,
        supplier: form.supplier.trim() || null,
        notes: form.notes.trim() || null,
        status: 'active',
      };

      await actions.execute('products.batches.create', { data });
      toast.success('Lote agregado', `Lote ${data.batch_number} registrado correctamente`);
      setShowForm(false);
      await refetch();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo crear el lote');
    } finally {
      setSaving(false);
    }
  }, [form, productId, refetch, toast]);

  // ─── Handlers de eliminación ────────────────────────────────────────────

  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmingDeleteId(id);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmingDeleteId(null);
  }, []);

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      try {
        await actions.execute('products.batches.delete', { id });
        toast.success('Lote eliminado', 'El lote fue eliminado correctamente');
        setConfirmingDeleteId(null);
        await refetch();
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar el lote');
        setConfirmingDeleteId(null);
      }
    },
    [refetch, toast]
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return h(
    UI.Card,
    null,
    // Cabecera
    h(
      UI.CardHeader,
      { className: 'flex flex-row items-center justify-between' },
      h(UI.CardTitle, null, 'Lotes'),
      h(
        UI.Button,
        {
          variant: showForm ? 'outline' : 'default',
          size: 'sm',
          onClick: showForm ? handleCloseForm : handleOpenForm,
        },
        showForm ? 'Cancelar' : 'Agregar lote'
      )
    ),
    // Dialog de creación
    h(CreateFormDialog, {
      open: showForm,
      saving,
      form,
      onChange: handleFormChange,
      onSubmit: () => {
        void handleCreate();
      },
      onCancel: handleCloseForm,
    }),
    // Tabla
    h(
      UI.CardBody,
      { className: 'p-0' },
      loading
        ? h(
            UI.Table,
            null,
            h(
              UI.TableHeader,
              null,
              h(
                UI.TableRow,
                null,
                h(UI.TableHead, null, 'Lote'),
                h(UI.TableHead, null, 'Vencimiento'),
                h(UI.TableHead, null, 'Cantidad'),
                h(UI.TableHead, null, 'Proveedor'),
                h(UI.TableHead, null, 'Estado'),
                h(UI.TableHead, null, 'Acciones')
              )
            ),
            h(
              UI.TableBody,
              null,
              Array.from({ length: 3 }, (_, i) =>
                h(SkeletonRow, { key: `skeleton-${i}`, index: i })
              )
            )
          )
        : batches.length === 0
          ? h(UI.EmptyState, { title: 'No hay lotes registrados' })
          : h(
              UI.Table,
              null,
              h(
                UI.TableHeader,
                null,
                h(
                  UI.TableRow,
                  null,
                  h(UI.TableHead, null, 'Lote'),
                  h(UI.TableHead, null, 'Vencimiento'),
                  h(UI.TableHead, null, 'Cantidad'),
                  h(UI.TableHead, null, 'Proveedor'),
                  h(UI.TableHead, null, 'Estado'),
                  h(UI.TableHead, null, 'Acciones')
                )
              ),
              h(
                UI.TableBody,
                null,
                batches.map((batch) =>
                  h(BatchRow, {
                    key: batch.id,
                    batch,
                    confirmingDeleteId,
                    onDeleteRequest: handleDeleteRequest,
                    onDeleteCancel: handleDeleteCancel,
                    onDeleteConfirm: (id: string) => {
                      void handleDeleteConfirm(id);
                    },
                  })
                )
              )
            )
    )
  );
}
