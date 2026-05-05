#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");

const action = process.argv[2] || "start";
const compose = ["compose", "-f", "infrastructure/docker-compose.yml", "-f", "infrastructure/docker-compose.dev.yml"];

function run(args) {
  const result = spawnSync("docker", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exitCode = result.status ?? 1;
}

switch (action.toLowerCase()) {
  case "start":
  case "up":
    run([...compose, "up", "--build", "-d"]);
    break;
  case "stop":
  case "down":
    run([...compose, "down"]);
    break;
  case "logs":
    run([...compose, "logs", "-f"]);
    break;
  case "status":
  case "ps":
    run([...compose, "ps"]);
    break;
  default:
    console.error("Usage: node scripts/dev/tepla-dev.mjs [start|stop|logs|status]");
    process.exitCode = 1;
}
