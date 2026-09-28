import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubGlobal("chrome", {
    declarativeNetRequest: {
      RuleActionType: { REDIRECT: "redirect" },
      ResourceType: { MAIN_FRAME: "main_frame" },
    },
  });
});

describe("buildBlockingRules", () => {
  it("builds one main-frame redirect rule per domain", async () => {
    const { buildBlockingRules, RULE_ID_START } = await import("./rules");
    const rules = buildBlockingRules(["facebook.com", "x.com"]);

    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({
      id: RULE_ID_START,
      action: { type: "redirect" },
      condition: {
        urlFilter: "||facebook.com^",
        resourceTypes: ["main_frame"],
      },
    });
    expect(rules[0].action.redirect?.extensionPath).toBe(
      "/blocked.html?domain=facebook.com",
    );
  });
});
