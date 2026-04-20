import { spawnSync } from "node:child_process";

const migrationSteps = [
  "migrateUsersToSupabase.ts",
  "migrateTestsAndQuestionsToSupabase.ts",
  "migrateUserDataToSupabase.ts",
  "migrateResultsToSupabase.ts",
  "migrateLegacyBoardAndStudentsToSupabase.ts",
] as const;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: tsx scripts/migrations/mongodb-to-supabase/runAll.ts\n\nRuns the MongoDB -> Supabase migration scripts in order:\n- ${migrationSteps.join("\n- ")}`);
  process.exit(0);
}

for (const step of migrationSteps) {
  console.log(`\n==> Running ${step}`);

  const result = spawnSync("tsx", [`scripts/migrations/mongodb-to-supabase/${step}`], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nMongoDB to Supabase migration complete.");
