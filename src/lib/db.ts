// src/lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "@/lib/neon";
import * as schema from "@/db/communitySchema";

export const db = drizzle(pool, { schema });
export { pool };
