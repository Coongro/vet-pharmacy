/**
 * Funciones de búsqueda para el formulario de receta.
 * Encapsulan las llamadas a actions de otros plugins.
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

import { actions } from '@coongro/plugin-sdk';

import type { Medication } from '../../types/domain.js';

import type {
  PetResult,
  ContactResult,
  ConsultationResult,
  ConsultationMedResult,
} from './types.js';

export async function searchPets(query: string): Promise<PetResult[]> {
  try {
    const results = await actions.execute<PetResult[]>('patients.pets.search', {
      query,
      limit: 10,
    });
    return results ?? [];
  } catch {
    return [];
  }
}

export async function searchMedications(query: string): Promise<Medication[]> {
  try {
    const results = await actions.execute<Medication[]>('vet-pharmacy.medications.search', {
      query,
    });
    return results ?? [];
  } catch {
    return [];
  }
}

export async function fetchOwnerFromPet(contactId: string): Promise<ContactResult | null> {
  try {
    const contactRaw = await actions.execute<ContactResult | ContactResult[]>('contacts.getById', {
      id: contactId,
    });
    const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
    return contact ?? null;
  } catch {
    return null;
  }
}

export async function fetchConsultationsForPet(petId: string): Promise<ConsultationResult[]> {
  try {
    const results = await actions.execute<ConsultationResult[]>('consultations.records.listByPet', {
      petId,
      limit: 20,
    });
    return results ?? [];
  } catch {
    return [];
  }
}

export async function fetchConsultationMeds(
  consultationId: string
): Promise<ConsultationMedResult[]> {
  try {
    const results = await actions.execute<ConsultationMedResult[]>(
      'consultations.medications.listByConsultation',
      { consultationId }
    );
    return results ?? [];
  } catch {
    return [];
  }
}

export async function fetchPreviousDiagnoses(_petId: string): Promise<string[]> {
  try {
    const results = await actions.execute<Array<{ diagnosis?: unknown }>>(
      'vet-pharmacy.prescriptions.search',
      { filters: {}, limit: 50 }
    );
    if (!results) return [];
    const diagnoses = results
      .map((r) => r.diagnosis)
      .filter((d): d is string => typeof d === 'string' && d.trim().length > 0);
    return [...new Set(diagnoses)];
  } catch {
    return [];
  }
}
