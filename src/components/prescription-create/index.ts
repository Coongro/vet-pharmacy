/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
/**
 * Panel de creación de receta veterinaria (v5).
 * Orquestador: gestiona estado y delega render a subcomponentes.
 */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import type { usePrescriptionMutations } from '../../hooks/usePrescriptionMutations.js';
import type {
  CreatePrescriptionData,
  CreatePrescriptionItemData,
  Medication,
} from '../../types/domain.js';
import { formatDate } from '../../utils/formatters.js';
import { AutocompleteInput } from '../AutocompleteInput.js';

import { calcAge, SEX_LABELS, emptyItem, calcDispensQuantity } from './helpers.js';
import { MedicationItemCard } from './MedicationItemCard.js';
import {
  searchPets,
  fetchOwnerFromPet,
  fetchConsultationsForPet,
  fetchConsultationMeds,
  fetchPreviousDiagnoses,
} from './search.js';
import { SectionHeader, ReadOnlyField } from './SectionHeader.js';
import type { PetResult, ConsultationResult, ItemDraft } from './types.js';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useCallback, useEffect } = React;
const h = React.createElement;

// ─── Render helpers ─────────────────────────────────────────────────────────

function renderPetOption(pet: PetResult) {
  return h(
    React.Fragment,
    null,
    h('div', { style: { fontWeight: '500', fontSize: '13px' } }, pet.name),
    h(
      'div',
      { style: { fontSize: '11px', color: 'var(--cg-text-muted)' } },
      [pet.species, pet.breed, pet.owner_name ? `Dueño: ${pet.owner_name}` : null]
        .filter(Boolean)
        .join(' — ')
    )
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export interface PrescriptionCreatePanelProps {
  mutations: ReturnType<typeof usePrescriptionMutations>;
  onCancel: () => void;
  onCreated: (id: string) => void;
}

export function PrescriptionCreatePanel({
  mutations,
  onCancel,
  onCreated,
}: PrescriptionCreatePanelProps) {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const [petId, setPetId] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [microchip, setMicrochip] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerDocument, setOwnerDocument] = useState('');

  const [vetName, setVetName] = useState('');
  const [vetLicense, setVetLicense] = useState('');

  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<ConsultationResult[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [previousDiagnoses, setPreviousDiagnoses] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  // ─── Auto-fill mascota ────────────────────────────────────────────────────

  const handlePetSelect = useCallback((pet: PetResult) => {
    setPetId(pet.id);
    setPetName(pet.name);
    setSpecies(pet.species ?? '');
    setBreed(pet.breed ?? '');
    setSex(pet.sex ?? '');
    setAge(calcAge(pet.birth_date));
    setWeight(pet.weight_kg ? String(pet.weight_kg) : '');
    setMicrochip(pet.microchip_number ?? '');
    setConsultationId(null);
    setConsultations([]);

    if (pet.owner_id) {
      void fetchOwnerFromPet(pet.owner_id).then((contact) => {
        if (contact) {
          setOwnerName(contact.name);
          setOwnerPhone(contact.phone ?? '');
          setOwnerAddress(contact.address ?? '');
          setOwnerDocument(
            contact.document_number
              ? `${contact.document_type ?? 'DNI'} ${contact.document_number}`
              : ''
          );
        } else if (pet.owner_name) {
          setOwnerName(pet.owner_name);
        }
      });
    } else if (pet.owner_name) {
      setOwnerName(pet.owner_name);
    }

    void fetchPreviousDiagnoses(pet.id).then(setPreviousDiagnoses);
  }, []);

  const clearPet = useCallback(() => {
    setPetId(null);
    setSpecies('');
    setBreed('');
    setSex('');
    setAge('');
    setWeight('');
    setMicrochip('');
    setOwnerName('');
    setOwnerPhone('');
    setOwnerAddress('');
    setOwnerDocument('');
  }, []);

  // Cargar consultas al seleccionar mascota
  useEffect(() => {
    if (!petId) {
      setConsultations([]);
      return;
    }
    let cancelled = false;
    setLoadingConsultations(true);
    void fetchConsultationsForPet(petId).then((results) => {
      if (!cancelled) {
        setConsultations(results);
        setLoadingConsultations(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [petId]);

  // ─── Vincular consulta ────────────────────────────────────────────────────

  const handleLinkConsultation = useCallback(
    (consultation: ConsultationResult) => {
      setConsultationId(consultation.id);
      if (consultation.diagnosis) setDiagnosis(consultation.diagnosis);
      if (consultation.vet_name && !vetName) setVetName(consultation.vet_name);

      void fetchConsultationMeds(consultation.id).then((meds) => {
        if (meds.length > 0) {
          const newItems: ItemDraft[] = meds.map((med) => ({
            key: String(Date.now() + Math.random()),
            medication_name: med.name,
            product_id: null,
            dosage_amount: med.dosage_amount ? String(med.dosage_amount) : '',
            dosage_unit: med.dosage_unit ?? 'mg/kg',
            route: med.route ?? 'Oral',
            frequency_hours: med.frequency_hours ?? null,
            duration_amount: med.duration_amount ?? null,
            duration_unit: med.duration_unit ?? 'días',
            quantity: '',
          }));
          setItems(newItems.map((it) => ({ ...it, quantity: calcDispensQuantity(it) || '' })));
        }
      });
    },
    [vetName]
  );

  // ─── Handlers medicamentos ────────────────────────────────────────────────

  const updateItem = useCallback(
    (key: string, field: keyof Omit<ItemDraft, 'key'>, value: string | number | null) => {
      setItems((prev) => {
        const updated = prev.map((it) => (it.key === key ? { ...it, [field]: value } : it));
        if (
          field === 'frequency_hours' ||
          field === 'duration_amount' ||
          field === 'duration_unit'
        ) {
          return updated.map((it) =>
            it.key === key ? { ...it, quantity: calcDispensQuantity(it) || it.quantity } : it
          );
        }
        return updated;
      });
    },
    []
  );

  const handleMedicationSelect = useCallback((key: string, med: Medication) => {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? {
              ...it,
              medication_name:
                med.active_ingredient + (med.concentration ? ` ${med.concentration}` : ''),
              product_id: med.product_id,
              route: med.administration_route ?? it.route,
            }
          : it
      )
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!petId || !petName.trim() || !ownerName.trim() || !vetName.trim()) return;

    const metadata: Record<string, unknown> = {};
    if (species) metadata.species = species;
    if (breed) metadata.breed = breed;
    if (sex) metadata.sex = sex;
    if (age) metadata.age = age;
    if (weight) metadata.weight_kg = weight;
    if (microchip) metadata.microchip = microchip;
    if (ownerPhone) metadata.owner_phone = ownerPhone;
    if (ownerAddress) metadata.owner_address = ownerAddress;
    if (ownerDocument) metadata.owner_document = ownerDocument;
    if (consultationId) metadata.consultation_id = consultationId;

    const prescriptionData: CreatePrescriptionData = {
      pet_id: petId,
      pet_name: petName.trim(),
      owner_name: ownerName.trim(),
      vet_name: vetName.trim(),
      vet_license: vetLicense.trim() || null,
      diagnosis: diagnosis.trim() || null,
      notes: notes.trim() || null,
      issued_at: new Date().toISOString(),
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    };

    const itemData: Omit<CreatePrescriptionItemData, 'prescription_id'>[] = items
      .filter((it) => it.medication_name.trim())
      .map((it) => ({
        medication_name: it.medication_name.trim(),
        product_id: it.product_id ?? undefined,
        dosage_amount: it.dosage_amount.trim() || null,
        dosage_unit: it.dosage_unit || null,
        route: it.route.trim() || null,
        frequency_hours: it.frequency_hours,
        duration_amount: it.duration_amount,
        duration_unit: it.duration_unit || null,
        quantity: it.quantity.trim() || '1',
      }));

    const rx = await mutations.create(prescriptionData, itemData);
    if (rx) onCreated(rx.id);
  }, [
    petId,
    petName,
    species,
    breed,
    sex,
    age,
    weight,
    microchip,
    ownerName,
    ownerPhone,
    ownerAddress,
    ownerDocument,
    vetName,
    vetLicense,
    diagnosis,
    notes,
    consultationId,
    items,
    mutations,
    onCreated,
  ]);

  const isValid = !!petId && petName.trim() && ownerName.trim() && vetName.trim();

  // ─── Render: consulta vinculada ───────────────────────────────────────────

  function renderConsultationSection() {
    if (!petId) return null;

    if (consultationId) {
      const linked = consultations.find((c: ConsultationResult) => c.id === consultationId);
      return h(
        UI.Card,
        { className: 'flex items-center gap-2 px-2.5 py-2' },
        h(UI.Badge, { variant: 'success-soft', size: 'sm' }, '\u2714 Consulta vinculada'),
        h(
          'span',
          { className: 'text-[12px] text-[var(--cg-text)] flex-1 truncate' },
          linked?.reason ?? ''
        ),
        h(
          UI.Button,
          { variant: 'ghost', size: 'xs', onClick: () => setConsultationId(null) },
          'Desvincular'
        )
      );
    }

    if (loadingConsultations) {
      return h(UI.LoadingOverlay, {
        variant: 'dots',
        inline: true,
        label: 'Cargando consultas...',
      });
    }

    if (consultations.length > 0) {
      return h(
        UI.ScrollArea,
        { className: 'max-h-[120px]' },
        h(
          'div',
          { className: 'flex flex-col gap-1' },
          ...consultations.map((c: ConsultationResult) =>
            h(
              UI.Button,
              {
                key: c.id,
                variant: 'outline',
                size: 'sm',
                className: 'w-full justify-start gap-2 font-normal',
                onClick: () => handleLinkConsultation(c),
              },
              h(
                'span',
                { className: 'text-[var(--cg-text-muted)] flex-shrink-0' },
                formatDate(c.date)
              ),
              h('span', { className: 'truncate' }, c.reason),
              c.diagnosis
                ? h(
                    'span',
                    { className: 'text-[var(--cg-text-muted)] truncate' },
                    `Dx: ${c.diagnosis}`
                  )
                : null
            )
          )
        )
      );
    }

    return h(
      'span',
      { className: 'text-[12px] text-[var(--cg-text-muted)] italic' },
      'Sin consultas registradas'
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return h(
    React.Fragment,
    null,

    // Header
    h(
      'div',
      {
        className:
          'flex items-center justify-between px-5 py-3 border-b border-[var(--cg-border)] flex-shrink-0',
      },
      h('h2', { className: 'text-[16px] font-semibold text-[var(--cg-text)] m-0' }, 'Nueva receta')
    ),

    // Body
    h(
      UI.ScrollArea,
      { className: 'flex-1 px-5 py-4' },
      h(
        'div',
        { className: 'flex flex-col gap-4' },

        // ── Paciente ────────────────────────────────────────────────────────
        h(SectionHeader, { title: 'Paciente' }),
        h(
          'div',
          { className: 'flex flex-col gap-1' },
          h(AutocompleteInput, {
            label: 'Mascota *',
            value: petName,
            onChange: (val: string) => {
              setPetName(val);
              if (petId) clearPet();
            },
            onSearch: searchPets,
            onSelect: handlePetSelect,
            renderOption: renderPetOption,
            placeholder: 'Buscar mascota...',
            showToggle: true,
            minChars: 0,
          } as any),
          !petId && petName.trim()
            ? h(
                'span',
                { className: 'text-[11px] text-[var(--cg-warning-text)]' },
                'Seleccione una mascota del listado'
              )
            : null,
          petId
            ? h(UI.Badge, { variant: 'success-soft', size: 'sm' }, '\u2714 Paciente vinculado')
            : null
        ),
        petId
          ? h(
              'div',
              { className: 'grid grid-cols-3 gap-x-4 gap-y-2' },
              h(ReadOnlyField, { label: 'Especie', value: species }),
              h(ReadOnlyField, { label: 'Raza', value: breed }),
              h(ReadOnlyField, { label: 'Sexo', value: (SEX_LABELS[sex] ?? sex) || '' }),
              h(ReadOnlyField, { label: 'Edad', value: age }),
              h(ReadOnlyField, { label: 'Peso', value: weight ? `${weight} kg` : '' }),
              h(ReadOnlyField, { label: 'Microchip', value: microchip })
            )
          : null,

        // ── Propietario ─────────────────────────────────────────────────────
        petId
          ? h(
              React.Fragment,
              null,
              h(SectionHeader, { title: 'Propietario', badge: 'Auto' }),
              h(
                'div',
                { className: 'grid grid-cols-2 gap-x-4 gap-y-2' },
                h(ReadOnlyField, { label: 'Nombre', value: ownerName }),
                h(ReadOnlyField, { label: 'Teléfono', value: ownerPhone }),
                h(ReadOnlyField, { label: 'Documento', value: ownerDocument }),
                h(ReadOnlyField, { label: 'Domicilio', value: ownerAddress })
              )
            )
          : null,

        // ── Veterinario ─────────────────────────────────────────────────────
        h(SectionHeader, { title: 'Veterinario' }),
        h(
          'div',
          { className: 'grid grid-cols-2 gap-2.5' },
          h(
            'div',
            { className: 'flex flex-col gap-1' },
            h(UI.Label, { className: 'text-[11px]' }, 'Nombre *'),
            h(UI.Input, {
              size: 'sm',
              value: vetName,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setVetName(e.target.value),
              placeholder: 'Nombre del veterinario',
            })
          ),
          h(
            'div',
            { className: 'flex flex-col gap-1' },
            h(UI.Label, { className: 'text-[11px]' }, 'Matrícula'),
            h(UI.Input, {
              size: 'sm',
              value: vetLicense,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setVetLicense(e.target.value),
              placeholder: 'N.\u00ba de matrícula',
            })
          )
        ),

        // ── Diagnóstico ─────────────────────────────────────────────────────
        h(SectionHeader, { title: 'Diagnóstico', badge: consultationId ? 'Vinculada' : undefined }),
        petId
          ? h(
              'div',
              { className: 'flex flex-col gap-1.5' },
              h(UI.Label, { className: 'text-[11px]' }, 'Vincular a consulta (opcional)'),
              renderConsultationSection()
            )
          : null,
        h(
          'div',
          { className: 'flex flex-col gap-1' },
          h(UI.Label, { className: 'text-[11px]' }, 'Diagnóstico'),
          h(UI.Input, {
            size: 'sm',
            value: diagnosis,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDiagnosis(e.target.value),
            placeholder: 'Diagnóstico o motivo de prescripción',
            list: 'diagnosis-suggestions',
          }),
          previousDiagnoses.length > 0
            ? h(
                'datalist',
                { id: 'diagnosis-suggestions' },
                ...previousDiagnoses.map((d) => h('option', { key: d, value: d }))
              )
            : null
        ),

        // ── Medicamentos ────────────────────────────────────────────────────
        h(SectionHeader, {
          title: 'Medicamentos',
          badge:
            items.filter((i: ItemDraft) => i.medication_name.trim()).length > 0
              ? String(items.filter((i: ItemDraft) => i.medication_name.trim()).length)
              : undefined,
        }),
        ...items.map((item: ItemDraft, idx: number) =>
          h(MedicationItemCard, {
            key: item.key,
            item,
            index: idx,
            onUpdate: updateItem,
            onMedicationSelect: handleMedicationSelect,
            onRemove: removeItem,
          })
        ),
        h(
          UI.Button,
          { variant: 'outline', className: 'w-full border-dashed', onClick: addItem },
          h(UI.DynamicIcon, { icon: 'Plus', size: 14 }),
          'Agregar medicamento'
        ),

        // ── Observaciones ───────────────────────────────────────────────────
        h(SectionHeader, { title: 'Observaciones' }),
        h(UI.Textarea, {
          value: notes,
          onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value),
          placeholder: 'Indicaciones adicionales, advertencias...',
          rows: 3,
          className: 'resize-y min-h-[60px]',
        }),

        // ── Acciones ────────────────────────────────────────────────────────
        h(
          'div',
          { className: 'flex gap-2.5 pt-2' },
          h(
            UI.Button,
            { disabled: !isValid || mutations.creating, onClick: handleSave },
            mutations.creating ? 'Guardando...' : 'Guardar receta'
          ),
          h(UI.Button, { variant: 'outline', onClick: onCancel }, 'Cancelar')
        )
      )
    )
  );
}
