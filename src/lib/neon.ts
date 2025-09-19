// src/lib/neon.ts
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL / POSTGRES_URL environment variable");
}

// Neon usually accepts ssl: { rejectUnauthorized: false }
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
