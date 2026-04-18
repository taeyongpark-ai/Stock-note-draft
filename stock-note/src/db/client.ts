import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// 로컬 dev: DATABASE_URL=file:./local.db (env 없어도 fallback)
// 프로덕션: Turso 클라우드 URL + auth token
const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
