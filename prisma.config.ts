import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'npx ts-node prisma/seed.ts',
  },
});

