/**
 * @coongro/vet-pharmacy — Entry point para lógica backend.
 *
 * Registra comandos custom usando los repositories existentes.
 */
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';

import { createDispensePrescription } from './commands/dispensePrescription.js';
import { createGetDispensationPreview } from './commands/getDispensationPreview.js';
import { createTransitionPrescription } from './commands/transitionPrescription.js';

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

export function activate(context: { api: ActivationAPI }): void {
  const { api } = context;

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
}
