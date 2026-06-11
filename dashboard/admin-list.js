const API_URL = "https://ai-impact-server.vercel.app";

const CONFIG = window.ADMIN_LIST_CONFIG || {};

const urlParams = new URLSearchParams(window.location.search);

function getInitialFilterValue(name, fallback = "") {
  const value = urlParams.get(name);
  return value !== null && value !== "" ? value : fallback;
}

const state = {
  search: getInitialFilterValue("search", ""),
  sort: getInitialFilterValue("sort", CONFIG.defaultSort || "newest"),
  filters: {}
};

for (const filter of Array.isArray(CONFIG.filters) ? CONFIG.filters : []) {
  const firstOption = Array.isArray(filter.options) && filter.options.length ? filter.options[0].value : "";
  state.filters[filter.name] = getInitialFilterValue(filter.name, firstOption);
}

async function ValidateAdmin() {
  try {
    const response = await fetch(`${API_URL}/api/admin/validate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      localStorage.removeItem("impact_admin");
      window.location.href = "https://nx7-vault-core.impactacademy.site";
      return { success: false, admin: null };
    }

    if (data.admin) {
      localStorage.setItem("impact_admin", JSON.stringify(data.admin));
    }

    return { success: true, admin: data.admin };
  } catch (error) {
    console.error("ValidateAdmin error:", error);
    localStorage.removeItem("impact_admin");
    window.location.href = "https://nx7-vault-core.impactacademy.site";
    return { success: false, admin: null };
  }
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
  if (!timestamp) return "No date";
  return new Date(Number(timestamp)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(timestamp) {
  if (!timestamp) return "No date";
  return new Date(Number(timestamp)).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMoney(amount, currency = "USD") {
  const value = Number(amount || 0).toLocaleString();
  return `${currency} ${value}`;
}

function getInitials(value) {
  const parts = String(value || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function getStatusClass(status) {
  const text = String(status || "").toLowerCase();

  if (["active", "published", "approved", "paid", "successful", "completed", "open"].includes(text)) return "green";
  if (["pending", "pending_review", "reviewing", "manual_review", "draft"].includes(text)) return "yellow";
  if (["disabled", "blocked", "rejected", "failed", "cancelled"].includes(text)) return "red";
  if (["new", "info"].includes(text)) return "blue";
  return "neutral";
}

function getViewConfig() {
  return {
    title: CONFIG.title || "Admin List",
    subtitle: CONFIG.subtitle || "",
    endpoint: CONFIG.endpoint || "/api/admin/users",
    emptyTitle: CONFIG.emptyTitle || "Nothing to show",
    emptyText: CONFIG.emptyText || "Try changing the search or filters.",
    rowType: CONFIG.rowType || "users",
    defaultLimit: CONFIG.defaultLimit || 100,
    filters: Array.isArray(CONFIG.filters) ? CONFIG.filters : [],
    sortOptions: Array.isArray(CONFIG.sortOptions) ? CONFIG.sortOptions : []
  };
}

function setPageMeta() {
  const config = getViewConfig();
  document.title = `${config.title} - Impactech Admin`;

  const heading = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  const badge = document.getElementById("heroBadge");
  const countLabel = document.getElementById("recordCount");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptyText = document.getElementById("emptyText");

  if (heading) heading.textContent = config.title;
  if (subtitle) subtitle.textContent = config.subtitle;
  if (badge) badge.textContent = config.title;
  if (countLabel) countLabel.textContent = "0 records";
  if (emptyTitle) emptyTitle.textContent = config.emptyTitle;
  if (emptyText) emptyText.textContent = config.emptyText;
}

function renderFilters() {
  const filtersWrap = document.getElementById("filters");
  const sortWrap = document.getElementById("sortWrap");
  const config = getViewConfig();

  if (!filtersWrap || !sortWrap) return;

  filtersWrap.innerHTML = config.filters.map(filter => {
    const options = (filter.options || []).map(option => `
      <option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>
    `).join("");

    return `
      <select class="filter-select" data-filter="${escapeHTML(filter.name)}">
        ${options}
      </select>
    `;
  }).join("");

  sortWrap.innerHTML = `
    <select class="filter-select" id="sortSelect">
      ${(config.sortOptions || []).map(option => `
        <option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>
      `).join("")}
    </select>
  `;

  filtersWrap.querySelectorAll("select[data-filter]").forEach(select => {
    if (state.filters[select.dataset.filter] !== undefined) {
      select.value = state.filters[select.dataset.filter];
    }

    select.addEventListener("change", () => {
      state.filters[select.dataset.filter] = select.value;
      loadRecords();
    });
  });

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.value = state.sort;
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      loadRecords();
    });
  }
}

function renderTableHead() {
  const thead = document.getElementById("tableHead");
  const config = getViewConfig();
  if (!thead) return;

  const columns = config.rowType === "activities"
    ? ["Activity", "Source", "Created"]
    : config.rowType === "jobs"
      ? ["Job", "Status", "Review", "Payment", "Posted", "Actions"]
      : ["User", "Role", "Status", "Joined", "Actions"];

  thead.innerHTML = `
    <tr>
      ${columns.map(column => `<th>${escapeHTML(column)}</th>`).join("")}
    </tr>
  `;
}

function renderRows(items) {
  const tbody = document.getElementById("tableBody");
  const empty = document.getElementById("emptyState");
  const tableWrap = document.getElementById("tableWrap");
  const count = document.getElementById("recordCount");
  const config = getViewConfig();

  if (!tbody || !empty || !tableWrap) return;

  if (count) count.textContent = `${items.length} record${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    tbody.innerHTML = "";
    tableWrap.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  tableWrap.classList.remove("hidden");
  empty.classList.add("hidden");

  if (config.rowType === "activities") {
    tbody.innerHTML = items.map(activity => `
      <tr>
        <td>
          <div class="table-activity">
            <div class="row-icon"><i class="fa-solid ${escapeHTML(activity.icon || "fa-bell")}"></i></div>
            <div>
              <div class="row-title">${escapeHTML(activity.title || "Activity")}</div>
              <div class="row-subtitle">${escapeHTML(activity.message || "")}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="pill ${getStatusClass(activity.sourceType || "neutral")}">${escapeHTML(activity.sourceType || "event")}</span>
        </td>
        <td>${escapeHTML(formatDateTime(activity.createdAt || 0))}</td>
      </tr>
    `).join("");
    return;
  }

  if (config.rowType === "jobs") {
    tbody.innerHTML = items.map(job => `
      <tr>
        <td>
          <div class="table-job">
            <div class="row-icon"><i class="fa-solid fa-briefcase"></i></div>
            <div>
              <div class="row-title">${escapeHTML(job.title || "Untitled Job")}</div>
              <div class="row-subtitle">${escapeHTML(job.category || "No category")} ${job.jobType ? `- ${escapeHTML(job.jobType)}` : ""}</div>
            </div>
          </div>
        </td>
        <td><span class="pill ${getStatusClass(job.jobStatus)}">${escapeHTML(job.jobStatus || "draft")}</span></td>
        <td><span class="pill ${getStatusClass(job.reviewStatus)}">${escapeHTML(job.reviewStatus || "pending_review")}</span></td>
        <td><span class="pill ${getStatusClass(job.paymentStatus)}">${escapeHTML(job.paymentStatus || "unpaid")}</span></td>
        <td>${escapeHTML(formatDate(job.postedAt || 0))}</td>
        <td>
          <div class="action-group">
            <a class="action-btn primary" href="../teacher-review/?jobId=${encodeURIComponent(job.jobId || "")}">Review</a>
            <button class="action-btn ghost" data-copy="${escapeHTML(job.jobId || "")}">Copy ID</button>
          </div>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const value = btn.getAttribute("data-copy") || "";
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          btn.textContent = "Copied";
          setTimeout(() => { btn.textContent = "Copy ID"; }, 900);
        } catch {
          btn.textContent = value;
        }
      });
    });

    return;
  }

  tbody.innerHTML = items.map(user => `
    <tr>
      <td>
        <div class="table-user">
          <div class="row-avatar">${escapeHTML(getInitials(user.fullname || user.email || user.uid || "U"))}</div>
          <div>
            <div class="row-title">${escapeHTML(user.fullname || "Unknown User")}</div>
            <div class="row-subtitle">${escapeHTML(user.email || user.uid || "")}</div>
          </div>
        </div>
      </td>
      <td><span class="pill purple">${escapeHTML(user.role || "student")}</span></td>
      <td><span class="pill ${getStatusClass(user.status)}">${escapeHTML(user.status || "active")}</span></td>
      <td>${escapeHTML(formatDate(user.createdAt || 0))}</td>
      <td>
        <div class="action-group">
          <a class="action-btn primary" href="mailto:${escapeHTML(user.email || "")}">Email</a>
          <button class="action-btn ghost" data-copy="${escapeHTML(user.uid || "")}">Copy ID</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-copy") || "";
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = "Copy ID"; }, 900);
      } catch {
        btn.textContent = value;
      }
    });
  });
}

function setLoading(isLoading) {
  const spinner = document.getElementById("loadingState");

  if (spinner) spinner.classList.toggle("hidden", !isLoading);
}

async function loadRecords() {
  const config = getViewConfig();
  const params = new URLSearchParams();
  params.set("limit", String(config.defaultLimit || 100));
  params.set("search", state.search || "");
  params.set("sort", state.sort || "newest");

  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, value);
    }
  });

  setLoading(true);

  try {
    const response = await fetch(`${API_URL}${config.endpoint}?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      renderRows([]);
      return;
    }

    let items = data[config.rowType] || [];

    if (config.rowType === "activities" && state.search) {
      const term = state.search.toLowerCase();
      items = items.filter(activity => [
        activity.title,
        activity.message,
        activity.sourceType,
        activity.sourceId
      ].some(value => String(value || "").toLowerCase().includes(term)));
    }

    renderRows(items);
  } catch (error) {
    console.error("loadRecords error:", error);
    renderRows([]);
  } finally {
    setLoading(false);
  }
}

async function setupPage() {
  const auth = await ValidateAdmin();
  if (!auth.success) return;

  setPageMeta();
  renderFilters();
  renderTableHead();

  const searchInput = document.getElementById("searchInput");
  const refreshBtn = document.getElementById("refreshBtn");

  if (searchInput) {
    searchInput.value = state.search;
    let timer = null;
    searchInput.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        state.search = searchInput.value.trim();
        loadRecords();
      }, 180);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadRecords());
  }

  await loadRecords();
}

document.addEventListener("DOMContentLoaded", setupPage);
