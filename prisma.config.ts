import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'node prisma/seed.js',
  },
});

