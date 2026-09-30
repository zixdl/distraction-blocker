import { describe, expect, it } from "vitest";

import { planRelease } from "./plan-release.mjs";

function pullRequest(number, labels = []) {
  return { number, title: `Pull request ${number}`, labels };
}

describe("planRelease", () => {
  it("defaults an unlabeled pull request to a patch release", () => {
    expect(planRelease("0.1.3", [pullRequest(5)])).toMatchObject({
      release: true,
      releaseType: "patch",
      nextVersion: "0.1.4",
    });
  });

  it("uses the highest release type across unreleased pull requests", () => {
    expect(
      planRelease("0.1.3", [
        pullRequest(5),
        pullRequest(6, ["release:minor"]),
        pullRequest(7, ["release:none"]),
      ]),
    ).toMatchObject({
      release: true,
      releaseType: "minor",
      nextVersion: "0.2.0",
    });
  });

  it("skips a release when every unreleased pull request opts out", () => {
    expect(
      planRelease("0.1.3", [
        pullRequest(5, ["release:none"]),
        pullRequest(6, ["release:none"]),
      ]),
    ).toMatchObject({
      release: false,
      releaseType: "none",
      nextVersion: null,
    });
  });

  it("creates a major release when any pull request requests one", () => {
    expect(
      planRelease("0.8.4", [
        pullRequest(5, ["release:minor"]),
        pullRequest(6, ["release:major"]),
      ]),
    ).toMatchObject({
      release: true,
      releaseType: "major",
      nextVersion: "1.0.0",
    });
  });

  it("rejects multiple release labels on one pull request", () => {
    expect(() =>
      planRelease("0.1.3", [
        pullRequest(5, ["release:patch", "release:minor"]),
      ]),
    ).toThrow("multiple release labels");
  });

  it("rejects unsupported release labels", () => {
    expect(() =>
      planRelease("0.1.3", [pullRequest(5, ["release:automatic"])]),
    ).toThrow("unsupported release label");
  });
});
