
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("⚠️  Dropping all tables in public schema (PostgreSQL)...");

  // Get all table names from public schema
  const result = await db.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  const rows = (result as any).rows as Array<{ tablename: string }>;
  for (const row of rows) {
    const tableName = row.tablename;
    if (!tableName) continue;
    console.log(`Dropping table "${tableName}"...`);
    // Cascade to drop dependent objects
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`));
  }

  console.log("✅ All tables dropped.");
  process.exit(0);
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
