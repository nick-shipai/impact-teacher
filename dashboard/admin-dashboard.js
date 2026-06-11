const API_URL = "https://ai-impact-server.vercel.app";

let currentFilter = "today";

const filterLabels = {
    today: "Today",
    this_week: "This Week",
    last_month: "Last Month"
};

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

async function LoadTopStats() {
    try {
        const response = await fetch(`${API_URL}/api/admin/dashboard-stats?filter=${currentFilter}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            console.error("Load stats failed:", data.message);
            return;
        }

        const stats = data.stats || {};

        setStatValue("Total Users", stats.totalUsers);
        setStatValue("Active Jobs", stats.activeJobs);
        setStatValue("Pending Jobs", stats.pendingJobs);
        setStatValue("Applications", stats.applications);
        setStatValue("Total Revenue", formatRevenue(stats.totalRevenue));

    } catch (error) {
        console.error("LoadTopStats error:", error);
    }
}

async function LoadDashboardFeed() {
    try {
        setJobsLoading();
        setActivitiesLoading();

        const response = await fetch(`${API_URL}/api/admin/dashboard-feed?filter=${currentFilter}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            console.error("Load feed failed:", data.message);
            renderJobs([]);
            renderActivities([]);
            return;
        }

        renderJobs(data.newJobsToVerify || []);
        renderActivities(data.activities || []);

    } catch (error) {
        console.error("LoadDashboardFeed error:", error);
        renderJobs([]);
        renderActivities([]);
    }
}

async function LoadSystemStatus() {
    try {
        const response = await fetch(`${API_URL}/api/admin/system-status`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            console.error("Load system status failed:", data.message);
            setSystemStatusFallback();
            return;
        }

        renderSystemStatus(data.status || {});

    } catch (error) {
        console.error("LoadSystemStatus error:", error);
        setSystemStatusFallback();
    }
}

async function LoadAllUsersPreview() {
    try {
        const response = await fetch(`${API_URL}/api/admin/accounts?limit=7&sort=newest&type=all`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            console.error("Load users preview failed:", data.message);
            renderUsersPreview([]);
            return;
        }

        renderUsersPreview(data.accounts || [], Number(data.summary?.totalAccounts || 0));

    } catch (error) {
        console.error("LoadAllUsersPreview error:", error);
        renderUsersPreview([]);
    }
}

function setSystemStatusFallback() {
    renderSystemStatus({
        server: { label: "Offline", state: "offline", message: "Unable to load API status" },
        database: { label: "Unknown", state: "offline", message: "Database status unavailable" },
        storage: { label: "Unknown", state: "offline", message: "Storage status unavailable" },
        uptime: { label: "--", state: "offline", message: "Uptime unavailable" }
    });
}

function renderSystemStatus(status = {}) {
    const apply = (textId, dotId, item) => {
        const text = document.getElementById(textId);
        const dot = document.getElementById(dotId);
        if (text) text.textContent = `${item?.label || "--"}${item?.message ? ` · ${item.message}` : ""}`;
        if (dot) {
            const state = String(item?.state || "").toLowerCase();
            dot.style.background = state === "online" ? "#22c55e" : state === "warning" ? "#f59e0b" : "#ef476f";
            dot.style.boxShadow = state === "online" ? "0 0 12px rgba(34,197,94,.8)" : state === "warning" ? "0 0 12px rgba(245,158,11,.8)" : "0 0 12px rgba(239,71,111,.8)";
        }
    };

    apply("statusServerText", "statusServerDot", status.server);
    apply("statusDatabaseText", "statusDatabaseDot", status.database);
    apply("statusStorageText", "statusStorageDot", status.storage);
    apply("statusUptimeText", "statusUptimeDot", status.uptime);
}

function renderUsersPreview(users = [], total = 0) {
    const tbody = document.getElementById("usersTable");
    const button = document.getElementById("usersViewMoreBtn");

    if (!tbody) return;

    const preview = users.slice(0, 7);
    const shouldShowMore = Number(total || users.length) > 7;

    if (button) {
        button.classList.toggle("hidden", !shouldShowMore);
        button.textContent = shouldShowMore ? "View More" : "View All Users";
    }

    if (!preview.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    <i class="fa-solid fa-users"></i>
                    No users loaded yet
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = preview.map(user => `
        <tr>
            <td>
                <div class="table-user-cell">
                    <div class="table-avatar">${escapeHTML(getInitials(user.fullname || user.email || "U"))}</div>
                    <div>
                        <strong>${escapeHTML(user.fullname || "Unknown User")}</strong>
                        <p>${escapeHTML(user.uid || "")}</p>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(user.email || "")}</td>
            <td><span class="row-pill purple">${escapeHTML(user.accountType || user.role || "student")}</span></td>
            <td><span class="row-pill ${escapeHTML(getRowStatusClass(user.status))}">${escapeHTML(user.status || "active")}</span></td>
            <td>${escapeHTML(formatDate(user.createdAt))}</td>
            <td>
                <button class="mini-action" onclick="window.location.href='./accounts/?tab=${encodeURIComponent(user.accountType || user.role || 'student')}&search=${encodeURIComponent(user.email || user.fullname || '')}'">View</button>
            </td>
        </tr>
    `).join("");
}

function getInitials(value) {
    const parts = String(value || "U").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join("").toUpperCase() || "U";
}

function getRowStatusClass(status) {
    const value = String(status || "").toLowerCase();
    if (["active", "approved", "published", "paid", "completed"].includes(value)) return "green";
    if (["pending", "pending_review", "reviewing", "draft", "needs_manual_review"].includes(value)) return "yellow";
    if (["disabled", "blocked", "rejected", "failed"].includes(value)) return "red";
    return "blue";
}

function setStatValue(cardTitle, value) {
    document.querySelectorAll(".stat-card").forEach(card => {
        const title = card.querySelector("p");
        const number = card.querySelector("h2");
        const status = card.querySelector("span");

        if (!title || !number) return;

        if (title.textContent.trim().toLowerCase() === cardTitle.toLowerCase()) {
            number.textContent = value ?? 0;
            if (status) status.textContent = `${filterLabels[currentFilter]} data loaded`;
        }
    });
}

function cutWords(text, maxWords = 7) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);

    if (words.length <= maxWords) return words.join(" ");

    return words.slice(0, maxWords).join(" ") + "...";
}

function goToAllJobsToVerify() {
    window.location.href = "./pending-jobs";
}

function goToAllActivities() {
    window.location.href = "./recent-activities";
}

function setJobsLoading() {
    const panel = document.querySelector(".jobs-panel");
    if (!panel) return;

    const body = panel.querySelector(".empty-state, .job-list");
    if (body) {
        body.outerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <h4>Loading jobs...</h4>
        <p>Please wait while jobs are loaded.</p>
      </div>
    `;
    }
}

function setActivitiesLoading() {
    const panel = document.querySelector(".activities-panel");
    if (!panel) return;

    const body = panel.querySelector(".activity-empty, .activity-list");
    if (body) {
        body.outerHTML = `
      <div class="activity-empty">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <h4>Loading activities...</h4>
        <p>Please wait while activities are loaded.</p>
      </div>
    `;
    }
}

function renderJobs(jobs) {
    const panel = document.querySelector(".jobs-panel");
    if (!panel) return;

    const visibleJobs = jobs.slice(0, 4);
    const hasMore = jobs.length > 4;

    const counter = panel.querySelector(".panel-head h3 span");
    if (counter) counter.textContent = `${jobs.length} New`;

    const body = panel.querySelector(".empty-state, .job-list");
    if (!body) return;

    if (!jobs.length) {
        body.outerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-briefcase"></i>
        <h4>No jobs found</h4>
        <p>No jobs to verify for ${filterLabels[currentFilter]}.</p>
      </div>
    `;
        return;
    }

    body.outerHTML = `
    <div class="job-list">
      ${visibleJobs.map(job => `
        <div class="job-item">
          <div class="job-left">
            <div class="job-icon">
              <i class="fa-solid fa-briefcase"></i>
            </div>

            <div class="job-info">
              <h4 title="${escapeHTML(job.title || "Untitled Job")}">
                ${escapeHTML(cutWords(job.title || "Untitled Job", 7))}
              </h4>

              <div class="job-meta">
                <span><i class="fa-solid fa-layer-group"></i>${escapeHTML(job.category || "No category")}</span>
                <span><i class="fa-regular fa-calendar"></i>${formatDate(job.postedAt)}</span>
              </div>
            </div>
          </div>

          <div class="job-right">
            <strong>${escapeHTML(job.currency || "USD")} ${Number(job.budgetAmount || 0).toLocaleString()}</strong>
            
            <button onclick="GoToVerifyJob('${escapeHTML(job.jobId || job.id || "")}')">
              Review
            </button>
          </div>
        </div>
      `).join("")}

      ${hasMore ? `
        <button class="load-more-feed-btn" onclick="goToAllJobsToVerify()">
          View all ${jobs.length} jobs
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      ` : ""}
    </div>
  `;
}

function renderActivities(activities) {
    const panel = document.querySelector(".activities-panel");
    if (!panel) return;

    const visibleActivities = activities.slice(0, 4);
    const hasMore = activities.length > 4;

    const body = panel.querySelector(".activity-empty, .activity-list");
    if (!body) return;

    if (!activities.length) {
        body.outerHTML = `
      <div class="activity-empty">
        <i class="fa-regular fa-bell"></i>
        <h4>No activities yet</h4>
        <p>No activities found for ${filterLabels[currentFilter]}.</p>
      </div>
    `;
        return;
    }

    body.outerHTML = `
    <div class="activity-list">
      ${visibleActivities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fa-solid ${escapeHTML(activity.icon || "fa-bell")}"></i>
          </div>

          <div class="activity-info">
            <h4>${escapeHTML(activity.title || "Activity")}</h4>
            <p>${escapeHTML(cutWords(activity.message || "", 12))}</p>
            <span>${formatDate(activity.createdAt)}</span>
          </div>
        </div>
      `).join("")}

      ${hasMore ? `
        <button class="load-more-feed-btn" onclick="goToAllActivities()">
          View all ${activities.length} activities
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      ` : ""}
    </div>
  `;
}

function setupDateDropdown() {
    const dateBtn = document.querySelector(".date-btn");
    const welcome = document.querySelector(".welcome");

    if (!dateBtn || !welcome) return;

    const wrapper = document.createElement("div");
    wrapper.className = "date-filter-wrap";

    dateBtn.parentNode.insertBefore(wrapper, dateBtn);
    wrapper.appendChild(dateBtn);

    wrapper.insertAdjacentHTML("beforeend", `
    <div class="date-dropdown">
      <button data-filter="today" class="active">Today</button>
      <button data-filter="this_week">This Week</button>
      <button data-filter="last_month">Last Month</button>
    </div>
  `);

    const dropdown = wrapper.querySelector(".date-dropdown");

    dateBtn.addEventListener("click", () => {
        dropdown.classList.toggle("show");
    });

    dropdown.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", async () => {
            currentFilter = btn.dataset.filter;

            dropdown.querySelectorAll("button").forEach(item => item.classList.remove("active"));
            btn.classList.add("active");

            dateBtn.innerHTML = `
        <i class="fa-regular fa-calendar"></i>
        ${filterLabels[currentFilter]}
        <i class="fa-solid fa-chevron-down"></i>
      `;

            dropdown.classList.remove("show");

            await LoadTopStats();
            await LoadDashboardFeed();
            await LoadDashboardCharts();
        });
    });

    document.addEventListener("click", e => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove("show");
        }
    });
}

function formatRevenue(amount) {
    return "$" + Number(amount || 0).toLocaleString();
}

function formatDate(timestamp) {
    if (!timestamp) return "No date";
    return new Date(Number(timestamp)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", async function () {
    setupDateDropdown();
    setupChartTabs();
    setupChartFilterButton();

    const auth = await ValidateAdmin();
    if (!auth.success) return;

    await LoadSystemStatus();
    await LoadTopStats();
    await LoadDashboardFeed();
    await LoadAllUsersPreview();
    await LoadDashboardCharts();
});

document.querySelectorAll(".menu a").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".menu a").forEach(item => item.classList.remove("active"));
        link.classList.add("active");
    });
});

document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector(".search-box input")?.focus();
    }
});

async function LogoutAdmin() {
    try {
        await fetch(`${API_URL}/api/admin/logout`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        localStorage.removeItem("impact_admin");
        window.location.href = "../admin-login";

    } catch (error) {
        console.error("Logout error:", error);
    }
}
function setupSidebarShrink() {
    const sidebar = document.querySelector(".sidebar");
    const menuLinks = document.querySelectorAll(".menu a");

    if (!sidebar) return;

    sidebar.classList.remove("sidebar-open");

    menuLinks.forEach(link => {
        [...link.childNodes].forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                const span = document.createElement("span");
                span.className = "menu-text";
                span.textContent = node.textContent.trim();
                node.replaceWith(span);
            }
        });

        if (!link.getAttribute("title")) {
            link.setAttribute("title", link.textContent.trim());
        }
    });

    sidebar.addEventListener("mouseenter", () => {
        sidebar.classList.add("sidebar-open");
    });

    sidebar.addEventListener("mouseleave", () => {
        sidebar.classList.remove("sidebar-open");
    });
}

setupSidebarShrink();
document.querySelectorAll(".menu-group > a").forEach(groupBtn => {
    groupBtn.addEventListener("click", function (e) {
        e.preventDefault();

        const group = this.closest(".menu-group");
        if (!group) return;

        document.querySelectorAll(".menu-group").forEach(item => {
            if (item !== group) item.classList.remove("open");
        });

        group.classList.toggle("open");
    });
});
let dashboardChart = null;
let chartPayload = null;
let activeChartType = "users";

async function LoadDashboardCharts() {
    try {
        setChartLoading();

        const response = await fetch(`${API_URL}/api/admin/dashboard-charts?filter=${currentFilter}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            console.error("Load charts failed:", data.message);
            renderChartEmpty();
            return;
        }

        chartPayload = data.chart || {};
        renderDashboardChart(activeChartType);

    } catch (error) {
        console.error("LoadDashboardCharts error:", error);
        renderChartEmpty();
    }
}

function setChartLoading() {
    const box = document.querySelector(".chart-box");
    if (!box) return;

    box.innerHTML = `
    <div class="chart-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Loading chart data...</p>
    </div>
  `;
}

function renderChartEmpty() {
    const box = document.querySelector(".chart-box");
    if (!box) return;

    box.innerHTML = `
    <div class="chart-loading">
      <i class="fa-solid fa-chart-line"></i>
      <p>No chart data found</p>
    </div>
  `;
}

function renderDashboardChart(type = "users") {
    const box = document.querySelector(".chart-box");
    if (!box || !chartPayload) return;

    box.innerHTML = `<canvas id="dashboardChart"></canvas>`;

    const canvas = document.getElementById("dashboardChart");
    if (!canvas) return;

    const labels = chartPayload.labels || [];
    const values = chartPayload[type] || [];

    const chartNames = {
        users: "Users Growth",
        jobs: "Jobs Posted",
        applications: "Applications",
        revenue: "Revenue"
    };

    if (dashboardChart) {
        dashboardChart.destroy();
    }

    dashboardChart = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: chartNames[type] || "Analytics",
                data: values,
                fill: true,
                tension: 0.42,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 7,
                borderColor: "#8b5cf6",
                pointBackgroundColor: "#38bdf8",
                backgroundColor: "rgba(139, 92, 246, 0.16)"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#cbd5e1"
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#94a3b8" },
                    grid: { color: "rgba(255,255,255,.06)" }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#94a3b8" },
                    grid: { color: "rgba(255,255,255,.06)" }
                }
            }
        }
    });
}

function setupChartTabs() {
    document.querySelectorAll(".chart-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".chart-tab").forEach(item => {
                item.classList.remove("active");
            });

            btn.classList.add("active");
            activeChartType = btn.dataset.chart || "users";
            renderDashboardChart(activeChartType);
        });
    });
}
function setupChartFilterButton() {
    const btn = document.querySelector(".chart-filter-btn");
    if (!btn) return;

    const filters = ["today", "this_week", "last_month"];
    let index = 1;

    btn.addEventListener("click", async () => {
        index = (index + 1) % filters.length;
        currentFilter = filters[index];

        btn.innerHTML = `
      ${filterLabels[currentFilter]}
      <i class="fa-solid fa-chevron-down"></i>
    `;

        await LoadTopStats();
        await LoadDashboardFeed();
        await LoadDashboardCharts();
    });
}
function GoToVerifyJob(jobId) {
    if (!jobId) {
        console.error("No jobId found");
        return;
    }

    window.location.href = `../dashboard/verify-job/?jobId=${encodeURIComponent(jobId)}`;
}
