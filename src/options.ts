import "./styles.css";
import { sendMessage } from "./shared/runtime";
import type { ExtensionState } from "./shared/types";

const form = document.querySelector<HTMLFormElement>("#add-domain-form")!;
const input = document.querySelector<HTMLInputElement>("#domain-input")!;
const domainList = document.querySelector<HTMLUListElement>("#domain-list")!;
const status = document.querySelector<HTMLElement>("#options-status")!;
const activeNotice = document.querySelector<HTMLElement>("#active-notice")!;
const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']")!;

function setStatus(message: string, isError = false): void {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function render(state: ExtensionState): void {
  const locked = state.activeSession !== null;
  activeNotice.hidden = !locked;
  input.disabled = locked;
  submitButton.disabled = locked;
  domainList.replaceChildren();

  if (state.domains.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No sites have been added yet.";
    domainList.append(empty);
    return;
  }

  state.domains.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "domain-item";

    const label = document.createElement("label");
    label.className = "domain-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = entry.enabled;
    checkbox.disabled = locked;
    checkbox.addEventListener("change", async () => {
      const response = await sendMessage({
        type: "TOGGLE_DOMAIN",
        host: entry.host,
        enabled: checkbox.checked,
      });
      if (!response.ok) {
        setStatus(response.error, true);
        checkbox.checked = entry.enabled;
        return;
      }
      setStatus("");
      render(response.state);
    });

    const host = document.createElement("span");
    host.textContent = entry.host;
    label.append(checkbox, host);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "Remove";
    remove.disabled = locked;
    remove.addEventListener("click", async () => {
      const response = await sendMessage({
        type: "REMOVE_DOMAIN",
        host: entry.host,
      });
      if (!response.ok) {
        setStatus(response.error, true);
        return;
      }
      setStatus("");
      render(response.state);
    });

    item.append(label, remove);
    domainList.append(item);
  });
}

async function loadState(): Promise<void> {
  const response = await sendMessage({ type: "GET_STATE" });
  if (!response.ok) {
    setStatus(response.error, true);
    return;
  }
  render(response.state);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");
  const response = await sendMessage({
    type: "ADD_DOMAIN",
    input: input.value,
  });
  if (!response.ok) {
    setStatus(response.error, true);
    return;
  }
  input.value = "";
  setStatus("Site added.");
  render(response.state);
});

chrome.storage.onChanged.addListener(() => {
  void loadState();
});

void loadState();
