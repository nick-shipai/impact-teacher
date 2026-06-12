const API_BASE = "https://ai-impact-server.vercel.app";
const VALIDATE_SESSION_URL = `${API_BASE}/api/auth/validate-session`;
const APPLICATION_STATUS_URL = `${API_BASE}/api/teacher/application-status`;
const DASHBOARD_URL = `${API_BASE}/api/teacher/dashboard`;
const LOGOUT_URL = `${API_BASE}/api/auth/logout`;

let currentUser = null;

async function AuthenticateUser() {
  try {
    const response = await fetch(VALIDATE_SESSION_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      localStorage.removeItem("impactech_user");
      localStorage.removeItem("impactech_token");
      return { success: false, user: null };
    }
    if (data.user) {
      localStorage.setItem("impactech_user", JSON.stringify(data.user));
    }
    return { success: true, user: data.user };
  } catch (error) {
    console.error("AuthenticateUser error:", error);
    return { success: false, user: null };
  }
}

function showLoading() {
  document.getElementById("dashboardLoading").style.display = "";
  document.getElementById("dashboardError").style.display = "none";
  document.getElementById("dashboardContent").style.display = "none";
}

function showError(msg) {
  document.getElementById("dashboardLoading").style.display = "none";
  document.getElementById("dashboardError").style.display = "";
  document.getElementById("dashboardErrorMessage").textContent = msg || "Something went wrong. Please try again.";
  document.getElementById("dashboardContent").style.display = "none";
}

function showContent() {
  document.getElementById("dashboardLoading").style.display = "none";
  document.getElementById("dashboardError").style.display = "none";
  document.getElementById("dashboardContent").style.display = "";
}

function updateUserInfo(user) {
  const name = user?.fullname || "Teacher";
  const email = user?.email || "";
  const initial = name.charAt(0).toUpperCase();

  const nameEl = document.getElementById("teacherName");
  if (nameEl) nameEl.textContent = name;

  const avatar = document.getElementById("teacherAvatar");
  if (avatar) avatar.innerHTML = `<span>${initial}</span>`;

  const profileName = document.getElementById("profileName");
  if (profileName) profileName.textContent = name;

  const profileEmail = document.getElementById("profileEmail");
  if (profileEmail) profileEmail.textContent = email;

  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar) profileAvatar.textContent = initial;
}

function populateStats(stats) {
  const s = stats || {};
  setText("statStudents", formatNum(s.totalStudents || 0));
  setText("statCourses", formatNum(s.totalCourses || 0));
  setText("statActive", formatNum(s.approved || 0));
  setText("statRate", formatNum(s.pendingReview || 0));
  setText("statEarnings", formatNum(s.totalViews || 0));
  setText("statPending", formatNum(s.rejected || 0));
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function renderMiniCourses(courses) {
  const list = document.getElementById("miniCourseList");
  if (!list) return;

  if (!courses || courses.length === 0) {
    list.innerHTML = `
      <div class="mini-course-empty">
        <i class="fa-solid fa-book-open"></i>
        <p>No courses yet</p>
      </div>`;
    return;
  }

  list.innerHTML = courses.map((c) => {
    const thumbHtml = c.thumbnail
      ? `<img src="${c.thumbnail}" alt="${escapeHtml(c.title)}" />`
      : `<i class="fa-solid fa-book"></i>`;
    const statusClass = c.status === "approved" ? "approved" : c.status === "rejected" ? "rejected" : c.status === "draft" ? "draft" : "pending";
    const statusLabel = c.status === "approved" ? "Approved" : c.status === "rejected" ? "Rejected" : c.status === "draft" ? "Draft" : "Pending";
    return `
      <div class="mini-course-item">
        <div class="mini-course-thumb">${thumbHtml}</div>
        <div class="mini-course-info">
          <h4>${escapeHtml(c.title)}</h4>
          <p>${escapeHtml(c.category || "")}</p>
        </div>
        <span class="mini-course-status ${statusClass}">${statusLabel}</span>
      </div>`;
  }).join("");
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadDashboard() {
  showLoading();
  try {
    const res = await fetch(DASHBOARD_URL, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to load dashboard");
    }
    const d = data;

    updateUserInfo(d.teacher);

    populateStats(d.statistics);

    renderMiniCourses(d.recentCourses);

    setText("pubCount", formatNum(d.statistics?.approved || 0));
    setText("draftCount", formatNum(d.statistics?.pendingReview || 0));

    showContent();

  } catch (err) {
    console.error("Load dashboard error:", err);
    showError(err.message);
  }
}

function setupNavigation() {
  const links = document.querySelectorAll(".sidebar-menu a");
  const sections = document.querySelectorAll(".dashboard-section");
  const breadcrumb = document.getElementById("breadcrumbCurrent");
  const sectionNames = {
    dashboard: "Dashboard",
    courses: "My Courses",
    students: "Students",
    assignments: "Assignments",
    earnings: "Earnings",
    messages: "Messages",
    analytics: "Analytics",
    profile: "Profile",
    settings: "Settings"
  };

  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const section = this.dataset.section;
      if (!section) return;
      links.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
      sections.forEach((s) => s.classList.remove("active-section"));
      const target = document.getElementById(`section-${section}`);
      if (target) {
        target.classList.add("active-section");
        if (breadcrumb) breadcrumb.textContent = sectionNames[section] || section;
        closeSidebar();
      }
    });
  });
}

function setupMobileMenu() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("teacherSidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      if (overlay) overlay.classList.toggle("open");
    });
  }
  if (overlay) {
    overlay.addEventListener("click", function () {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("teacherSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

document.addEventListener("DOMContentLoaded", async function () {
  const auth = await AuthenticateUser();
  if (!auth.success) {
    window.location.href = "../sign-in/";
    return;
  }
  currentUser = auth.user;
  const accountType = String(auth.user?.accountType || "").toLowerCase().trim();
  if (accountType !== "teacher") {
    window.location.href = "../../404.html";
    return;
  }

  const setup = auth.user?.setup;
  const setupCompleted = setup?.completed === true || auth.user?.setupCompleted === true;
  const teacherAccountStatus = auth.user?.teacherAccountStatus;

  if (!setupCompleted || teacherAccountStatus !== true) {
    window.location.href = "../dashboard/set-up/";
    return;
  }

  updateUserInfo(auth.user);
  setupNavigation();
  setupMobileMenu();

  await loadDashboard();

  document.getElementById("dashboardRetryBtn")?.addEventListener("click", loadDashboard);
});

document.getElementById("logoutBtn").addEventListener("click", async function (e) {
  e.preventDefault();
  try {
    await fetch(LOGOUT_URL, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
  } catch (err) {}
  localStorage.removeItem("impactech_user");
  localStorage.removeItem("impactech_token");
  localStorage.removeItem("impactech_teacher_application_status");
  window.location.href = "../sign-in/";
});

document.getElementById("searchInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const query = this.value.trim();
    if (query) console.log("Search for:", query);
  }
});
