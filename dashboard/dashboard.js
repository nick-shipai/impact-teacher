const API_BASE = "https://ai-impact-server.vercel.app";
const VALIDATE_SESSION_URL = `${API_BASE}/api/auth/validate-session`;
const APPLICATION_STATUS_URL = `${API_BASE}/api/teacher/application-status`;
const LOGOUT_URL = `${API_BASE}/api/auth/logout`;

let currentUser = null;

/* =========================
   AUTHENTICATE USER
========================= */

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

/* =========================
   PAGE LOAD
========================= */

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

    initDashboard(auth.user);
});

/* =========================
   INIT DASHBOARD
========================= */

async function initDashboard(user) {
    updateUserInfo(user);
    setupNavigation();
    setupMobileMenu();

    const statusData = await loadApplicationStatus();
    populateDashboard(statusData);
}

/* =========================
   UPDATE USER INFO
========================= */

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

/* =========================
   LOAD APPLICATION STATUS
========================= */

async function loadApplicationStatus() {
    try {
        const response = await fetch(APPLICATION_STATUS_URL, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) return null;

        return data;

    } catch (error) {
        console.error("Load application status error:", error);

        const local = localStorage.getItem("impactech_teacher_application_status");
        if (local) {
            try { return JSON.parse(local); } catch (e) {}
        }

        return null;
    }
}

/* =========================
   POPULATE DASHBOARD
========================= */

function populateDashboard(statusData) {
    if (!statusData) {
        document.getElementById("statStudents").textContent = "0";
        return;
    }

    const isApproved = statusData.applicationStatus === "approved";
    const isRejected = statusData.applicationStatus === "rejected";
    const isPending = statusData.applicationStatus === "pending";

    const earnDisplay = isRejected ? "$0" : "$1,240";
    const rateDisplay = isApproved ? "87%" : isRejected ? "0%" : "--";
    const pendingDisplay = isPending ? "2" : "0";

    document.getElementById("statStudents").textContent = isApproved ? "48" : "0";
    document.getElementById("statCourses").textContent = isApproved ? "6" : "0";
    document.getElementById("statActive").textContent = isApproved ? "4" : "0";
    document.getElementById("statRate").textContent = rateDisplay;
    document.getElementById("statEarnings").textContent = earnDisplay;
    document.getElementById("statPending").textContent = pendingDisplay;

    document.getElementById("earnTotal").textContent = earnDisplay;
    document.getElementById("earnMonthly").textContent = isApproved ? "$420" : "$0";
    document.getElementById("earnPending").textContent = isApproved ? "$180" : "$0";

    document.getElementById("pubCount").textContent = isApproved ? "4" : "0";
    document.getElementById("draftCount").textContent = isApproved ? "2" : "0";

    if (statusData.rejectionReason) {
        const hero = document.querySelector(".teacher-hero");
        if (hero && isRejected) {
            const alert = document.createElement("div");
            alert.className = "rejection-alert";
            alert.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Your application was rejected: ${statusData.rejectionReason}`;
            hero.after(alert);
        }
    }
}

/* =========================
   SIDEBAR NAVIGATION
========================= */

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

    links.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            const section = this.dataset.section;
            if (!section) return;

            links.forEach(l => l.classList.remove("active"));
            this.classList.add("active");

            sections.forEach(s => s.classList.remove("active-section"));

            const target = document.getElementById(`section-${section}`);
            if (target) {
                target.classList.add("active-section");
                if (breadcrumb) breadcrumb.textContent = sectionNames[section] || section;

                closeSidebar();
            }
        });
    });
}

/* =========================
   MOBILE MENU
========================= */

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

/* =========================
   LOGOUT
========================= */

document.getElementById("logoutBtn").addEventListener("click", async function (e) {
    e.preventDefault();

    try {
        await fetch(LOGOUT_URL, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {}

    localStorage.removeItem("impactech_user");
    localStorage.removeItem("impactech_token");
    localStorage.removeItem("impactech_teacher_application_status");

    window.location.href = "../sign-in/";
});

/* =========================
   SEARCH TOGGLE PLACEHOLDER
========================= */

document.getElementById("searchInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const query = this.value.trim();
        if (query) {
            console.log("Search for:", query);
        }
    }
});
