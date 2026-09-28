import "./styles.css";
import { hostMatchesDomain, normalizeDomain } from "./shared/domains";
import { sendMessage } from "./shared/runtime";
import { formatRemainingTime, getRemainingSeconds } from "./shared/time";
import type { ExtensionState } from "./shared/types";

const title = document.querySelector<HTMLElement>("#blocked-title")!;
const domainText = document.querySelector<HTMLElement>("#blocked-domain")!;
const remainingText = document.querySelector<HTMLElement>("#blocked-remaining")!;
const blockedActions = document.querySelector<HTMLElement>("#blocked-actions")!;
const openSite = document.querySelector<HTMLAnchorElement>("#open-site")!;
const goBack = document.querySelector<HTMLButtonElement>("#go-back")!;
const closeTab = document.querySelector<HTMLButtonElement>("#close-tab")!;

let domain = "";
let timer: number | undefined;

try {
  domain = normalizeDomain(new URLSearchParams(location.search).get("domain") ?? "");
} catch {
  domain = "unknown site";
}

domainText.textContent = domain;

function isBlocked(state: ExtensionState): boolean {
  return Boolean(
    state.activeSession &&
      domain !== "unknown site" &&
      state.activeSession.domains.some((entry) =>
        hostMatchesDomain(domain, entry),
      ),
  );
}

function render(state: ExtensionState): void {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;

  if (!isBlocked(state) || !state.activeSession) {
    title.textContent = "Focus session complete";
    remainingText.textContent = "This site is available again.";
    blockedActions.hidden = true;
    if (domain !== "unknown site") {
      openSite.href = `https://${domain}/`;
      openSite.hidden = false;
    }
    return;
  }

  const updateTime = (): void => {
    const remaining = getRemainingSeconds(state.activeSession!.endAt);
    remainingText.textContent = formatRemainingTime(remaining);
    if (remaining === 0) void loadState();
  };

  updateTime();
  timer = window.setInterval(updateTime, 1000);
}

async function loadState(): Promise<void> {
  const response = await sendMessage({ type: "GET_STATE" });
  if (response.ok) render(response.state);
}

goBack.addEventListener("click", async () => {
  if (history.length > 1) {
    history.back();
    return;
  }
  await sendMessage({ type: "CLOSE_CURRENT_TAB" });
});

closeTab.addEventListener("click", async () => {
  await sendMessage({ type: "CLOSE_CURRENT_TAB" });
});

chrome.storage.onChanged.addListener(() => {
  void loadState();
});

window.addEventListener("unload", () => {
  if (timer !== undefined) window.clearInterval(timer);
});

void loadState();
