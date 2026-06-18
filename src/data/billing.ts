import { actions } from '@coongro/plugin-sdk';

interface PrescriptionLite {
  id: string;
  pet_id: string | null;
}
interface PrescriptionItemLite {
  id: string;
  product_id: string | null;
  medication_name: string;
  quantity: string;
}

/**
 * Empuja las líneas de cobro de una receta DISPENSADA a la "cuenta de atención" de billing
 * (mismo patrón que vaccination/src/data/billing.ts → chargeAppliedVaccine): resuelve el dueño
 * desde el pet, abre/reutiliza la cuenta (venta de mostrador, sin consulta) y agrega una línea
 * por cada ítem con producto, tomando el precio de venta del catálogo (products.items).
 *
 * Idempotente por `source_ref` (id del ítem): re-dispensar no duplica (billing.lines.add dedup).
 * Dependencia BLANDA (try/catch): si billing / patients / products no están, NO rompe — la
 * dispensación clínica ya quedó registrada; simplemente no se genera el cobro.
 *
 * Cobra la cantidad RECETADA del ítem. (La dispensación parcial cobra igual el total recetado;
 * afinar por dispensed_quantity queda como mejora menor.)
 */
export async function chargeDispensedPrescription(prescriptionId: string): Promise<void> {
  try {
    const rx = await actions.execute<PrescriptionLite | undefined>(
      'vet-pharmacy.prescriptions.getById',
      { id: prescriptionId }
    );
    if (!rx?.pet_id) return; // sin mascota no hay cuenta de visita

    const items = await actions.execute<PrescriptionItemLite[]>(
      'vet-pharmacy.prescription-items.listByPrescription',
      { prescriptionId }
    );
    const billable = (items ?? []).filter(
      (it): it is PrescriptionItemLite & { product_id: string } => Boolean(it.product_id)
    );
    if (billable.length === 0) return; // sin ítems con producto, no abrimos cuenta vacía

    const pet = await actions.execute<{ owner_id?: string | null } | undefined>(
      'patients.pets.getById',
      { id: rx.pet_id }
    );
    const account = await actions.execute<{ id: string } | undefined>(
      'billing.accounts.openForVisit',
      { contactId: pet?.owner_id ?? null, petId: rx.pet_id, consultationId: null }
    );
    if (!account?.id) return;

    for (const it of billable) {
      let salePrice: string | null = null;
      try {
        const prod = await actions.execute<{ sale_price?: string | null } | undefined>(
          'products.items.getById',
          { id: it.product_id }
        );
        salePrice = prod?.sale_price ?? null;
      } catch {
        /* products no disponible: se cobra 0, editable después en Cobros */
      }
      await actions.execute('billing.lines.add', {
        accountId: account.id,
        productId: it.product_id,
        description: it.medication_name,
        quantity: it.quantity || '1',
        unitPrice: salePrice ?? '0',
        sourceType: 'product',
        sourceRef: it.id,
      });
    }
  } catch {
    /* billing no disponible — la dispensación igual quedó registrada */
  }
}

interface ConsultationMed {
  productId: string | null;
  name: string;
  medicationId: string;
  quantity: string;
}

/**
 * Punto B — cobra los medicamentos usados EN UNA CONSULTA. Mismo destino que las vacunas en
 * consulta: la cuenta de la visita (consultationId), así todo el acto cae en UN ticket. Una
 * línea por medicamento con producto, al precio de venta del catálogo.
 *
 * Idempotente por `source_ref` (consultationId + medicationId): re-guardar la consulta no
 * duplica. Dependencia BLANDA: si billing/products no están, NO rompe — la medicación ya quedó
 * registrada en la historia clínica.
 */
export async function chargeConsultationMedications(p: {
  petId: string;
  consultationId: string | null;
  contactId: string | null;
  meds: ConsultationMed[];
}): Promise<void> {
  const billable = p.meds.filter((m): m is ConsultationMed & { productId: string } =>
    Boolean(m.productId)
  );
  if (!p.petId || billable.length === 0) return;
  try {
    const account = await actions.execute<{ id: string } | undefined>(
      'billing.accounts.openForVisit',
      { contactId: p.contactId, petId: p.petId, consultationId: p.consultationId }
    );
    if (!account?.id) return;
    for (const m of billable) {
      let salePrice: string | null = null;
      try {
        const prod = await actions.execute<{ sale_price?: string | null } | undefined>(
          'products.items.getById',
          { id: m.productId }
        );
        salePrice = prod?.sale_price ?? null;
      } catch {
        /* products no disponible: se cobra 0, editable después en Cobros */
      }
      await actions.execute('billing.lines.add', {
        accountId: account.id,
        productId: m.productId,
        description: m.name,
        quantity: m.quantity || '1',
        unitPrice: salePrice ?? '0',
        sourceType: 'product',
        sourceRef: `consult-med:${p.consultationId ?? 'na'}:${m.medicationId}`,
      });
    }
  } catch {
    /* billing no disponible — la medicación igual quedó en la consulta */
  }
}
