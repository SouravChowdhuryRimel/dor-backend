import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: 'postgresql://postgres:password@localhost:5435/mydb_shadow?schema=public',
  },
  migrations: {
    seed: 'node prisma/seed.js',
  },
});

