import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);

function isHelpInvocation(nextArgs: string[]) {
  return nextArgs.includes("--help") || nextArgs.includes("-h");
}

function startNextDev(nextArgs: string[]) {
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", ...nextArgs], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function main() {
  const nextArgs = process.argv.slice(2);

  if (isHelpInvocation(nextArgs)) {
    startNextDev(nextArgs);
    return;
  }

  console.log("Starting dev server.");
  startNextDev(nextArgs);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
