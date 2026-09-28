export type DomainEntry = {
  host: string;
  enabled: boolean;
};

export type ActiveSession = {
  id: string;
  startedAt: number;
  endAt: number;
  domains: string[];
  ruleIds: number[];
};

export type ExtensionState = {
  domains: DomainEntry[];
  activeSession: ActiveSession | null;
};

export type StateResponse =
  | { ok: true; state: ExtensionState }
  | { ok: false; error: string };

export type ActionResponse = StateResponse;

export type RuntimeMessage =
  | { type: "GET_STATE" }
  | { type: "START_SESSION"; durationMinutes: number }
  | { type: "END_SESSION" }
  | { type: "ADD_DOMAIN"; input: string }
  | { type: "TOGGLE_DOMAIN"; host: string; enabled: boolean }
  | { type: "REMOVE_DOMAIN"; host: string }
  | { type: "CLOSE_CURRENT_TAB" };
