import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

const duplicateCodes = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object
  "42P06", // duplicate_schema
]);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("DATABASE_URL is not set; skipping PostgreSQL migrations.");
    return;
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS disburseguard_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const migrationDir = path.join(process.cwd(), "drizzle");
    const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const [{ exists }] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM disburseguard_migrations WHERE name = ${file}
        ) AS exists
      `;

      if (exists) {
        console.log(`Migration ${file} already applied.`);
        continue;
      }

      console.log(`Applying migration ${file}...`);
      const migrationSql = await readFile(path.join(migrationDir, file), "utf8");
      const statements = migrationSql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
        } catch (error) {
          if (isDuplicateError(error)) {
            console.log(`Skipping existing object while applying ${file}.`);
            continue;
          }
          throw error;
        }
      }

      await sql`INSERT INTO disburseguard_migrations (name) VALUES (${file}) ON CONFLICT (name) DO NOTHING`;
    }

    console.log("PostgreSQL migrations ready.");
  } finally {
    await sql.end();
  }
}

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && duplicateCodes.has(String(error.code));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
