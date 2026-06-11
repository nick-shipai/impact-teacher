const API_URL = "https://ai-impact-server.vercel.app";

const state = {
  tab: "all",
  search: "",
  status: "all",
  sort: "newest",
  items: [],
  summary: {},
  selectedUid: "",
  selectedAccount: null,
  loading: false
};

const urlParams = new URLSearchParams(window.location.search);
const initialTab = String(urlParams.get("tab") || "all").toLowerCase();

const tabMeta = {
  all: {
    title: "All Users",
    subtitle: "Browse every account across all roles in one view.",
    icon: "fa-users"
  },
  student: {
    title: "Students",
    subtitle: "Review student setup progress and account state.",
    icon: "fa-graduation-cap"
  },
  freelancer: {
    title: "Freelancers",
    subtitle: "Inspect skills, profiles, and freelance setup data.",
    icon: "fa-briefcase"
  },
  client: {
    title: "Clients",
    subtitle: "Manage client accounts, company data, and posted jobs.",
    icon: "fa-building"
  },
  teacher: {
    title: "Teachers",
    subtitle: "Review teacher profiles, credentials, and submitted documents.",
    icon: "fa-chalkboard-user"
  }
};

if (tabMeta[initialTab]) {
  state.tab = initialTab;
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(value) {
  return String(value || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase() || "?";
}

function formatDate(timestamp) {
  if (!timestamp) return "--";
  return new Date(Number(timestamp)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMoney(amount, currency = "USD") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();
  if (["active", "approved", "published", "paid", "completed"].includes(value)) return "green";
  if (["pending", "pending_review", "reviewing", "draft", "needs_manual_review"].includes(value)) return "yellow";
  if (["disabled", "blocked", "rejected", "failed"].includes(value)) return "red";
  return "blue";
}

async function validateAdmin() {
  const response = await fetch(`${API_URL}/api/admin/validate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    window.location.href = "https://nx7-vault-core.impactacademy.site";
    return false;
  }

  return true;
}

function setLoading(isLoading) {
  state.loading = isLoading;
  document.getElementById("loadingState")?.classList.toggle("hidden", !isLoading);
}

function updateTabLabels() {
  const meta = tabMeta[state.tab];
  const listTitle = document.getElementById("listTitle");
  const listSubtitle = document.getElementById("listSubtitle");
  if (listTitle) listTitle.textContent = meta.title;
  if (listSubtitle) listSubtitle.textContent = meta.subtitle;
}

function renderMetrics() {
  const box = document.getElementById("heroMetrics");
  if (!box) return;

  const summary = state.summary || {};
  const cards = [
    { icon: "fa-users", value: summary.totalAccounts ?? 0, label: "Total accounts" },
    { icon: "fa-user-graduate", value: summary.studentCount ?? 0, label: "Students" },
    { icon: "fa-briefcase", value: summary.freelancerCount ?? 0, label: "Freelancers" },
    { icon: "fa-building", value: summary.clientCount ?? 0, label: "Clients" },
    { icon: "fa-chalkboard-user", value: summary.teacherCount ?? 0, label: "Teachers" },
    { icon: "fa-circle-check", value: summary.setupCompletedCount ?? 0, label: "Setup complete" }
  ];

  box.innerHTML = cards.map(card => `
    <div class="metric">
      <i class="fa-solid ${escapeHTML(card.icon)}"></i>
      <strong>${escapeHTML(card.value)}</strong>
      <span>${escapeHTML(card.label)}</span>
    </div>
  `).join("");
}

function renderSummaryCards() {
  const box = document.getElementById("summaryGrid");
  if (!box) return;

  const summary = state.summary || {};
  const cards =
    state.tab === "all"
      ? [
          { label: "All Users", value: summary.totalAccounts ?? 0, note: "Every account on the platform" },
          { label: "Students", value: summary.studentCount ?? 0, note: "Student accounts" },
          { label: "Freelancers", value: summary.freelancerCount ?? 0, note: "Freelancer accounts" },
          { label: "Clients", value: summary.clientCount ?? 0, note: "Client accounts" },
          { label: "Teachers", value: summary.teacherCount ?? 0, note: "Teacher accounts" }
        ]
      : state.tab === "student"
        ? [
            { label: "Students", value: summary.studentCount ?? 0, note: "All student accounts" },
            { label: "Setup done", value: summary.setupCompletedCount ?? 0, note: "Completed onboarding" },
            { label: "Setup pending", value: summary.pendingSetupCount ?? 0, note: "Needs setup" },
            { label: "Active", value: state.items.filter(item => item.status === "active").length, note: "Currently active" },
            { label: "Disabled", value: state.items.filter(item => item.status === "disabled").length, note: "Temporarily disabled" }
          ]
        : state.tab === "freelancer"
          ? [
              { label: "Freelancers", value: summary.freelancerCount ?? 0, note: "All freelancer accounts" },
              { label: "Setup done", value: summary.setupCompletedCount ?? 0, note: "Completed onboarding" },
              { label: "Active", value: state.items.filter(item => item.status === "active").length, note: "Currently active" },
              { label: "Avg. skills", value: Math.round(state.items.reduce((sum, item) => sum + Number(item.counts?.freelancerSkills || 0), 0) / Math.max(state.items.length, 1)), note: "Per freelancer" },
              { label: "Blocked", value: state.items.filter(item => item.status === "blocked").length, note: "Needs attention" }
            ]
          : state.tab === "teacher"
            ? [
                { label: "Teachers", value: summary.teacherCount ?? 0, note: "All teacher accounts" },
                { label: "Setup done", value: state.items.filter(item => item.setupCompleted).length, note: "Completed onboarding" },
                { label: "Setup pending", value: state.items.filter(item => !item.setupCompleted).length, note: "Needs setup" },
                { label: "Active", value: state.items.filter(item => item.status === "active").length, note: "Currently active" },
                { label: "Disabled", value: state.items.filter(item => item.status === "disabled").length, note: "Temporarily disabled" }
              ]
            : [
                { label: "Clients", value: summary.clientCount ?? 0, note: "All client accounts" },
                { label: "Setup done", value: summary.setupCompletedCount ?? 0, note: "Completed onboarding" },
                { label: "Jobs posted", value: state.items.reduce((sum, item) => sum + Number(item.counts?.clientJobs || 0), 0), note: "Across clients" },
                { label: "Pending jobs", value: state.items.reduce((sum, item) => sum + Number(item.counts?.clientPendingJobs || 0), 0), note: "Awaiting review" },
                { label: "Active", value: state.items.filter(item => item.status === "active").length, note: "Currently active" }
              ];

  box.innerHTML = cards.map(card => `
    <article class="overview-card">
      <small>${escapeHTML(card.label)}</small>
      <h4>${escapeHTML(card.value)}</h4>
      <span>${escapeHTML(card.note)}</span>
    </article>
  `).join("");
}

function renderTableHead() {
  const head = document.getElementById("tableHead");
  if (!head) return;

  const columns =
    state.tab === "all"
      ? ["User", "Role", "Status", "Joined", "Actions"]
      : state.tab === "student"
        ? ["Student", "Setup", "Status", "Joined", "Actions"]
        : state.tab === "freelancer"
          ? ["Freelancer", "Skills", "Rate", "Status", "Joined", "Actions"]
          : state.tab === "teacher"
            ? ["Teacher", "Categories", "Experience", "Status", "Joined", "Actions"]
            : ["Client", "Company", "Jobs", "Status", "Joined", "Actions"];

  head.innerHTML = `<tr>${columns.map(col => `<th>${escapeHTML(col)}</th>`).join("")}</tr>`;
}

function renderRows() {
  const body = document.getElementById("tableBody");
  const count = document.getElementById("recordCount");
  const emptyState = document.getElementById("emptyState");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptyText = document.getElementById("emptyText");
  const tableWrap = document.getElementById("tableWrap");
  if (!body || !count || !emptyState || !tableWrap) return;

  count.textContent = `${state.items.length} account${state.items.length === 1 ? "" : "s"}`;

  if (emptyTitle) emptyTitle.textContent = `No ${tabMeta[state.tab]?.title?.toLowerCase() || "accounts"} found`;
  if (emptyText) emptyText.textContent = "Try a different search or filter.";

  if (!state.items.length) {
    body.innerHTML = "";
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableWrap.classList.remove("hidden");

  body.innerHTML = state.items.map(item => {
    const active = state.selectedUid === item.uid ? "active-row" : "";

    if (state.tab === "all") {
      return `
        <tr class="${active}" data-uid="${escapeHTML(item.uid)}">
          <td>
            <div class="row-main">
              <div class="row-avatar">${escapeHTML(getInitials(item.fullname))}</div>
              <div>
                <div class="row-title">${escapeHTML(item.fullname)}</div>
                <div class="row-sub">${escapeHTML(item.email)}</div>
              </div>
            </div>
          </td>
          <td><span class="pill ${getStatusClass(item.accountType === "active" ? "active" : "blue")}">${escapeHTML(item.accountType || "user")}</span></td>
          <td><span class="pill ${getStatusClass(item.status)}">${escapeHTML(item.status || "active")}</span></td>
          <td>${escapeHTML(formatDate(item.createdAt))}</td>
          <td><button class="action-btn ghost" data-select="${escapeHTML(item.uid)}">View</button></td>
        </tr>
      `;
    }

    if (state.tab === "student") {
      return `
        <tr class="${active}" data-uid="${escapeHTML(item.uid)}">
          <td>
            <div class="row-main">
              <div class="row-avatar">${escapeHTML(getInitials(item.fullname))}</div>
              <div>
                <div class="row-title">${escapeHTML(item.fullname)}</div>
                <div class="row-sub">${escapeHTML(item.email)}</div>
              </div>
            </div>
          </td>
          <td><span class="pill ${getStatusClass(item.setupCompleted ? "active" : "pending")}">${escapeHTML(item.setupCompleted ? "Completed" : "Pending")}</span></td>
          <td><span class="pill ${getStatusClass(item.status)}">${escapeHTML(item.status || "active")}</span></td>
          <td>${escapeHTML(formatDate(item.createdAt))}</td>
          <td><button class="action-btn ghost" data-select="${escapeHTML(item.uid)}">View</button></td>
        </tr>
      `;
    }

    if (state.tab === "freelancer") {
      const skills = Array.isArray(item.setupSections?.freelancer?.skills) ? item.setupSections.freelancer.skills.length : 0;
      return `
        <tr class="${active}" data-uid="${escapeHTML(item.uid)}">
          <td>
            <div class="row-main">
              <div class="row-avatar">${escapeHTML(getInitials(item.fullname))}</div>
              <div>
                <div class="row-title">${escapeHTML(item.fullname)}</div>
                <div class="row-sub">${escapeHTML(item.email)}</div>
              </div>
            </div>
          </td>
          <td>${escapeHTML(String(skills))} skills</td>
          <td>${escapeHTML(formatMoney(item.setupSections?.freelancer?.hourlyRate || 0, "USD"))}</td>
          <td><span class="pill ${getStatusClass(item.status)}">${escapeHTML(item.status || "active")}</span></td>
          <td>${escapeHTML(formatDate(item.createdAt))}</td>
          <td><button class="action-btn ghost" data-select="${escapeHTML(item.uid)}">View</button></td>
        </tr>
      `;
    }

    if (state.tab === "teacher") {
      const categories = Number(item.counts?.teacherCategories || 0);
      const experience = item.setupSections?.teacher?.teachingExperience || "-";
      return `
        <tr class="${active}" data-uid="${escapeHTML(item.uid)}">
          <td>
            <div class="row-main">
              <div class="row-avatar">${escapeHTML(getInitials(item.fullname))}</div>
              <div>
                <div class="row-title">${escapeHTML(item.fullname)}</div>
                <div class="row-sub">${escapeHTML(item.email)}</div>
              </div>
            </div>
          </td>
          <td>${escapeHTML(String(categories))} ${categories === 1 ? "category" : "categories"}</td>
          <td>${escapeHTML(experience)}${experience && experience !== "-" ? " yrs" : ""}</td>
          <td><span class="pill ${getStatusClass(item.status)}">${escapeHTML(item.status || "active")}</span></td>
          <td>${escapeHTML(formatDate(item.createdAt))}</td>
          <td><button class="action-btn ghost" data-select="${escapeHTML(item.uid)}">View</button></td>
        </tr>
      `;
    }

    return `
      <tr class="${active}" data-uid="${escapeHTML(item.uid)}">
        <td>
          <div class="row-main">
            <div class="row-avatar">${escapeHTML(getInitials(item.fullname))}</div>
            <div>
              <div class="row-title">${escapeHTML(item.fullname)}</div>
              <div class="row-sub">${escapeHTML(item.email)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHTML(item.setupSections?.client?.companyName || item.clientSetup?.company?.companyName || "No company")}</td>
        <td>${escapeHTML(String(item.counts?.clientJobs || 0))}</td>
        <td><span class="pill ${getStatusClass(item.status)}">${escapeHTML(item.status || "active")}</span></td>
        <td>${escapeHTML(formatDate(item.createdAt))}</td>
        <td><button class="action-btn ghost" data-select="${escapeHTML(item.uid)}">View</button></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-select]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      selectAccount(btn.getAttribute("data-select") || "");
    });
  });

  body.querySelectorAll("tr[data-uid]").forEach(row => {
    row.addEventListener("click", () => selectAccount(row.getAttribute("data-uid") || ""));
  });
}

function renderEmptySection(title, icon, message) {
  return `
    <section class="section-empty">
      <i class="fa-solid ${escapeHTML(icon)}"></i>
      <div>
        <strong>${escapeHTML(title)}</strong>
        <span>${escapeHTML(message)}</span>
      </div>
    </section>
  `;
}

function renderStudentSection(account) {
  return `
    <section class="section">
      <h5><i class="fa-solid fa-user-graduate"></i> Student Setup</h5>
      <div class="kv-grid">
        <div class="kv"><small>Plan</small><strong>${escapeHTML(account.setupSections?.student?.plan || account.pendingSubscription?.plan || "No plan")}</strong></div>
        <div class="kv"><small>Billing Cycle</small><strong>${escapeHTML(account.setupSections?.student?.billingCycle || account.pendingSubscription?.billingCycle || "monthly")}</strong></div>
        <div class="kv"><small>Subscription Status</small><strong>${escapeHTML(account.pendingSubscription?.status || "none")}</strong></div>
        <div class="kv"><small>Setup Source</small><strong>${escapeHTML(account.setupType || "student")}</strong></div>
      </div>
    </section>
  `;
}

function renderFreelancerSection(account) {
  const skills = Array.isArray(account.setupSections?.freelancer?.skills) ? account.setupSections.freelancer.skills : [];
  return `
    <section class="section">
      <h5><i class="fa-solid fa-briefcase"></i> Freelancer Profile</h5>
      <div class="kv-grid">
        <div class="kv"><small>Experience</small><strong>${escapeHTML(account.setupSections?.freelancer?.experienceLevel || "-")}</strong></div>
        <div class="kv"><small>Hourly Rate</small><strong>${escapeHTML(formatMoney(account.setupSections?.freelancer?.hourlyRate || 0, "USD"))}</strong></div>
        <div class="kv"><small>Availability</small><strong>${escapeHTML(account.setupSections?.freelancer?.availability || "-")}</strong></div>
        <div class="kv"><small>Skills</small><strong>${escapeHTML(String(skills.length))}</strong></div>
      </div>
      <div style="margin-top:12px" class="kv"><small>Bio</small><p>${escapeHTML(account.setupSections?.freelancer?.bio || "No bio provided")}</p></div>
      <div style="margin-top:12px" class="kv"><small>Portfolio</small><p>${escapeHTML(account.setupSections?.freelancer?.portfolio || "No portfolio link")}</p></div>
    </section>
  `;
}

function renderClientSection(account) {
  const client = account.setupSections?.client || {};
  const recentJobs = Array.isArray(account.recentJobs) ? account.recentJobs : [];
  return `
    <section class="section">
      <h5><i class="fa-solid fa-building"></i> Client Business</h5>
      <div class="kv-grid">
        <div class="kv"><small>Company</small><strong>${escapeHTML(client.companyName || "No company")}</strong></div>
        <div class="kv"><small>Industry</small><strong>${escapeHTML(client.industry || "-")}</strong></div>
        <div class="kv"><small>Jobs Posted</small><strong>${escapeHTML(String(account.counts?.clientJobs || 0))}</strong></div>
        <div class="kv"><small>Pending Jobs</small><strong>${escapeHTML(String(account.counts?.clientPendingJobs || 0))}</strong></div>
      </div>
      <div style="margin-top:12px" class="kv"><small>Project</small><p>${escapeHTML(client.projectTitle || "No project title")}</p></div>
      <div style="margin-top:12px" class="kv"><small>Recent Jobs</small>
        <p>${recentJobs.length ? recentJobs.map(job => `${escapeHTML(job.title)} (${escapeHTML(job.reviewStatus)})`).join("<br />") : "No jobs posted yet"}</p>
      </div>
    </section>
  `;
}

function renderTeacherSection(account) {
  const teacher = account.setupSections?.teacher || {};
  const categories = Array.isArray(teacher.categories) ? teacher.categories : [];
  const isVerified = account.teacherAccountStatus === true;

  const docList = [
    { label: "CV / Resume", present: teacher.hasCV },
    { label: "Teaching Certificate", present: teacher.hasTeachingCertificate },
    { label: "Degree Certificate", present: teacher.hasDegree },
    { label: "Identity Card", present: teacher.hasIdCard }
  ];

  const verifyBlock = isVerified
    ? `<div style="margin-top:14px" class="kv">
        <small>Verification Status</small>
        <p><span class="pill green"><i class="fa-solid fa-circle-check"></i> Verified</span></p>
      </div>`
    : `<div style="margin-top:14px" class="kv">
        <small>Verification Status</small>
        <p>
          <span class="pill yellow"><i class="fa-solid fa-hourglass-half"></i> Pending Review</span>
          <a class="action-btn primary" style="margin-left:8px" href="../teacher-review/?uid=${encodeURIComponent(account.uid)}">
            <i class="fa-solid fa-shield-halved"></i> Verify Account
          </a>
        </p>
      </div>`;

  return `
    <section class="section">
      <h5><i class="fa-solid fa-chalkboard-user"></i> Teacher Profile</h5>
      <div class="kv-grid">
        <div class="kv"><small>Phone</small><strong>${escapeHTML(teacher.phone || "-")}</strong></div>
        <div class="kv"><small>Location</small><strong>${escapeHTML([teacher.city, teacher.country].filter(Boolean).join(", ") || "-")}</strong></div>
        <div class="kv"><small>Highest Qualification</small><strong>${escapeHTML(teacher.highestQualification || "-")}</strong></div>
        <div class="kv"><small>Major Subject</small><strong>${escapeHTML(teacher.majorSubject || "-")}</strong></div>
        <div class="kv"><small>Institution</small><strong>${escapeHTML(teacher.institution || "-")}</strong></div>
        <div class="kv"><small>Graduation Year</small><strong>${escapeHTML(teacher.graduationYear || "-")}</strong></div>
        <div class="kv"><small>Teaching Experience</small><strong>${escapeHTML(teacher.teachingExperience ? teacher.teachingExperience + " years" : "-")}</strong></div>
        <div class="kv"><small>Categories</small><strong>${escapeHTML(String(categories.length))}</strong></div>
      </div>
      ${categories.length ? `<div style="margin-top:12px" class="kv"><small>Subjects</small><p>${categories.map(c => escapeHTML(c)).join(", ")}</p></div>` : ""}
      <div style="margin-top:12px" class="kv">
        <small>Submitted Documents</small>
        <p>
          ${docList.map(doc => `<span class="pill ${doc.present ? "green" : "yellow"}">${escapeHTML(doc.label)}: ${doc.present ? "Uploaded" : "Missing"}</span>`).join(" ")}
        </p>
      </div>
      ${verifyBlock}
    </section>
  `;
}

function renderRoleSections(account) {
  const accountType = String(account.accountType || "").toLowerCase().trim();
  const sections = [];

  if (accountType === "student") {
    sections.push(renderStudentSection(account));
  } else {
    sections.push(renderEmptySection("Student Activity", "fa-user-graduate", "No student records available for this user."));
  }

  if (accountType === "freelancer") {
    sections.push(renderFreelancerSection(account));
  } else {
    sections.push(renderEmptySection("Freelancer Activity", "fa-briefcase", "No freelancer data available for this user."));
  }

  if (accountType === "client") {
    sections.push(renderClientSection(account));
  } else {
    sections.push(renderEmptySection("Client Activity", "fa-building", "This user does not have job activity."));
  }

  if (accountType === "teacher") {
    sections.push(renderTeacherSection(account));
  } else {
    sections.push(renderEmptySection("Teacher Activity", "fa-chalkboard-user", "No teaching data found for this user."));
  }

  return sections.join("");
}

function renderDetail(account) {
  const empty = document.getElementById("detailEmpty");
  const body = document.getElementById("detailBody");
  const type = document.getElementById("detailType");
  if (!empty || !body || !type) return;

  if (!account) {
    empty.classList.remove("hidden");
    body.classList.add("hidden");
    type.textContent = "No selection";
    return;
  }

  empty.classList.add("hidden");
  body.classList.remove("hidden");
  type.textContent = account.accountType || "account";

  document.getElementById("detailAvatar").textContent = getInitials(account.fullname);
  document.getElementById("detailName").textContent = account.fullname || "Unknown";
  document.getElementById("detailEmail").textContent = account.email || "";
  document.getElementById("detailStatus").textContent = account.status || "active";
  document.getElementById("detailJoined").textContent = formatDate(account.createdAt);
  document.getElementById("detailLastSeen").textContent = formatDateTime(account.lastSeenAtISO || account.lastSeenAt);
  document.getElementById("detailSetup").textContent = account.setupCompleted ? `Completed ${formatDate(account.setupCompletedAt)}` : "Pending";

  const chips = document.getElementById("detailChips");
  const chipData = [
    account.accountType,
    account.role,
    account.setupType,
    account.setupCompleted ? "setup complete" : "setup pending"
  ].filter(Boolean);

  chips.innerHTML = chipData.map(value => `<span class="chip">${escapeHTML(value)}</span>`).join("");

  const section = document.getElementById("typeSection");
  section.innerHTML = renderRoleSections(account);

  const copyUidBtn = document.getElementById("copyUidBtn");
  copyUidBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(account.uid || "");
      copyUidBtn.textContent = "Copied";
      setTimeout(() => (copyUidBtn.textContent = "Copy UID"), 900);
    } catch {
      copyUidBtn.textContent = account.uid || "";
    }
  };

  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.onclick = () => updateStatus(account.uid, btn.dataset.action);
  });
}

async function updateStatus(uid, status) {
  if (!uid) return;

  const response = await fetch(`${API_URL}/api/admin/account/${encodeURIComponent(uid)}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    alert(data.message || "Failed to update account status");
    return;
  }

  await loadAccounts(state.selectedUid || uid);
}

function selectAccount(uid) {
  state.selectedUid = uid;
  state.selectedAccount = state.items.find(item => item.uid === uid) || null;
  renderRows();
  renderDetail(state.selectedAccount);
}

async function loadAccounts(preserveUid = "") {
  setLoading(true);

  const params = new URLSearchParams();
  params.set("type", state.tab);
  params.set("search", state.search);
  params.set("status", state.status);
  params.set("sort", state.sort);
  params.set("limit", "200");

  try {
    const response = await fetch(`${API_URL}/api/admin/accounts?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      state.items = [];
      state.summary = {};
      state.selectedAccount = null;
      renderMetrics();
      renderSummaryCards();
      renderTableHead();
      renderRows();
      renderDetail(null);
      return;
    }

    state.items = data.accounts || [];
    state.summary = data.summary || {};
    state.selectedUid = preserveUid && state.items.some(item => item.uid === preserveUid)
      ? preserveUid
      : state.items[0]?.uid || "";
    state.selectedAccount = state.items.find(item => item.uid === state.selectedUid) || null;

    updateTabLabels();
    renderMetrics();
    renderSummaryCards();
    renderTableHead();
    renderRows();
    renderDetail(state.selectedAccount);
  } catch (error) {
    console.error(error);
    state.items = [];
    state.summary = {};
    renderMetrics();
    renderSummaryCards();
    renderTableHead();
    renderRows();
    renderDetail(null);
  } finally {
    setLoading(false);
  }
}

function bindFilters() {
  document.getElementById("searchInput")?.addEventListener("input", event => {
    state.search = event.target.value.trim();
    loadAccounts();
  });

  document.getElementById("statusFilter")?.addEventListener("change", event => {
    state.status = event.target.value;
    loadAccounts();
  });

  document.getElementById("sortFilter")?.addEventListener("change", event => {
    state.sort = event.target.value;
    loadAccounts();
  });

  document.getElementById("refreshBtn")?.addEventListener("click", () => loadAccounts(state.selectedUid));

  document.getElementById("tabBar")?.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("tabBar")?.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
      state.tab = btn.dataset.tab || "all";
      state.search = "";
      state.status = "all";
      state.sort = "newest";
      document.getElementById("searchInput").value = "";
      document.getElementById("statusFilter").value = "all";
      document.getElementById("sortFilter").value = "newest";
      loadAccounts();
    });
  });

  document.getElementById("tabBar")?.querySelectorAll(".tab").forEach(btn => {
    if ((btn.dataset.tab || "all") === state.tab) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await validateAdmin();
  if (!ok) return;

  bindFilters();
  updateTabLabels();
  renderMetrics();
  renderSummaryCards();
  renderTableHead();
  await loadAccounts();
});
