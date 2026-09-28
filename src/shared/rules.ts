export const RULE_ID_START = 10_000;
export const RULE_ID_END = 10_999;

export function buildBlockingRules(
  domains: string[],
): chrome.declarativeNetRequest.Rule[] {
  return domains.map((domain, index) => {
    const id = RULE_ID_START + index;
    if (id > RULE_ID_END) {
      throw new Error("Too many domains are enabled.");
    }

    return {
      id,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          extensionPath: `/blocked.html?domain=${encodeURIComponent(domain)}`,
        },
      },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    };
  });
}

export function isOwnedRuleId(id: number): boolean {
  return id >= RULE_ID_START && id <= RULE_ID_END;
}
