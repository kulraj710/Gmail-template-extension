/* ===== Configuration =================================== */
const DOC_ID = "11NRyqFhn0J6cKpYZmp2VyaCNcWUi7LwQqAATMlDoiXk";
const DOC_URL = `https://docs.google.com/document/d/${DOC_ID}/export?format=txt`;
const STAR_KEY = "starredTemplates_v1";

/* ===== State =========================================== */
let templatesCache = {}; // { title: {body, author, category, star} }
let filteredList = []; // currently visible titles
let currentView = "loading";
let currentTemplate = "";
let activeCategory = "All";

/* ===== DOM refs ======================================== */
const el = {
  search: document.getElementById("search"),
  chips: document.getElementById("chips"),
  list: document.getElementById("templateList"),
  form: document.getElementById("placeholderForm"),
  inputs: document.getElementById("inputs"),
  back: document.getElementById("backBtn"),
  headline: document.getElementById("headline"),
  loading: document.getElementById("loadingState"),
  empty: document.getElementById("emptyState"),
};

/* ===== Utilities ======================================= */
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const qs = (sel) => [...document.querySelectorAll(sel)];

async function loadStars() {
  const { [STAR_KEY]: saved = [] } = await chrome.storage.local.get(STAR_KEY);
  return new Set(saved);
}
async function saveStars(set) {
  await chrome.storage.local.set({ [STAR_KEY]: [...set] });
}

/* ===== Fetch + parse templates ========================= */
async function fetchTemplates() {
  const raw = await (await fetch(DOC_URL)).text();
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const all = {};
  text
    .split("== Template: ")
    .slice(1)
    .forEach((block) => {
      const [hdr, ...rest] = block.split("\n");
      const title = hdr.replace(/==\s*$/, "").trim(); // To-Do : could remove this from the template, ending == are not needed splitting happens on new line
      if (!title) return;
      let author = "",
        category = "Uncategorised",
        bodyLines = [];
      rest.forEach((line) => {
        const m = line.match(/^\[\[\s*(\w+)\s*:\s*(.+?)\s*\]\]/i); // Match [[ key: value ]]
        if (m) {
          if (m[1].toLowerCase() === "author") author = m[2].trim();
          if (m[1].toLowerCase() === "category")
            category = m[2].trim() || "Uncategorised";
        } else bodyLines.push(line);
      });
      all[title] = {
        body: bodyLines.join("\n").trim(),
        author,
        category,
        star: false,
      };
    });
  return all;
}

/* ===== View helpers ==================================== */
const view = {
  loading() {
    currentView = "loading";
    el.loading.classList.remove("hidden");
    el.list.classList.add("hidden");
    el.form.classList.add("hidden");
    el.empty.classList.add("hidden");
  },
  list() {
    currentView = "list";
    el.loading.classList.add("hidden");
    el.list.classList.remove("hidden");
    el.form.classList.add("hidden");
    el.empty.classList.add("hidden");
  },
  form() {
    currentView = "form";
    el.loading.classList.add("hidden");
    el.list.classList.add("hidden");
    el.form.classList.remove("hidden");
    el.empty.classList.add("hidden");
  },
  empty() {
    currentView = "empty";
    el.loading.classList.add("hidden");
    el.list.classList.add("hidden");
    el.form.classList.add("hidden");
    el.empty.classList.remove("hidden");
  },
};

/* ===== Chips =========================================== */
function renderChips() {
  const cats = new Set(Object.values(templatesCache).map((t) => t.category));
  el.chips.innerHTML = "";
  const allCats = ["All", "★ Starred", ...Array.from(cats).sort()];
  allCats.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "chip" + (cat === activeCategory ? " active" : "");
    b.textContent = cat;
    b.tabIndex = 0;
    b.onclick = () => {
      activeCategory = cat;
      filterAndRender();
      b.focus();
    };
    el.chips.appendChild(b);
  });
}

/* ===== Filtering ======================================= */
function filterAndRender(q = el.search.value) {
  q = q.trim().toLowerCase();
  const list = Object.entries(templatesCache)
    .filter(([k, v]) => {
      if (activeCategory === "★ Starred" && !v.star) return false;
      if (
        activeCategory !== "All" &&
        activeCategory !== "★ Starred" &&
        v.category !== activeCategory
      )
        return false;
      return k.toLowerCase().includes(q);
    })
    .map(([k]) => k)
    .sort();
  renderList(list);
}

/* ===== Render list ===================================== */
function renderList(arr) {
  filteredList = arr;
  el.list.innerHTML = "";
  if (!arr.length) {
    view.empty();
    return;
  }

  arr.forEach((title) => {
    const t = templatesCache[title];
    const row = document.createElement("div");
    row.className = "template-row";
    row.innerHTML = `
      <button class="tmpl-btn" tabindex="0">
        <span class="star">${t.star ? "★" : "☆"}</span>
        <span class="t-title">${esc(title)}</span>
        <span class="t-cat">${esc(t.category)}</span>
      </button>`;
    const btn = row.querySelector(".tmpl-btn");
    btn.onclick = () => openForm(title);
    row.querySelector(".star").onclick = (e) => {
      e.stopPropagation();
      toggleStar(title);
    };
    el.list.appendChild(row);
  });
  view.list();
  // Ensure first template focusable after rendering
  el.list.querySelector(".tmpl-btn")?.focus();
}

/* ===== Star toggle ===================================== */
async function toggleStar(title) {
  templatesCache[title].star = !templatesCache[title].star;
  await saveStars(
    new Set(
      Object.entries(templatesCache)
        .filter(([, t]) => t.star)
        .map(([k]) => k)
    )
  );
  filterAndRender();
}

/* ===== Placeholder logic =============================== */
function extractPH(str) {
  const s = new Set();
  str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => s.add(p.trim())); // Match {{ token }}
  return [...s];
}
function openForm(title) {
  currentTemplate = title;
  const body = templatesCache[title].body;
  const ph = extractPH(body);
  if (!ph.length) {
    insertIntoGmail(body);
    return;
  }

  el.headline.textContent = title;
  el.inputs.innerHTML = "";
  ph.forEach((tok) => {
    el.inputs.insertAdjacentHTML(
      "beforeend",
      `<label class="input-group">
         <span>${esc(tok)}</span>
         <input data-token="${esc(tok)}" placeholder="${esc(tok)}" required>
       </label>`
    );
  });
  view.form();
  setTimeout(() => el.inputs.querySelector("input")?.focus(), 30);
}
el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  let filled = templatesCache[currentTemplate].body;
  el.inputs.querySelectorAll("input").forEach((inp) => {
    // Needed to escape special characters in the token
    const re = new RegExp(
      `\\{\\{\\s*${escRe(inp.dataset.token)}\\s*\\}\\}`,
      "g"
    );
    filled = filled.replace(re, inp.value.trim());
  });
  insertIntoGmail(filled);
});

/* ===== Gmail insertion (unchanged) ===================== */
async function insertIntoGmail(content) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) return alert("Open Gmail.");
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [content],
      func: (raw) => {
        const sel = [
          'div[contenteditable="true"][aria-label="Message Body"]',
          'div[role="textbox"][contenteditable="true"]',
          ".Am.Al.editable.LW-avf",
        ];
        let box = null;
        for (const css of sel) {
          box = [...document.querySelectorAll(css)].find(
            (el) => el.isContentEditable && el.offsetParent
          );
          if (box) break;
        }
        if (!box) return { ok: false, msg: "Compose not found" };
        const norm = raw.replace(/\r\n|\r/g, "\n").replace(/\n{3,}/g, "\n\n");
        const html = norm
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
          .replace(/\n\n/g, "{{D}}")
          .replace(/\n/g, "<br>")
          .replace(/\{\{D\}\}/g, "<br><br>");
        box.innerHTML = html;
        box.focus();
        const r = document.createRange();
        r.selectNodeContents(box);
        r.collapse(false);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        ["input", "change", "keyup"].forEach((ev) =>
          box.dispatchEvent(new Event(ev, { bubbles: true }))
        );
        return { ok: true };
      },
    });
    if (!result.ok) alert(result.msg);
    else setTimeout(() => window.close(), 120);
  } catch (e) {
    console.error(e);
    alert("Insertion failed.");
  }
}

/* ===== Keyboard navigation ============================= */
function handleKeydown(e) {
  /* --- Chips row navigation --- */
  if (document.activeElement.classList.contains("chip")) {
    const chips = [...el.chips.querySelectorAll(".chip")];
    let idx = chips.indexOf(document.activeElement);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      chips[(idx + 1) % chips.length].focus();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      chips[(idx - 1 + chips.length) % chips.length].focus();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      el.list.querySelector(".tmpl-btn")?.focus();
    }
    return;
  }

  /* --- List view navigation --- */
  if (currentView === "list") {
    const btns = [...el.list.querySelectorAll(".tmpl-btn")];
    if (!btns.length) return;

    let idx = btns.indexOf(document.activeElement);
    if (idx === -1 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      idx = 0;
      e.preventDefault();
      btns[0].focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      btns[(idx + 1) % btns.length].focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      btns[(idx - 1 + btns.length) % btns.length].focus();
    }
    if (/^[1-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10) - 1;
      btns[n]?.click();
    }
    if (e.key === "Enter" && document.activeElement !== el.search) {
      e.preventDefault();
      document.activeElement.click();
    }
    if (e.key === "Escape") {
      el.search.value = "";
      filterAndRender("");
      el.search.focus();
    }
    return;
  }

  /* --- Form view shortcuts --- */
  if (currentView === "form" && e.key === "Escape") {
    e.preventDefault();
    view.list();
    el.search.focus();
  }
}

/* ===== Init ============================================ */
document.addEventListener("DOMContentLoaded", async () => {
  view.loading();
  templatesCache = await fetchTemplates();
  if (!Object.keys(templatesCache).length) {
    view.empty();
    return;
  }

  /* restore stars */
  const starSet = await loadStars();
  Object.entries(templatesCache).forEach(([k, v]) => {
    v.star = starSet.has(k);
  });

  renderChips();
  filterAndRender("");
  el.chips.querySelector(".chip")?.focus(); // initial focus

  /* listeners */
  el.search.addEventListener("input", () => filterAndRender());
  el.back.addEventListener("click", () => view.list());
  document.addEventListener("keydown", handleKeydown);
});
