import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/schema/medication.ts',
    './src/schema/prescription.ts',
    './src/schema/prescription-item.ts',
    './src/schema/consultation-med-link.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
