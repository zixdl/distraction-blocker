import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE_TYPES = ["none", "patch", "minor", "major"];
const RELEASE_LABEL_PREFIX = "release:";

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Current version "${version}" must use <major>.<minor>.<patch>.`);
  }

  return match.slice(1).map(Number);
}

function releaseTypeForPullRequest(pullRequest) {
  const labels = (pullRequest.labels ?? []).map((label) =>
    typeof label === "string" ? label : label.name,
  );
  const releaseLabels = labels.filter((label) =>
    label.startsWith(RELEASE_LABEL_PREFIX),
  );

  if (releaseLabels.length > 1) {
    throw new Error(
      `Pull request #${pullRequest.number} has multiple release labels: ${releaseLabels.join(", ")}.`,
    );
  }

  if (releaseLabels.length === 0) {
    return "patch";
  }

  const releaseType = releaseLabels[0].slice(RELEASE_LABEL_PREFIX.length);
  if (!RELEASE_TYPES.includes(releaseType)) {
    throw new Error(
      `Pull request #${pullRequest.number} has unsupported release label ${releaseLabels[0]}.`,
    );
  }

  return releaseType;
}

function incrementVersion(version, releaseType) {
  const [major, minor, patch] = parseVersion(version);

  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return null;
  }
}

export function planRelease(currentVersion, pullRequests) {
  parseVersion(currentVersion);

  if (!Array.isArray(pullRequests) || pullRequests.length === 0) {
    throw new Error("At least one pull request is required to plan a release.");
  }

  const evaluatedPullRequests = pullRequests.map((pullRequest) => ({
    number: pullRequest.number,
    title: pullRequest.title,
    releaseType: releaseTypeForPullRequest(pullRequest),
  }));
  const highestReleaseType = evaluatedPullRequests.reduce(
    (highest, pullRequest) =>
      RELEASE_TYPES.indexOf(pullRequest.releaseType) > RELEASE_TYPES.indexOf(highest)
        ? pullRequest.releaseType
        : highest,
    "none",
  );
  const nextVersion = incrementVersion(currentVersion, highestReleaseType);

  return {
    release: nextVersion !== null,
    currentVersion,
    nextVersion,
    releaseType: highestReleaseType,
    pullRequests: evaluatedPullRequests,
  };
}

function run() {
  const [, , currentVersion, pullRequestsPath] = process.argv;
  if (!currentVersion || !pullRequestsPath) {
    throw new Error(
      "Usage: node scripts/plan-release.mjs <current-version> <pull-requests-json>",
    );
  }

  const pullRequests = JSON.parse(readFileSync(pullRequestsPath, "utf8"));
  console.log(JSON.stringify(planRelease(currentVersion, pullRequests), null, 2));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  try {
    run();
  } catch (error) {
    console.error(`Release planning failed: ${error.message}`);
    process.exit(1);
  }
}
