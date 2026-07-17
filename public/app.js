/* ============================================================
   Neobrutalist Task Manager — vanilla JS front-end.
   Talks to the same-origin CRUD API with fetch(). No framework.
   ============================================================ */

const els = {
  list: document.getElementById("task-list"),
  empty: document.getElementById("empty-state"),
  addForm: document.getElementById("add-form"),
  addInput: document.getElementById("add-input"),
  search: document.getElementById("search-input"),
  resetBtn: document.getElementById("reset-btn"),
  filterBtns: [...document.querySelectorAll(".filter-btn")],
  statTotal: document.getElementById("stat-total"),
  statOpen: document.getElementById("stat-open"),
  statDone: document.getElementById("stat-done"),
  toastStack: document.getElementById("toast-stack"),
};

const state = {
  filter: "all", // all | open | done
  search: "",
};

// ---------- Toasts ----------
function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " toast-error" : "");
  el.textContent = message;
  els.toastStack.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ---------- API layer ----------
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

function buildTasksQuery() {
  const params = new URLSearchParams();
  if (state.filter === "open") params.set("done", "false");
  if (state.filter === "done") params.set("done", "true");
  if (state.search.trim()) params.set("search", state.search.trim());
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

// ---------- Rendering ----------
function render(tasks) {
  els.list.innerHTML = "";
  els.empty.hidden = tasks.length > 0;

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task-card" + (task.done ? " is-done" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = task.done;
    check.setAttribute("aria-label", "Toggle done");
    check.addEventListener("change", () => toggleDone(task, check.checked));

    const body = document.createElement("div");
    body.className = "task-body";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    const id = document.createElement("div");
    id.className = "task-id";
    id.textContent = `#${task.id}`;
    body.append(title, id);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(task, body));
    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn danger";
    delBtn.textContent = "Del";
    delBtn.addEventListener("click", () => removeTask(task));
    actions.append(editBtn, delBtn);

    li.append(check, body, actions);
    els.list.appendChild(li);
  }
}

function startEdit(task, bodyEl) {
  bodyEl.innerHTML = "";
  const input = document.createElement("input");
  input.className = "task-title-input";
  input.value = task.title;
  bodyEl.appendChild(input);
  input.focus();
  input.select();

  const commit = async () => {
    const next = input.value.trim();
    if (next === "" || next === task.title) return refresh();
    try {
      await api(`/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ title: next }) });
      toast(`Task #${task.id} renamed`);
    } catch (err) {
      toast(err.message, true);
    }
    refresh();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") refresh();
  });
  input.addEventListener("blur", commit);
}

// ---------- Actions ----------
async function addTask(e) {
  e.preventDefault();
  const title = els.addInput.value.trim();
  try {
    // Send raw value (even if empty) so the API's 400 validation is visible.
    const created = await api("/tasks", {
      method: "POST",
      body: JSON.stringify({ title: els.addInput.value }),
    });
    els.addInput.value = "";
    toast(`Added "${created.title}" (#${created.id})`);
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
}

async function toggleDone(task, done) {
  try {
    await api(`/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ done }) });
    toast(done ? `Task #${task.id} done` : `Task #${task.id} reopened`);
  } catch (err) {
    toast(err.message, true);
  }
  refresh();
}

async function removeTask(task) {
  try {
    await api(`/tasks/${task.id}`, { method: "DELETE" });
    toast(`Deleted #${task.id}`);
  } catch (err) {
    toast(err.message, true);
  }
  refresh();
}

async function resetDemo() {
  try {
    await api("/reset", { method: "POST" });
    toast("Demo reset to 3 seed tasks");
  } catch (err) {
    toast(err.message, true);
  }
  refresh();
}

async function refresh() {
  try {
    const [tasks, stats] = await Promise.all([api(buildTasksQuery()), api("/stats")]);
    render(tasks);
    els.statTotal.textContent = stats.total;
    els.statOpen.textContent = stats.open;
    els.statDone.textContent = stats.done;
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Wiring ----------
els.addForm.addEventListener("submit", addTask);
els.resetBtn.addEventListener("click", resetDemo);

let searchTimer;
els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = els.search.value;
    refresh();
  }, 180);
});

for (const btn of els.filterBtns) {
  btn.addEventListener("click", () => {
    els.filterBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.filter = btn.dataset.filter;
    refresh();
  });
}

refresh();
