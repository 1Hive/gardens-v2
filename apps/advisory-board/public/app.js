import { requiresPublishConfirmation, stageFor as inferStage } from "./workflow.mjs";

const stages = [
  { id: "triage", label: "Triage" },
  { id: "accepted", label: "Accepted replied" },
  { id: "recipient", label: "Recipient address given" },
  { id: "proposal", label: "Proposal created" },
  { id: "published", label: "Published" },
  { id: "closed", label: "Closed" },
];
const activeStages = new Set(["triage", "accepted", "recipient", "proposal"]);
const bountyPoolPath = "/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025/";

const elements = {
  board: document.querySelector("#board"),
  error: document.querySelector("#error"),
  notice: document.querySelector("#notice"),
  search: document.querySelector("#search"),
  severity: document.querySelector("#severity"),
  order: document.querySelector("#order"),
  refresh: document.querySelector("#refresh"),
  count: document.querySelector("#result-count"),
  syncedAt: document.querySelector("#synced-at"),
  dialog: document.querySelector("#transition-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogDescription: document.querySelector("#dialog-description"),
  inputWrap: document.querySelector("#transition-input-wrap"),
  inputLabel: document.querySelector("#transition-input-label"),
  input: document.querySelector("#transition-input"),
  cancelTransition: document.querySelector("#cancel-transition"),
  confirmTransition: document.querySelector("#confirm-transition"),
};

let advisories = [];
let activity = {};
let workflow = {};
let loaded = false;
let draggingId = null;
let pendingMove = null;
let moving = false;
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

function createElement(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value != null) element.textContent = value;
  return element;
}

function labelFor(stage) {
  return stages.find((item) => item.id === stage)?.label || stage;
}

function proposalUrlFor(advisory) {
  return activity[advisory.id]?.proposalUrl || workflow[advisory.id]?.proposalUrl || null;
}

function recipientFor(advisory) {
  return activity[advisory.id]?.recipientAddress || workflow[advisory.id]?.recipientAddress || null;
}

function stageFor(advisory) {
  return inferStage(advisory, activity[advisory.id], workflow[advisory.id]);
}

function canMove(advisory, target) {
  if (target === stageFor(advisory) || advisory.state === "published") return false;
  if (target === "published") return advisory.state === "draft";
  if (target === "closed") return advisory.state === "triage" || advisory.state === "draft";
  if (target === "triage") return advisory.state !== "closed";
  return activeStages.has(target);
}

function createCard(advisory) {
  const card = createElement("article", "advisory-card");
  card.dataset.id = advisory.id;
  card.draggable = stages.some((stage) => canMove(advisory, stage.id));
  if (card.draggable) {
    card.addEventListener("dragstart", (event) => {
      draggingId = advisory.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", advisory.id);
      card.classList.add("is-dragging");
      document.querySelectorAll(".column").forEach((column) => {
        column.classList.toggle("drop-valid", canMove(advisory, column.dataset.stage));
      });
    });
    card.addEventListener("dragend", clearDragTargets);
  }

  const meta = createElement("div", "card-meta");
  meta.append(createElement("span", "advisory-id", advisory.id));
  meta.append(createElement("span", `severity severity-${advisory.severity}`, advisory.severity));
  card.append(meta);

  const title = createElement("h3", "card-title");
  const titleLink = createElement("a", "card-link", advisory.title);
  titleLink.href = advisory.url;
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.draggable = false;
  title.append(titleLink);
  card.append(title);

  const badges = createElement("div", "card-badges");
  if (activity[advisory.id]?.hasReply) {
    badges.append(createElement("span", "card-badge replied-badge", "Replied"));
  }
  if (advisory.fixed) {
    badges.append(createElement("span", "card-badge fixed-badge", "Fixed"));
  }
  const proposalUrl = proposalUrlFor(advisory);
  if (proposalUrl) {
    const number = proposalUrl.split("proposal-").at(-1);
    const link = createElement("a", "card-badge proposal-badge", `Proposal #${number}`);
    link.href = proposalUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.draggable = false;
    badges.append(link);
  }
  if (stageFor(advisory) === "triage" && advisory.state === "draft") {
    badges.append(createElement("span", "card-badge github-badge", "GitHub draft"));
  }
  if (badges.childElementCount) card.append(badges);

  const footer = createElement("div", "card-footer");
  footer.append(createElement("span", "card-author", advisory.author));
  footer.append(createElement(
    "time", "card-date",
    advisory.createdAt ? dateFormat.format(new Date(advisory.createdAt)) : "Date unavailable",
  ));
  card.append(footer);

  if (card.draggable) {
    const select = createElement("select", "card-move");
    select.setAttribute("aria-label", `Move ${advisory.id} to another stage`);
    select.append(new Option("Move to...", ""));
    for (const stage of stages) {
      if (canMove(advisory, stage.id)) select.append(new Option(stage.label, stage.id));
    }
    select.addEventListener("change", () => {
      const target = select.value;
      select.value = "";
      requestMove(advisory.id, target);
    });
    card.append(select);
  }
  return card;
}

function sorted(items) {
  const key = elements.order.value === "updated" ? "updatedAt" : "createdAt";
  const direction = elements.order.value === "oldest" ? 1 : -1;
  return [...items].sort((a, b) => direction * ((Date.parse(a[key]) || 0) - (Date.parse(b[key]) || 0)));
}

function clearDragTargets() {
  draggingId = null;
  document.querySelectorAll(".column").forEach((column) => column.classList.remove("drop-valid", "drop-target"));
  document.querySelectorAll(".is-dragging").forEach((card) => card.classList.remove("is-dragging"));
}

function render() {
  const query = elements.search.value.trim().toLowerCase();
  const severity = elements.severity.value;
  const visible = sorted(advisories.filter((advisory) => {
    const matchesSeverity = severity === "all" || advisory.severity === severity;
    const matchesQuery = !query || `${advisory.title} ${advisory.id} ${advisory.author}`.toLowerCase().includes(query);
    return matchesSeverity && matchesQuery;
  }));

  elements.count.textContent = `${visible.length} of ${advisories.length} advisories`;
  elements.board.replaceChildren(...stages.map((stage) => {
    const column = createElement("section", `column column-${stage.id}`);
    column.dataset.stage = stage.id;
    column.setAttribute("aria-label", stage.label);
    column.addEventListener("dragover", (event) => {
      const advisory = advisories.find((item) => item.id === draggingId);
      if (!advisory || !canMove(advisory, stage.id)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".drop-target").forEach((item) => item.classList.remove("drop-target"));
      column.classList.add("drop-target");
    });
    column.addEventListener("drop", (event) => {
      const id = draggingId;
      const advisory = advisories.find((item) => item.id === id);
      if (!advisory || !canMove(advisory, stage.id)) return;
      event.preventDefault();
      clearDragTargets();
      requestMove(id, stage.id);
    });

    const items = visible.filter((advisory) => stageFor(advisory) === stage.id);
    const header = createElement("div", "column-header");
    header.append(createElement("h2", "column-title", stage.label));
    header.append(createElement("span", "column-count", String(items.length)));
    column.append(header);

    const list = createElement("div", "column-list");
    if (items.length) list.append(...items.map(createCard));
    else list.append(createElement("p", "empty-state", loaded ? "No advisories" : "Loading advisories..."));
    column.append(list);
    return column;
  }));
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
  elements.notice.hidden = true;
}

function bountyProposalUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:" && url.hostname === "app.gardens.fund" &&
        url.pathname.toLowerCase().startsWith(bountyPoolPath) &&
        /^proposal-\d+$/.test(url.pathname.slice(bountyPoolPath.length))) {
      return `${url.origin}${url.pathname}`;
    }
  } catch {
    // The input is not a URL.
  }
  return null;
}

function inputIsValid() {
  if (!pendingMove) return false;
  if (pendingMove.to === "published") return elements.input.value === pendingMove.advisory.id;
  if (pendingMove.to === "recipient") return /^0x[a-fA-F0-9]{40}$/.test(elements.input.value.trim());
  if (pendingMove.to === "proposal") return Boolean(bountyProposalUrl(elements.input.value));
  return true;
}

function requestMove(id, to) {
  if (moving) return;
  const advisory = advisories.find((item) => item.id === id);
  if (!advisory || !canMove(advisory, to)) return;

  const needsInput = (to === "published" && requiresPublishConfirmation(advisory)) ||
    (to === "recipient" && !recipientFor(advisory)) ||
    (to === "proposal" && !proposalUrlFor(advisory));
  const needsConfirmation = needsInput || to === "closed" ||
    (to === "accepted" && !activity[id]?.hasReply);
  if (!needsConfirmation) {
    performMove(advisory, to);
    return;
  }

  pendingMove = { advisory, to };
  elements.dialogTitle.textContent = `${labelFor(to)}: ${id}`;
  elements.dialogDescription.textContent = to === "published"
    ? "Publishing makes this advisory public and may notify users. Confirm the fix and affected versions are ready."
    : to === "closed"
      ? "This will close the advisory on GitHub without publishing it."
      : to === "accepted"
        ? "No team reply was found. This marks the shared workflow stage but does not post a reply. Add the acknowledgment on GitHub."
        : to === "recipient"
          ? "Enter the recipient's Optimism USDT address to record this shared stage."
          : "Link the bounty proposal in this pool to record this shared stage.";
  elements.inputWrap.hidden = !needsInput;
  elements.inputLabel.textContent = to === "published" ? `Type ${id} to publish`
    : to === "recipient" ? "Recipient address" : "Bounty proposal URL";
  elements.input.placeholder = to === "recipient" ? "0x..." : to === "proposal" ? "https://app.gardens.fund/.../proposal-1" : "";
  elements.input.value = "";
  elements.confirmTransition.textContent = to === "published" ? "Publish advisory"
    : to === "closed" ? "Close advisory" : "Move card";
  elements.confirmTransition.disabled = needsInput;
  elements.dialog.showModal();
  if (needsInput) elements.input.focus();
}

async function performMove(advisory, to, inputValue = "") {
  if (moving) return;
  moving = true;
  elements.error.hidden = true;
  elements.notice.hidden = true;
  try {
    const githubTarget = to === "published" || to === "closed" ? to
      : (advisory.state === "triage" || advisory.state === "closed") && to !== "triage" ? "draft" : null;
    if (githubTarget) {
      const response = await fetch(`/api/advisories/${advisory.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: advisory.state, to: githubTarget }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not change advisory state");
      advisory.state = result.state;
    }

    if (activeStages.has(to)) {
      const payload = { stage: to };
      if (to === "recipient" && inputValue) payload.recipientAddress = inputValue.trim();
      if (to === "proposal" && inputValue) payload.bountyProposalUrl = bountyProposalUrl(inputValue);
      const response = await fetch(`/api/advisories/${advisory.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save shared workflow stage");
      workflow[advisory.id] = result.workflow;
    }
    render();
    elements.notice.textContent = `${advisory.id} moved to ${labelFor(to)}.`;
    elements.notice.hidden = false;
    if (githubTarget) await refresh(true);
  } catch (error) {
    showError(error.message);
  } finally {
    moving = false;
  }
}

async function refresh(force = false) {
  elements.refresh.disabled = true;
  elements.refresh.textContent = "Refreshing";
  elements.error.hidden = true;
  try {
    const response = await fetch(`/api/advisories${force ? "?refresh=1" : ""}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load advisories");
    const workflowResponse = await fetch("/api/workflow", { cache: "no-store" });
    const workflowResult = await workflowResponse.json();
    if (!workflowResponse.ok) throw new Error(workflowResult.error || "Could not load shared workflow stages");
    advisories = result.advisories;
    workflow = workflowResult.workflow;
    loaded = true;
    elements.syncedAt.textContent = `Synced ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(result.syncedAt))}`;
    render();
  } catch (error) {
    showError(error.message);
    elements.syncedAt.textContent = "Sync failed";
  } finally {
    elements.refresh.disabled = false;
    elements.refresh.textContent = "Refresh";
  }
}

async function refreshActivity(force = false) {
  try {
    const response = await fetch(`/api/activity${force ? "?refresh=1" : ""}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load advisory activity");
    activity = result.activity;
    render();
    if (result.unavailable) showError(`Reply and proposal status could not be checked for ${result.unavailable} advisories.`);
  } catch (error) {
    showError(error.message);
  }
}

elements.search.addEventListener("input", render);
elements.severity.addEventListener("change", render);
elements.order.addEventListener("change", render);
elements.refresh.addEventListener("click", async () => {
  await refresh(true);
  await refreshActivity(true);
});
elements.board.addEventListener("dragover", (event) => {
  if (!draggingId) return;
  const bounds = elements.board.getBoundingClientRect();
  if (event.clientX > bounds.right - 45) elements.board.scrollLeft += 18;
  if (event.clientX < bounds.left + 45) elements.board.scrollLeft -= 18;
});
elements.cancelTransition.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("close", () => { pendingMove = null; });
elements.input.addEventListener("input", () => { elements.confirmTransition.disabled = !inputIsValid(); });
elements.confirmTransition.addEventListener("click", () => {
  if (!pendingMove || !inputIsValid()) return;
  const { advisory, to } = pendingMove;
  const value = elements.input.value;
  elements.dialog.close();
  performMove(advisory, to, value);
});
render();
refresh().then(refreshActivity);
