import type { ActiveSession, DomainEntry, ExtensionState } from "./types";

const STORAGE_KEY = "extensionState";

export const DEFAULT_DOMAINS: DomainEntry[] = [
  { host: "facebook.com", enabled: true },
  { host: "x.com", enabled: true },
];

export function createDefaultState(): ExtensionState {
  return {
    domains: DEFAULT_DOMAINS.map((entry) => ({ ...entry })),
    activeSession: null,
  };
}

function isDomainEntry(value: unknown): value is DomainEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.host === "string" && typeof entry.enabled === "boolean";
}

function isActiveSession(value: unknown): value is ActiveSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === "string" &&
    typeof session.startedAt === "number" &&
    Number.isFinite(session.startedAt) &&
    typeof session.endAt === "number" &&
    Number.isFinite(session.endAt) &&
    session.endAt > session.startedAt &&
    Array.isArray(session.domains) &&
    session.domains.length > 0 &&
    session.domains.every((domain) => typeof domain === "string") &&
    Array.isArray(session.ruleIds) &&
    session.ruleIds.every((id) => Number.isInteger(id))
  );
}

function parseState(value: unknown): ExtensionState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.domains) || !state.domains.every(isDomainEntry)) {
    return null;
  }
  if (state.activeSession !== null && !isActiveSession(state.activeSession)) {
    return null;
  }
  return {
    domains: state.domains.map((entry) => ({ ...entry })),
    activeSession: state.activeSession ? { ...state.activeSession } : null,
  };
}

export async function getState(): Promise<ExtensionState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = parseState(stored[STORAGE_KEY]);
  if (parsed) return parsed;

  const defaultState = createDefaultState();
  await saveState(defaultState);
  return defaultState;
}

export async function saveState(state: ExtensionState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export { STORAGE_KEY };
