import { readFileSync } from "node:fs";
import { join } from "node:path";

const [, , versionOrTag, distDirectory = "dist"] = process.argv;

function fail(message) {
  console.error(`Release validation failed: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }
}

if (!versionOrTag || !/^v?\d+\.\d+\.\d+$/.test(versionOrTag)) {
  fail(
    `version "${versionOrTag ?? ""}" must match <major>.<minor>.<patch>`,
  );
}

const expectedVersion = versionOrTag.replace(/^v/, "");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const sourceManifest = readJson(join("public", "manifest.json"));
const builtManifest = readJson(join(distDirectory, "manifest.json"));

for (const [name, actualVersion] of [
  ["package.json", packageJson.version],
  ["package-lock.json", packageLock.version],
  ["package-lock.json root package", packageLock.packages?.[""]?.version],
  ["public/manifest.json", sourceManifest.version],
  [`${distDirectory}/manifest.json`, builtManifest.version],
]) {
  if (actualVersion !== expectedVersion) {
    fail(`${name} has version ${actualVersion}, expected ${expectedVersion}`);
  }
}

for (const requiredFile of [
  "manifest.json",
  "background.js",
  "popup.html",
  "options.html",
  "blocked.html",
]) {
  try {
    readFileSync(join(distDirectory, requiredFile));
  } catch {
    fail(`${distDirectory}/${requiredFile} is missing`);
  }
}

console.log(`Release v${expectedVersion} is valid.`);
