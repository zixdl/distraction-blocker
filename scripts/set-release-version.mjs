import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [, , version] = process.argv;

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Version must use <major>.<minor>.<patch>.");
  process.exit(1);
}

if (version.split(".").some((part) => Number(part) > 65535)) {
  console.error("Chrome extension version components cannot exceed 65535.");
  process.exit(1);
}

execFileSync(
  "npm",
  ["version", version, "--no-git-tag-version", "--allow-same-version"],
  { stdio: "inherit" },
);

const manifestPath = "public/manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Set release version to ${version}.`);
