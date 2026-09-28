import "./styles.css";
import { sendMessage } from "./shared/runtime";
import { formatRemainingTime, getRemainingSeconds } from "./shared/time";
import type { ExtensionState } from "./shared/types";

const idleView = document.querySelector<HTMLElement>("#idle-view")!;
const activeView = document.querySelector<HTMLElement>("#active-view")!;
const statusMessage = document.querySelector<HTMLElement>("#status-message")!;
const customDuration = document.querySelector<HTMLInputElement>("#custom-duration")!;
const startButton = document.querySelector<HTMLButtonElement>("#start-session")!;
const domainSummary = document.querySelector<HTMLElement>("#domain-summary")!;
const activeDomainSummary = document.querySelector<HTMLElement>("#active-domain-summary")!;
const remainingTime = document.querySelector<HTMLElement>("#remaining-time")!;
const requestEnd = document.querySelector<HTMLButtonElement>("#request-end")!;
const endIdle = document.querySelector<HTMLElement>("#end-idle")!;
const endConfirmation = document.querySelector<HTMLElement>("#end-confirmation")!;
const endCountdown = document.querySelector<HTMLElement>("#end-countdown")!;
const confirmEnd = document.querySelector<HTMLButtonElement>("#confirm-end")!;
const cancelEnd = document.querySelector<HTMLButtonElement>("#cancel-end")!;
const manageSites = document.querySelector<HTMLButtonElement>("#manage-sites")!;
const durationButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".duration-option"),
);

let currentState: ExtensionState | null = null;
let selectedMinutes = 25;
let displayTimer: number | undefined;
let endTimer: number | undefined;

function setStatus(message: string, isError = false): void {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function clearTimers(): void {
  if (displayTimer !== undefined) window.clearInterval(displayTimer);
  if (endTimer !== undefined) window.clearInterval(endTimer);
  displayTimer = undefined;
  endTimer = undefined;
}

function resetEndConfirmation(): void {
  if (endTimer !== undefined) window.clearInterval(endTimer);
  endTimer = undefined;
  endIdle.hidden = false;
  endConfirmation.hidden = true;
  confirmEnd.disabled = true;
  endCountdown.textContent = "Wait 10 seconds to confirm.";
}

function updateCountdown(endAt: number): void {
  const seconds = getRemainingSeconds(endAt);
  remainingTime.textContent = formatRemainingTime(seconds);
  if (seconds === 0) void loadState();
}

function render(state: ExtensionState): void {
  currentState = state;
  clearTimers();
  resetEndConfirmation();
  setStatus("");

  if (state.activeSession) {
    idleView.hidden = true;
    activeView.hidden = false;
    activeDomainSummary.textContent = `${state.activeSession.domains.length} site${
      state.activeSession.domains.length === 1 ? "" : "s"
    } blocked`;
    updateCountdown(state.activeSession.endAt);
    displayTimer = window.setInterval(
      () => updateCountdown(state.activeSession!.endAt),
      1000,
    );
    return;
  }

  idleView.hidden = false;
  activeView.hidden = true;
  const enabledCount = state.domains.filter((entry) => entry.enabled).length;
  domainSummary.textContent = `${enabledCount} site${
    enabledCount === 1 ? "" : "s"
  } selected`;
  startButton.disabled = enabledCount === 0;
}

async function loadState(): Promise<void> {
  const response = await sendMessage({ type: "GET_STATE" });
  if (!response.ok) {
    setStatus(response.error, true);
    return;
  }
  render(response.state);
}

durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedMinutes = Number(button.dataset.minutes);
    customDuration.value = "";
    durationButtons.forEach((item) =>
      item.classList.toggle("selected", item === button),
    );
  });
});

customDuration.addEventListener("input", () => {
  durationButtons.forEach((button) => button.classList.remove("selected"));
});

startButton.addEventListener("click", async () => {
  const customValue = customDuration.value.trim();
  const duration = customValue ? Number(customValue) : selectedMinutes;
  startButton.disabled = true;
  startButton.textContent = "Starting…";
  setStatus("");

  const response = await sendMessage({
    type: "START_SESSION",
    durationMinutes: duration,
  });
  startButton.textContent = "Start focus session";
  if (!response.ok) {
    startButton.disabled = false;
    setStatus(response.error, true);
    return;
  }
  render(response.state);
});

requestEnd.addEventListener("click", () => {
  endIdle.hidden = true;
  endConfirmation.hidden = false;
  let remaining = 10;
  endCountdown.textContent = `Wait ${remaining} seconds to confirm.`;
  endTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      if (endTimer !== undefined) window.clearInterval(endTimer);
      endTimer = undefined;
      endCountdown.textContent = "You can now end the session.";
      confirmEnd.disabled = false;
    } else {
      endCountdown.textContent = `Wait ${remaining} seconds to confirm.`;
    }
  }, 1000);
});

cancelEnd.addEventListener("click", resetEndConfirmation);

confirmEnd.addEventListener("click", async () => {
  confirmEnd.disabled = true;
  const response = await sendMessage({ type: "END_SESSION" });
  if (!response.ok) {
    setStatus(response.error, true);
    confirmEnd.disabled = false;
    return;
  }
  render(response.state);
});

manageSites.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener(() => {
  void loadState();
});

window.addEventListener("unload", clearTimers);
void loadState();
