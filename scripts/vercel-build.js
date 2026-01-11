const { spawnSync } = require("node:child_process");
const path = require("node:path");

const useShell = process.platform === "win32";
const bin = (name) =>
  path.join(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    useShell ? `${name}.cmd` : name
  );

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: useShell });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(bin("prisma"), ["generate"]);

const migrateFlag = process.env.PRISMA_MIGRATE_DEPLOY;
const migrateFlagEnabled =
  migrateFlag === "1" || migrateFlag === "true" || migrateFlag === "yes";
const migrateFlagDisabled =
  migrateFlag === "0" || migrateFlag === "false" || migrateFlag === "no";
const isVercel =
  process.env.VERCEL === "1" || process.env.VERCEL === "true";
const migrate = migrateFlagDisabled ? false : migrateFlagEnabled || isVercel;

if (migrate) {
  run(bin("prisma"), ["migrate", "deploy"]);
} else {
  console.log(
    "Skipping prisma migrate deploy (set PRISMA_MIGRATE_DEPLOY=1 to enable)."
  );
}

run(bin("next"), ["build"]);
