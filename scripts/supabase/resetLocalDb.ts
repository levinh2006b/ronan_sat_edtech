import { createReadStream, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const SNAPSHOT_PATH = join(process.cwd(), "supabase/seeds/local-data.sql");
const INCLUDED_SCHEMAS = ["public", "auth", "storage"];
const EXCLUDED_TABLES = [
  "auth.schema_migrations",
  "storage.migrations",
  "storage.buckets_vectors",
  "storage.vector_indexes",
  "storage.buckets_analytics",
  "storage.iceberg_namespaces",
  "storage.iceberg_tables",
];

function resolveLocalBin(command: string) {
  const executableName = process.platform === "win32" ? `${command}.cmd` : command;
  const localPath = join(process.cwd(), "node_modules/.bin", executableName);
  return existsSync(localPath) ? localPath : command;
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const resolvedCommand = resolveLocalBin(command);
    const child = spawn(resolvedCommand, args, {
      stdio: "inherit",
      shell: process.platform === "win32" && resolvedCommand.endsWith(".cmd"),
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${resolvedCommand} exited with code ${code ?? "unknown"}`));
    });
  });
}

function runCommandWithStdin(command: string, args: string[], inputFilePath: string) {
  return new Promise<void>((resolve, reject) => {
    const resolvedCommand = resolveLocalBin(command);
    const child = spawn(resolvedCommand, args, {
      stdio: ["pipe", "inherit", "inherit"],
      shell: process.platform === "win32" && resolvedCommand.endsWith(".cmd"),
    });
    const inputStream = createReadStream(inputFilePath);

    child.on("error", reject);
    inputStream.on("error", reject);
    inputStream.pipe(child.stdin);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${resolvedCommand} exited with code ${code ?? "unknown"}`));
    });
  });
}

function getSupabaseDbContainerName() {
  const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");
  const match = config.match(/^project_id\s*=\s*"([^"]+)"/m);

  if (!match) {
    throw new Error("Could not read project_id from supabase/config.toml.");
  }

  return `supabase_db_${match[1]}`;
}

async function truncateLocalSupabaseData() {
  const truncateScript = [
    "DO $$",
    "DECLARE table_list text;",
    "BEGIN",
    "  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')",
    "  INTO table_list",
    "  FROM pg_tables",
    `  WHERE schemaname = ANY (ARRAY['${INCLUDED_SCHEMAS.join("','")}'])`,
    `    AND format('%I.%I', schemaname, tablename) <> ALL (ARRAY['${EXCLUDED_TABLES.join("','")}']);`,
    "",
    "  IF table_list IS NOT NULL THEN",
    "    EXECUTE 'TRUNCATE TABLE ' || table_list || ' CASCADE';",
    "  END IF;",
    "END $$;",
  ].join("\n");

  await runCommand("docker", [
    "exec",
    getSupabaseDbContainerName(),
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    truncateScript,
  ]);
}

async function restoreSnapshot() {
  await truncateLocalSupabaseData();
  await runCommandWithStdin(
    "docker",
    [
      "exec",
      "-i",
      getSupabaseDbContainerName(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "-",
    ],
    SNAPSHOT_PATH,
  );
}

async function main() {
  await runCommand("supabase", ["db", "reset", "--yes"]);

  if (!existsSync(SNAPSHOT_PATH)) {
    console.log("No local Supabase snapshot found. Leaving the database at schema-plus-seed state.");
    return;
  }

  console.log(`Restoring local Supabase snapshot from ${SNAPSHOT_PATH}...`);
  await restoreSnapshot();
  console.log("Local Supabase snapshot restore complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
