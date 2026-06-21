/**
 * @coongro/vet-pharmacy — Entry point para lógica backend.
 *
 * Registra comandos custom usando los repositories existentes.
 */
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { LaboratoryRepository } from '@coongro/vademecum/server';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { createDispensePrescription } from './commands/dispensePrescription.js';
import { createGetDispensationPreview } from './commands/getDispensationPreview.js';
import { createTransitionPrescription } from './commands/transitionPrescription.js';
import { medicationTable } from './schema/medication.js';

interface ActivationAPI {
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };
  registerCommand: (id: string, handler: (...args: unknown[]) => unknown) => void;
  database: ModuleDatabaseAPI;
}

export async function activate(context: { api: ActivationAPI }): Promise<void> {
  const { api } = context;

  // Los comandos se registran primero y de forma síncrona: deben quedar
  // disponibles aunque el backfill (abajo) tarde o falle.
  api.registerCommand(
    'vet-pharmacy.getDispensationPreview',
    createGetDispensationPreview(api.database)
  );

  api.registerCommand(
    'vet-pharmacy.dispensePrescription',
    createDispensePrescription(api.database, api.logger)
  );

  api.registerCommand(
    'vet-pharmacy.transitionPrescription',
    createTransitionPrescription(api.database, api.logger)
  );

  api.logger.info('vet-pharmacy: custom commands registered');

  try {
    await backfillLaboratoryIds(api.database, api.logger);
  } catch (err) {
    api.logger.error('vet-pharmacy: laboratory_id backfill failed', err);
  }
}

/**
 * Migra el laboratorio de texto libre al maestro compartido (COONG-219).
 *
 * Para cada medicamento con `laboratory` (texto) y sin `laboratory_id`, hace
 * upsert del laboratorio en el maestro de vademecum (`ensureByName`, dedup
 * case-insensitive) y guarda la referencia. Es idempotente: una vez seteado el
 * id no se vuelve a tocar, así que correr la activación N veces no duplica nada.
 * No es fatal — si vademecum no estuviera disponible, los datos de texto siguen
 * mostrándose y el alta nueva ya escribe el id.
 */
async function backfillLaboratoryIds(
  db: ModuleDatabaseAPI,
  logger: ActivationAPI['logger']
): Promise<void> {
  const pending = await db.ormQuery((tx) =>
    tx
      .select({ id: medicationTable.id, laboratory: medicationTable.laboratory })
      .from(medicationTable)
      .where(and(isNotNull(medicationTable.laboratory), isNull(medicationTable.laboratory_id)))
  );
  if (pending.length === 0) return;

  const labRepo = new LaboratoryRepository(db);
  const idByName = new Map<string, string>();
  let migrated = 0;
  for (const med of pending) {
    const name = (med.laboratory ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    let labId = idByName.get(key);
    if (!labId) {
      const row = await labRepo.ensureByName({ name });
      labId = row.id;
      idByName.set(key, labId);
    }
    await db.ormQuery((tx) =>
      tx
        .update(medicationTable)
        .set({ laboratory_id: labId } as any) // eslint-disable-line @typescript-eslint/no-unsafe-argument
        .where(eq(medicationTable.id, med.id))
    );
    migrated += 1;
  }
  logger.info(`vet-pharmacy: backfilled laboratory_id for ${migrated} medications`);
}
