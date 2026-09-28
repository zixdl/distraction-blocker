import { normalizeDomain } from "./shared/domains";
import { buildBlockingRules, isOwnedRuleId } from "./shared/rules";
import { getState, saveState } from "./shared/storage";
import { validateDurationMinutes } from "./shared/time";
import type {
  ActionResponse,
  ExtensionState,
  RuntimeMessage,
} from "./shared/types";

const SESSION_ALARM = "focus-session-end";

async function getOwnedRuleIds(): Promise<number[]> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules.filter((rule) => isOwnedRuleId(rule.id)).map((rule) => rule.id);
}

async function removeOwnedRules(): Promise<void> {
  const ruleIds = await getOwnedRuleIds();
  if (ruleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ruleIds });
  }
}

async function installRules(domains: string[]): Promise<number[]> {
  const rules = buildBlockingRules(domains);
  const existingRuleIds = await getOwnedRuleIds();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: rules,
  });
  return rules.map((rule) => rule.id);
}

function rulesMatch(
  currentRules: chrome.declarativeNetRequest.Rule[],
  expectedRules: chrome.declarativeNetRequest.Rule[],
): boolean {
  if (currentRules.length !== expectedRules.length) return false;

  return expectedRules.every((expected) => {
    const current = currentRules.find((rule) => rule.id === expected.id);
    if (!current) return false;
    return (
      current.priority === expected.priority &&
      current.action.type === expected.action.type &&
      current.action.redirect?.extensionPath ===
        expected.action.redirect?.extensionPath &&
      current.condition.urlFilter === expected.condition.urlFilter &&
      current.condition.resourceTypes?.length === 1 &&
      current.condition.resourceTypes[0] ===
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME
    );
  });
}

async function completeSession(state: ExtensionState): Promise<ExtensionState> {
  await removeOwnedRules();
  await chrome.alarms.clear(SESSION_ALARM);
  const nextState = { ...state, activeSession: null };
  await saveState(nextState);
  return nextState;
}

async function reconcile(): Promise<ExtensionState> {
  const state = await getState();
  const session = state.activeSession;

  if (!session) {
    await removeOwnedRules();
    await chrome.alarms.clear(SESSION_ALARM);
    return state;
  }

  if (Date.now() >= session.endAt) {
    return completeSession(state);
  }

  const expectedRules = buildBlockingRules(session.domains);
  const currentRules = (await chrome.declarativeNetRequest.getDynamicRules()).filter(
    (rule) => isOwnedRuleId(rule.id),
  );
  const expectedRuleIds = expectedRules.map((rule) => rule.id);
  const storedRuleIdsMatch =
    session.ruleIds.length === expectedRuleIds.length &&
    session.ruleIds.every((id, index) => id === expectedRuleIds[index]);

  if (rulesMatch(currentRules, expectedRules) && storedRuleIdsMatch) {
    await chrome.alarms.create(SESSION_ALARM, { when: session.endAt });
    return state;
  }

  const ruleIds = await installRules(session.domains);
  const nextState = {
    ...state,
    activeSession: { ...session, ruleIds },
  };
  await saveState(nextState);
  await chrome.alarms.create(SESSION_ALARM, { when: session.endAt });
  return nextState;
}

async function startSession(durationMinutes: number): Promise<ExtensionState> {
  const state = await reconcile();
  if (state.activeSession) {
    throw new Error("A focus session is already active.");
  }

  const duration = validateDurationMinutes(durationMinutes);
  const domains = state.domains
    .filter((entry) => entry.enabled)
    .map((entry) => entry.host);
  if (domains.length === 0) {
    throw new Error("Enable at least one blocked site before starting.");
  }

  const startedAt = Date.now();
  const endAt = startedAt + duration * 60_000;
  let ruleIds: number[] = [];

  try {
    ruleIds = await installRules(domains);
    const nextState: ExtensionState = {
      ...state,
      activeSession: {
        id: crypto.randomUUID(),
        startedAt,
        endAt,
        domains,
        ruleIds,
      },
    };
    await saveState(nextState);
    await chrome.alarms.create(SESSION_ALARM, { when: endAt });
    return nextState;
  } catch (error) {
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
      });
    }
    throw error;
  }
}

async function endSession(): Promise<ExtensionState> {
  const state = await getState();
  if (!state.activeSession) return state;
  return completeSession(state);
}

async function addDomain(input: string): Promise<ExtensionState> {
  const state = await reconcile();
  if (state.activeSession) {
    throw new Error("Sites cannot be changed during an active session.");
  }

  const host = normalizeDomain(input);
  if (state.domains.some((entry) => entry.host === host)) {
    throw new Error(`${host} is already in the list.`);
  }

  const nextState = {
    ...state,
    domains: [...state.domains, { host, enabled: true }],
  };
  await saveState(nextState);
  return nextState;
}

async function toggleDomain(
  host: string,
  enabled: boolean,
): Promise<ExtensionState> {
  const state = await reconcile();
  if (state.activeSession) {
    throw new Error("Sites cannot be changed during an active session.");
  }
  if (!state.domains.some((entry) => entry.host === host)) {
    throw new Error("The selected site no longer exists.");
  }

  const nextState = {
    ...state,
    domains: state.domains.map((entry) =>
      entry.host === host ? { ...entry, enabled } : entry,
    ),
  };
  await saveState(nextState);
  return nextState;
}

async function removeDomain(host: string): Promise<ExtensionState> {
  const state = await reconcile();
  if (state.activeSession) {
    throw new Error("Sites cannot be changed during an active session.");
  }
  const nextState = {
    ...state,
    domains: state.domains.filter((entry) => entry.host !== host),
  };
  await saveState(nextState);
  return nextState;
}

async function closeCurrentTab(tabId: number | undefined): Promise<void> {
  if (tabId === undefined) throw new Error("This tab could not be identified.");
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    await chrome.tabs.update(tabId, { url: "chrome://newtab/" });
  }
}

async function handleMessage(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
): Promise<ActionResponse> {
  try {
    switch (message.type) {
      case "GET_STATE":
        return { ok: true, state: await reconcile() };
      case "START_SESSION":
        return { ok: true, state: await startSession(message.durationMinutes) };
      case "END_SESSION":
        return { ok: true, state: await endSession() };
      case "ADD_DOMAIN":
        return { ok: true, state: await addDomain(message.input) };
      case "TOGGLE_DOMAIN":
        return {
          ok: true,
          state: await toggleDomain(message.host, message.enabled),
        };
      case "REMOVE_DOMAIN":
        return { ok: true, state: await removeDomain(message.host) };
      case "CLOSE_CURRENT_TAB":
        await closeCurrentTab(sender.tab?.id);
        return { ok: true, state: await getState() };
      default:
        throw new Error("Unsupported request.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, sendResponse) => {
    void handleMessage(message, sender).then(sendResponse);
    return true;
  },
);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SESSION_ALARM) {
    void reconcile();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void reconcile();
});

chrome.runtime.onStartup.addListener(() => {
  void reconcile();
});

void reconcile();
