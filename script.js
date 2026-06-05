const storageKey = "planjetoets-data";

const state = loadState();

const testForm = document.querySelector("#testForm");
const studyForm = document.querySelector("#studyForm");
const testsList = document.querySelector("#testsList");
const studyList = document.querySelector("#studyList");
const testCount = document.querySelector("#testCount");
const studyCount = document.querySelector("#studyCount");
const nextTest = document.querySelector("#nextTest");
const resetData = document.querySelector("#resetData");

setDefaultDates();
render();

testForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(testForm);

  state.tests.push({
    id: crypto.randomUUID(),
    subject: formData.get("subject").trim(),
    topic: formData.get("topic").trim(),
    date: formData.get("testDate"),
    workload: formData.get("workload"),
    notes: formData.get("notes").trim(),
  });

  testForm.reset();
  setDefaultDates();
  saveAndRender();
});

studyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(studyForm);

  state.studyBlocks.push({
    id: crypto.randomUUID(),
    date: formData.get("studyDate"),
    time: formData.get("studyTime"),
    task: formData.get("studyTask").trim(),
    done: false,
  });

  studyForm.reset();
  setDefaultDates();
  saveAndRender();
});

resetData.addEventListener("click", () => {
  const confirmed = confirm("Weet je zeker dat je alle toetsen en leerblokken wilt wissen?");
  if (!confirmed) return;

  state.tests = [];
  state.studyBlocks = [];
  saveAndRender();
});

function loadState() {
  const fallback = { tests: [], studyBlocks: [] };
  const saved = localStorage.getItem(storageKey);

  if (!saved) return fallback;

  try {
    return { ...fallback, ...JSON.parse(saved) };
  } catch {
    return fallback;
  }
}

function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}

function render() {
  renderTests();
  renderStudyBlocks();
  renderStats();
}

function renderTests() {
  const tests = [...state.tests].sort((a, b) => a.date.localeCompare(b.date));

  if (tests.length === 0) {
    testsList.className = "cards empty-state";
    testsList.textContent = "Nog geen toetsen gepland.";
    return;
  }

  testsList.className = "cards";
  testsList.innerHTML = tests
    .map((test) => {
      const days = daysUntil(test.date);
      const countdown = days === 0 ? "vandaag" : days === 1 ? "morgen" : `over ${days} dagen`;
      const safeNotes = escapeHtml(test.notes);

      return `
        <article class="item-card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(test.subject)} - ${escapeHtml(test.topic)}</h3>
              <p class="meta"><span>${formatDate(test.date)}</span><span>${countdown}</span><span>${test.workload}</span></p>
            </div>
          </div>
          ${safeNotes ? `<p class="notes">${safeNotes}</p>` : ""}
          <div class="actions">
            <button class="small-button delete-button" type="button" data-action="delete-test" data-id="${test.id}">Verwijderen</button>
          </div>
        </article>
      `;
    })
    .join("");

  testsList.querySelectorAll("[data-action='delete-test']").forEach((button) => {
    button.addEventListener("click", () => {
      state.tests = state.tests.filter((test) => test.id !== button.dataset.id);
      saveAndRender();
    });
  });
}

function renderStudyBlocks() {
  const blocks = [...state.studyBlocks].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  if (blocks.length === 0) {
    studyList.className = "cards empty-state";
    studyList.textContent = "Nog geen leerblokken gepland.";
    return;
  }

  studyList.className = "cards";
  studyList.innerHTML = blocks
    .map((block) => `
      <article class="item-card ${block.done ? "done" : ""}">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(block.task)}</h3>
            <p class="meta"><span>${formatDate(block.date)}</span><span>${block.time}</span></p>
          </div>
        </div>
        <div class="actions">
          <button class="small-button" type="button" data-action="toggle-block" data-id="${block.id}">
            ${block.done ? "Niet klaar" : "Klaar"}
          </button>
          <button class="small-button delete-button" type="button" data-action="delete-block" data-id="${block.id}">Verwijderen</button>
        </div>
      </article>
    `)
    .join("");

  studyList.querySelectorAll("[data-action='toggle-block']").forEach((button) => {
    button.addEventListener("click", () => {
      const block = state.studyBlocks.find((item) => item.id === button.dataset.id);
      if (block) block.done = !block.done;
      saveAndRender();
    });
  });

  studyList.querySelectorAll("[data-action='delete-block']").forEach((button) => {
    button.addEventListener("click", () => {
      state.studyBlocks = state.studyBlocks.filter((block) => block.id !== button.dataset.id);
      saveAndRender();
    });
  });
}

function renderStats() {
  const sortedTests = [...state.tests].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sortedTests.find((test) => daysUntil(test.date) >= 0);

  testCount.textContent = state.tests.length;
  studyCount.textContent = state.studyBlocks.length;
  nextTest.textContent = upcoming ? upcoming.subject : "Geen";
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelector("#testDate").value ||= today;
  document.querySelector("#studyDate").value ||= today;
  document.querySelector("#studyTime").value ||= "16:00";
}

function daysUntil(dateString) {
  const today = new Date();
  const date = new Date(`${dateString}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}
