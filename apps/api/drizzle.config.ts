import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'giaodichgame',
    user: process.env.DB_USER ?? 'app',
    password: process.env.DB_PASS ?? 'apppassword',
    ssl: false,
  },
  verbose: true,
  strict: true,
});
