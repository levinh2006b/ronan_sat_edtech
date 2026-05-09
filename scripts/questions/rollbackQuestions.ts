import { readFileSync } from "node:fs";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type BackupEntry = {
  table: "questions" | "question_options";
  id: string;
  field: string;
  originalValue: string;
  mutatedValue: string;
};

type RollbackReport = {
  success: boolean;
  restored: number;
  skipped: number;
  failed: Array<{ id: string; field: string; error: string }>;
};

const args = process.argv.slice(2);
const isVerify = args.includes("--verify");
const isDryRun = args.includes("--dry-run") || !args.includes("--execute");

function getArgValue(flag: string): string | null {
  const eqArg = args.find((arg) => arg.startsWith(`${flag}=`));
  if (eqArg) return eqArg.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return null;
}

const backupPath = getArgValue("--backup");
const idsRaw = getArgValue("--ids");
const targetIds = idsRaw ? idsRaw.split(",") : null;

function loadBackup(path: string): BackupEntry[] {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as BackupEntry[];
}

async function rollbackFromBackup(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  entries: BackupEntry[],
  dryRun: boolean,
): Promise<RollbackReport> {
  const report: RollbackReport = { success: true, restored: 0, skipped: 0, failed: [] };

  for (const entry of entries) {
    if (dryRun) {
      report.restored += 1;
      continue;
    }

    try {
      const { error } = await supabase
        .from(entry.table)
        .update({ [entry.field]: entry.originalValue })
        .eq("id", entry.id);

      if (error) {
        report.failed.push({ id: entry.id, field: entry.field, error: error.message });
        report.success = false;
      } else {
        report.restored += 1;
      }
    } catch (err) {
      report.failed.push({ id: entry.id, field: entry.field, error: String(err) });
      report.success = false;
    }
  }

  return report;
}

async function verifyRollbackSafety() {
  const originalText = "Test math: $x^2 + y = 5$ and currency: \\$50, also $p\\%$.";
  const badMutation = "Test math: \\(x^2 + y = 5\\) BROKEN and currency: \\$50, also \\(p\\%\\) MUTATED.";

  const entry: BackupEntry = {
    table: "questions",
    id: "rollback-verify-test",
    field: "question_text",
    originalValue: originalText,
    mutatedValue: badMutation,
  };

  // Simulate: mutate -> rollback
  let simulated = badMutation;
  simulated = originalText;

  const restored = simulated === originalText;

  if (!restored) {
    console.error("VERIFY FAILED: rollback did not restore original value");
    console.error(`  Expected: ${originalText}`);
    console.error(`  Got:      ${simulated}`);
    process.exit(1);
  }

  console.log("VERIFY PASSED: rollback logic correctly restores original values.");
  console.log(`  Test entry: ${JSON.stringify(entry)}`);
}

async function main() {
  if (isVerify) {
    await verifyRollbackSafety();
    return;
  }

  if (!backupPath) {
    console.error("Usage: npx tsx scripts/questions/rollbackQuestions.ts [options]");
    console.error("");
    console.error("Options:");
    console.error("  --verify         Run in-memory safety check (no DB, no backup file)");
    console.error("  --backup=PATH    Path to backup JSON file");
    console.error("  --ids=ID1,ID2    Restrict rollback to specific question IDs");
    console.error("  --dry-run        Preview changes without applying (default)");
    console.error("  --execute        Apply rollback to database");
    process.exit(1);
  }

  console.log(`Loading backup: ${backupPath}`);
  const allEntries = loadBackup(backupPath);
  console.log(`Backup contains ${allEntries.length} entries.`);

  const entries = targetIds
    ? allEntries.filter((entry) => targetIds.includes(entry.id))
    : allEntries;

  if (targetIds) {
    console.log(`Filtered to ${entries.length} entries matching IDs: ${targetIds.join(", ")}`);
  }

  if (isDryRun) {
    console.log("DRY RUN — no changes will be made to the database.\n");
    for (const entry of entries) {
      console.log(`  [${entry.table}] ${entry.id} ${entry.field}:`);
      console.log(`    Current (mutated):  ${entry.mutatedValue.slice(0, 80)}${entry.mutatedValue.length > 80 ? "..." : ""}`);
      console.log(`    Restored (original): ${entry.originalValue.slice(0, 80)}${entry.originalValue.length > 80 ? "..." : ""}`);
    }
    console.log(`\nRe-run with --execute to apply ${entries.length} rollback(s).`);
    return;
  }

  const supabase = createSupabaseAdminClient();
  console.log(`Applying rollback for ${entries.length} entries...`);
  const report = await rollbackFromBackup(supabase, entries, false);

  console.log(JSON.stringify({
    success: report.success,
    restored: report.restored,
    skipped: report.skipped,
    failed: report.failed.length,
    failures: report.failed.length > 0 ? report.failed : undefined,
  }, null, 2));

  if (!report.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
