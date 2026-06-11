/* ==========================================================
   IMPACTECH ADMIN · TEACHER REVIEW
   Mirrors the patterns used in verify-job.js and accounts.js
   so the page behaves consistently with the rest of the admin
   panel.
   ========================================================== */

const API_URL = "https://ai-impact-server.vercel.app";
const REQUEST_TIMEOUT_MS = 10000;

const urlParams = new URLSearchParams(window.location.search);
const teacherUid = String(urlParams.get("uid") || "").trim();

const state = {
  teacher: null,
  loading: false,
  error: null
};

/* ==========================================================
   UTILITIES
   ========================================================== */

function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(timestamp) {
  if (timestamp == null || timestamp === "") return null;
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (value == null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function formatFileSize(bytes) {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function pillClassForStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["active", "approved", "verified", "paid", "completed", "success"].includes(value)) return "green";
  if (["pending", "pending_review", "reviewing", "draft", "needs_manual_review", "waiting"].includes(value)) return "yellow";
  if (["disabled", "blocked", "rejected", "failed"].includes(value)) return "red";
  return "blue";
}

function isValidUid(value) {
  return typeof value === "string" && value.length >= 6 && value.length <= 200;
}

function getDocumentList(setup) {
  const docs = (setup && setup.documents) || {};
  return [
    { key: "cv", label: "CV / Resume", icon: "fa-file-pdf", docType: "pdf", data: docs.cv },
    { key: "teachingCertificate", label: "Teaching Certificate", icon: "fa-award", docType: "cert", data: docs.teachingCertificate },
    { key: "degree", label: "Degree Certificate", icon: "fa-graduation-cap", docType: "cert", data: docs.degree },
    { key: "idCard", label: "Identity Card", icon: "fa-id-card", docType: "id", data: docs.idCard }
  ];
}

function detectFileType(doc) {
  const mime = String(doc?.data?.mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (doc?.key === "cv") return "pdf";
  return "image";
}

function statusBadgeClass(verified, rejected) {
  if (verified) return "verified";
  if (rejected) return "rejected";
  return "pending";
}

/* ==========================================================
   FETCH WITH TIMEOUT
   ========================================================== */

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ==========================================================
   AUTH
   ========================================================== */

async function ValidateAdmin() {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/admin/validate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      localStorage.removeItem("impact_admin");
      window.location.href = "https://nx7-vault-core.impactacademy.site";
      return false;
    }
    if (data.admin) {
      localStorage.setItem("impact_admin", JSON.stringify(data.admin));
    }
    return true;
  } catch (error) {
    console.error("ValidateAdmin error:", error);
    localStorage.removeItem("impact_admin");
    window.location.href = "https://nx7-vault-core.impactacademy.site";
    return false;
  }
}

/* ==========================================================
   STATE HELPERS
   ========================================================== */

function showProgress(active) {
  const bar = document.getElementById("progressBar");
  if (bar) bar.classList.toggle("active", !!active);
}

function showError(title, text) {
  state.error = { title, text };
  const errorState = document.getElementById("errorState");
  const errorTitle = document.getElementById("errorTitle");
  const errorText = document.getElementById("errorText");
  if (errorTitle) errorTitle.textContent = title;
  if (errorText) errorText.textContent = text;
  if (errorState) errorState.classList.remove("hidden");
  const grid = document.getElementById("reviewGrid");
  if (grid) grid.classList.add("hidden");
}

function hideError() {
  const errorState = document.getElementById("errorState");
  if (errorState) errorState.classList.add("hidden");
  const grid = document.getElementById("reviewGrid");
  if (grid) grid.classList.remove("hidden");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHeroStatus(stateName, icon) {
  const status = document.getElementById("heroStatus");
  if (!status) return;
  status.className = `hero-status ${stateName}`;
  status.innerHTML = `<i class="fa-solid ${icon}"></i>`;
}

/* ==========================================================
   RENDER HELPERS
   ========================================================== */

function renderKVItem({ label, value, full = false, mono = false, emptyLabel = "Not provided" }) {
  const isEmpty = value == null || value === "" || value === "--";
  return `
    <div class="kv ${full ? "full" : ""}">
      <small>${escapeHTML(label)}</small>
      ${isEmpty
        ? `<span class="empty">${escapeHTML(emptyLabel)}</span>`
        : `<strong class="${mono ? "mono" : ""}">${escapeHTML(value)}</strong>`
      }
    </div>
  `;
}

function renderKVGrid(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `
      <div class="kv full" style="text-align:center; padding: 24px 14px;">
        <small>NO DATA</small>
        <span class="empty">No information has been submitted for this section.</span>
      </div>
    `;
    return;
  }
  container.innerHTML = items.map(renderKVItem).join("");
}

/* ==========================================================
   RENDER: HERO
   ========================================================== */

function renderHero(teacher) {
  const fullName = teacher.fullname || teacher.displayName || "Unknown Teacher";
  const email = teacher.email || "No email provided";
  const verified = teacher.teacherAccountStatus === true;
  const rejected = teacher.teacherAccountStatus === false && teacher.teacherReviewStatus === "rejected";
  const setupDone = teacher.setupCompleted === true;

  setText("heroName", fullName);
  setText("heroEmail", email);

  const initialsEl = document.getElementById("heroInitials");
  const photoEl = document.getElementById("heroPhoto");
  if (initialsEl) initialsEl.textContent = getInitials(fullName);

  if (photoEl) {
    const photo = teacher.photoURL || teacher.avatarUrl || teacher.photo || null;
    if (photo) {
      photoEl.src = photo;
      photoEl.alt = fullName;
      photoEl.hidden = false;
      if (initialsEl) initialsEl.style.display = "none";
    } else {
      photoEl.hidden = true;
      if (initialsEl) initialsEl.style.display = "";
    }
  }

  if (verified) setHeroStatus("verified", "fa-shield-halved");
  else if (rejected) setHeroStatus("rejected", "fa-circle-xmark");
  else setHeroStatus("pending", "fa-hourglass-half");

  const pills = [
    { cls: pillClassForStatus(teacher.status), icon: "fa-circle", text: teacher.status || "active" },
    { cls: verified ? "green" : "yellow", icon: verified ? "fa-circle-check" : "fa-hourglass-half", text: verified ? "Verified" : "Pending Verification" },
    { cls: setupDone ? "green" : "yellow", icon: setupDone ? "fa-circle-check" : "fa-circle-exclamation", text: setupDone ? "Setup Complete" : "Setup Incomplete" }
  ];
  if (teacher.teacherReviewStatus) {
    pills.push({ cls: pillClassForStatus(teacher.teacherReviewStatus), icon: "fa-shield-halved", text: `Review: ${teacher.teacherReviewStatus}` });
  }

  const pillsEl = document.getElementById("heroPills");
  if (pillsEl) {
    pillsEl.innerHTML = pills.map(p => `<span class="pill ${escapeHTML(p.cls)}"><i class="fa-solid ${escapeHTML(p.icon)}"></i> ${escapeHTML(p.text)}</span>`).join("");
  }
}

/* ==========================================================
   RENDER: PERSONAL INFO
   ========================================================== */

function renderPersonalInfo(teacher) {
  const p = (teacher.teacherSetup && teacher.teacherSetup.personal) || {};
  const items = [
    { label: "Full Name", value: p.fullName || teacher.fullname },
    { label: "Email", value: p.email || teacher.email },
    { label: "Phone", value: p.phone },
    { label: "Date of Birth", value: p.dateOfBirth },
    { label: "Gender", value: p.gender },
    { label: "Nationality", value: p.nationality },
    { label: "City", value: p.city },
    { label: "Country", value: p.country },
    { label: "Address", value: p.address, full: true }
  ];
  renderKVGrid(document.getElementById("personalGrid"), items);
  setText("personalBadge", items.filter(i => i.value).length >= 4 ? "Complete" : "Partial");
  const badge = document.getElementById("personalBadge");
  if (badge) {
    badge.className = "status-badge " + (items.filter(i => i.value).length >= 6 ? "verified" : "yellow");
  }
}

/* ==========================================================
   RENDER: TEACHING INFO
   ========================================================== */

function renderTeachingInfo(teacher) {
  const t = (teacher.teacherSetup && teacher.teacherSetup.teaching) || {};
  const expYears = t.teachingExperience;
  const items = [
    { label: "Highest Qualification", value: t.highestQualification },
    { label: "Major Subject", value: t.majorSubject },
    { label: "Institution", value: t.institution },
    { label: "Graduation Year", value: t.graduationYear },
    { label: "Teaching Experience", value: expYears ? `${expYears} year${expYears === "1" ? "" : "s"}` : null },
    { label: "Specialization", value: t.specialization }
  ];
  renderKVGrid(document.getElementById("teachingGrid"), items);

  const cats = Array.isArray(teacher.teacherSetup?.categories) ? teacher.teacherSetup.categories : [];
  const block = document.getElementById("categoriesBlock");
  const list = document.getElementById("categoriesList");
  if (block) block.hidden = cats.length === 0;
  if (list) {
    if (cats.length) {
      list.innerHTML = cats.map(c => `<span><i class="fa-solid fa-graduation-cap"></i> ${escapeHTML(c)}</span>`).join("");
    } else {
      list.innerHTML = `<span class="empty-chip">No teaching categories selected</span>`;
    }
  }

  const filled = items.filter(i => i.value).length;
  const badge = document.getElementById("teachingBadge");
  if (badge) {
    badge.textContent = filled >= 4 ? "Complete" : "Partial";
    badge.className = "status-badge " + (filled >= 5 ? "verified" : "yellow");
  }
}

/* ==========================================================
   RENDER: DOCUMENTS
   ========================================================== */

function renderDocuments(teacher) {
  const grid = document.getElementById("documentsGrid");
  const count = document.getElementById("documentsBadge");
  if (!grid) return;

  const docs = getDocumentList(teacher.teacherSetup);
  const uploaded = docs.filter(d => d.data && d.data.dataUrl);
  if (count) count.textContent = `${uploaded.length} / ${docs.length} uploaded`;

  if (!uploaded.length) {
    grid.innerHTML = `
      <div class="state-card" style="grid-column:1/-1; padding: 32px 20px;">
        <div class="state-icon" style="width:64px;height:64px;font-size:24px;border-radius:20px;">
          <i class="fa-regular fa-folder-open"></i>
        </div>
        <h3 style="font-size:18px;">No documents uploaded</h3>
        <p>This teacher has not submitted any verification documents yet.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = docs.map(doc => {
    const hasFile = Boolean(doc && doc.data && doc.data.dataUrl);
    const fileName = (doc.data && doc.data.fileName) || "No file";
    const mime = (doc.data && doc.data.mimeType) || "Unknown type";
    const size = formatFileSize(doc.data && doc.data.size);
    const type = hasFile ? detectFileType(doc) : "missing";
    const iconClass = hasFile ? `type-${type}` : "type-missing";

    return `
      <div class="doc-card ${escapeHTML(iconClass)}">
        <div class="doc-card-head">
          <div class="doc-icon"><i class="fa-solid ${escapeHTML(doc.icon)}"></i></div>
          <span class="doc-card-status ${hasFile ? "uploaded" : "missing"}">
            <i class="fa-solid ${hasFile ? "fa-circle-check" : "fa-circle-xmark"}"></i>
            ${hasFile ? "Uploaded" : "Missing"}
          </span>
        </div>
        <div>
          <div class="doc-card-name">${escapeHTML(doc.label)}</div>
          <div class="doc-card-meta">
            ${hasFile
              ? `${escapeHTML(fileName)}<br><span style="color:#64748b;">${escapeHTML(mime)} · ${escapeHTML(size)}</span>`
              : `<span style="color:#64748b;">This document has not been uploaded yet.</span>`
            }
          </div>
        </div>
        <div class="doc-card-actions">
          <button class="doc-btn primary" data-preview-doc="${escapeHTML(doc.key)}" type="button" ${hasFile ? "" : "disabled"}>
            <i class="fa-solid fa-eye"></i> Preview
          </button>
          <a class="doc-btn" data-download-doc="${escapeHTML(doc.key)}" ${hasFile ? `href="${escapeHTML(doc.data.dataUrl)}" download="${escapeHTML(doc.data.fileName || doc.label)}"` : "aria-disabled=\"true\""} role="button">
            <i class="fa-solid fa-download"></i> Download
          </a>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-preview-doc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-preview-doc");
      openDocumentPreview(teacher, key);
    });
  });
}

/* ==========================================================
   RENDER: VERIFICATION PANEL
   ========================================================== */

function renderVerification(teacher) {
  const verified = teacher.teacherAccountStatus === true;
  const rejected = teacher.teacherAccountStatus === false && teacher.teacherReviewStatus === "rejected";

  const box = document.getElementById("verifyStatusBox");
  const icon = box && box.querySelector(".verify-status-icon");
  const titleEl = document.getElementById("verifyTitle");
  const textEl = document.getElementById("verifyText");
  const approveBtn = document.getElementById("approveBtn");
  const rejectBtn = document.getElementById("rejectBtn");

  if (verified) {
    if (icon) { icon.className = "verify-status-icon verified"; icon.innerHTML = `<i class="fa-solid fa-shield-halved"></i>`; }
    if (titleEl) titleEl.textContent = "Account Verified";
    if (textEl) textEl.textContent = "This teacher has been approved on the platform.";
    if (approveBtn) { approveBtn.disabled = true; approveBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Already Approved`; }
    if (rejectBtn) rejectBtn.disabled = false;
  } else if (rejected) {
    if (icon) { icon.className = "verify-status-icon rejected"; icon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`; }
    if (titleEl) titleEl.textContent = "Application Rejected";
    if (textEl) textEl.textContent = "This teacher has been rejected. You can still re-evaluate.";
    if (approveBtn) approveBtn.disabled = false;
    if (rejectBtn) { rejectBtn.disabled = true; rejectBtn.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Already Rejected`; }
  } else {
    if (icon) { icon.className = "verify-status-icon pending"; icon.innerHTML = `<i class="fa-solid fa-hourglass-half"></i>`; }
    if (titleEl) titleEl.textContent = "Awaiting Review";
    if (textEl) textEl.textContent = "This application is waiting for verification.";
    if (approveBtn) { approveBtn.disabled = false; approveBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Approve Account`; }
    if (rejectBtn) { rejectBtn.disabled = false; rejectBtn.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Reject Account`; }
  }
}

/* ==========================================================
   RENDER: ACCOUNT META
   ========================================================== */

function renderMeta(teacher) {
  const list = document.getElementById("metaList");
  if (!list) return;

  const rows = [
    { label: "User ID", value: teacher.uid, mono: true },
    { label: "Account Type", value: teacher.accountType || "teacher" },
    { label: "Status", value: teacher.status || "active" },
    { label: "Review Status", value: teacher.teacherReviewStatus || "pending" },
    { label: "Setup", value: teacher.setupCompleted ? "Completed" : "Pending" },
    { label: "Joined", value: formatDate(teacher.createdAt) },
    { label: "Last Active", value: formatDateTime(teacher.lastSeenAtISO || teacher.lastSeenAt) }
  ];

  list.innerHTML = rows.map(r => {
    const empty = r.value == null || r.value === "" || r.value === "--";
    return `
      <div class="meta-row">
        <span>${escapeHTML(r.label)}</span>
        <strong class="${r.mono ? "mono" : ""}${empty ? " empty" : ""}">${empty ? "Not available" : escapeHTML(r.value)}</strong>
      </div>
    `;
  }).join("");
}

/* ==========================================================
   SKELETONS
   ========================================================== */

function renderSkeletons() {
  // Personal
  const personalGrid = document.getElementById("personalGrid");
  if (personalGrid) {
    personalGrid.innerHTML = Array.from({ length: 6 }, () =>
      `<div class="kv"><small class="skeleton sk-line-sm"></small><div class="skeleton skeleton-line sk-line-md"></div></div>`
    ).join("") + `<div class="kv full"><small class="skeleton sk-line-sm"></small><div class="skeleton skeleton-line sk-line-md"></div></div>`;
  }

  // Teaching
  const teachingGrid = document.getElementById("teachingGrid");
  if (teachingGrid) {
    teachingGrid.innerHTML = Array.from({ length: 6 }, () =>
      `<div class="kv"><small class="skeleton sk-line-sm"></small><div class="skeleton skeleton-line sk-line-md"></div></div>`
    ).join("");
  }

  // Categories hidden during loading
  const catsBlock = document.getElementById("categoriesBlock");
  if (catsBlock) catsBlock.hidden = true;

  // Documents
  const docsGrid = document.getElementById("documentsGrid");
  if (docsGrid) {
    docsGrid.innerHTML = Array.from({ length: 4 }, () => `
      <div class="doc-card">
        <div class="doc-card-head">
          <div class="doc-icon skeleton" style="border-radius:14px;"></div>
          <span class="doc-card-status skeleton" style="border-radius:999px; width:80px; height:22px;"></span>
        </div>
        <div>
          <div class="doc-card-name"><div class="skeleton skeleton-line" style="width:60%;height:14px;"></div></div>
          <div class="doc-card-meta"><div class="skeleton skeleton-line" style="width:80%;height:11px;margin-top:6px;"></div></div>
        </div>
        <div class="doc-card-actions">
          <div class="skeleton" style="height:34px;border-radius:10px;flex:1;"></div>
          <div class="skeleton" style="height:34px;border-radius:10px;flex:1;"></div>
        </div>
      </div>
    `).join("");
  }

  // Meta
  const metaList = document.getElementById("metaList");
  if (metaList) {
    metaList.innerHTML = Array.from({ length: 6 }, () => `
      <div class="meta-row">
        <span class="skeleton" style="width:90px;height:11px;display:inline-block;"></span>
        <strong class="skeleton" style="width:140px;height:14px;display:inline-block;border-radius:6px;"></strong>
      </div>
    `).join("");
  }
}

/* ==========================================================
   MODALS
   ========================================================== */

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".decision-modal.show")) {
    document.body.style.overflow = "";
  }
}

function bindModalDismissers() {
  document.querySelectorAll("[data-close-modal]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-close-modal");
      if (id) closeModal(id);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".decision-modal.show").forEach(m => m.classList.remove("show"));
      document.body.style.overflow = "";
    }
  });
}

/* ==========================================================
   DOCUMENT PREVIEW
   ========================================================== */

function openDocumentPreview(teacher, key) {
  const docs = getDocumentList(teacher.teacherSetup);
  const doc = docs.find(d => d.key === key);
  if (!doc || !doc.data || !doc.data.dataUrl) {
    showResultModal("error", "Preview Unavailable", "This document is missing or could not be loaded.");
    return;
  }

  setText("previewTitle", doc.label);
  setText("previewSubtitle", `${doc.data.fileName || "Document"} · ${doc.data.mimeType || "Unknown type"}`);

  const icon = document.getElementById("previewIcon");
  if (icon) icon.innerHTML = `<i class="fa-solid ${doc.icon}"></i>`;

  const download = document.getElementById("previewDownload");
  if (download) {
    download.href = doc.data.dataUrl;
    download.setAttribute("download", doc.data.fileName || doc.label);
  }

  const body = document.getElementById("previewBody");
  const mime = String(doc.data.mimeType || "").toLowerCase();
  if (mime.includes("pdf")) {
    body.innerHTML = `<iframe src="${escapeHTML(doc.data.dataUrl)}" title="${escapeHTML(doc.label)}"></iframe>`;
  } else if (mime.startsWith("image/")) {
    body.innerHTML = `<img src="${escapeHTML(doc.data.dataUrl)}" alt="${escapeHTML(doc.label)}" />`;
  } else {
    body.innerHTML = `
      <div class="preview-empty">
        <i class="fa-solid fa-file"></i>
        <strong>Inline preview not available</strong>
        <span>${escapeHTML(doc.data.mimeType || "Unknown type")} — download the file to view it.</span>
      </div>
    `;
  }

  openModal("previewModal");
}

/* ==========================================================
   RESULT MODAL
   ========================================================== */

function showResultModal(type, title, text) {
  const icon = document.getElementById("resultIcon");
  const tag = document.getElementById("resultTag");
  if (icon) {
    icon.className = `decision-modal-icon ${type === "success" ? "success" : type === "danger" || type === "error" ? "danger" : ""}`;
    icon.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : type === "danger" || type === "error" ? "fa-circle-xmark" : "fa-circle-info"}"></i>`;
  }
  if (tag) tag.textContent = type === "success" ? "APPROVED" : type === "error" || type === "danger" ? "REJECTED" : "DECISION";
  setText("resultTitle", title);
  setText("resultText", text);
  openModal("resultModal");
}

/* ==========================================================
   APPROVE / REJECT
   ========================================================== */

function openApproveModal() {
  openModal("approveModal");
}

async function confirmApprove() {
  if (!state.teacher) return;
  closeModal("approveModal");

  const approveBtn = document.getElementById("approveBtn");
  const original = approveBtn ? approveBtn.innerHTML : "";
  if (approveBtn) {
    approveBtn.disabled = true;
    approveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Approving...`;
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/admin/teachers/${encodeURIComponent(state.teacher.uid)}/approve`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      showResultModal("error", "Approval Failed", data.message || "Could not approve this teacher.");
      if (approveBtn) { approveBtn.disabled = false; approveBtn.innerHTML = original; }
      return;
    }

    state.teacher.teacherAccountStatus = true;
    state.teacher.teacherReviewStatus = "approved";
    rerender();
    showResultModal("success", "Teacher Approved", "The teacher account has been approved and is now live.");
  } catch (error) {
    console.error("confirmApprove error:", error);
    showResultModal("error", "Network Error", "Could not reach the server. Please try again.");
    if (approveBtn) { approveBtn.disabled = false; approveBtn.innerHTML = original; }
  }
}

function openRejectModal() {
  const reason = document.getElementById("rejectionReason");
  if (reason) reason.value = "";
  openModal("rejectModal");
  setTimeout(() => reason && reason.focus(), 200);
}

async function confirmReject() {
  if (!state.teacher) return;
  const reason = String(document.getElementById("rejectionReason")?.value || "").trim();
  if (!reason) {
    showResultModal("error", "Reason Required", "Please provide a rejection reason before confirming.");
    return;
  }

  const confirmBtn = document.getElementById("confirmRejectBtn");
  const original = confirmBtn ? confirmBtn.innerHTML : "";
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...`;
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/admin/teachers/${encodeURIComponent(state.teacher.uid)}/reject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      showResultModal("error", "Rejection Failed", data.message || "Could not reject this teacher.");
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = original; }
      return;
    }

    state.teacher.teacherAccountStatus = false;
    state.teacher.teacherReviewStatus = "rejected";
    closeModal("rejectModal");
    rerender();
    showResultModal("danger", "Application Rejected", "The teacher has been notified with your feedback.");
  } catch (error) {
    console.error("confirmReject error:", error);
    showResultModal("error", "Network Error", "Could not reach the server. Please try again.");
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = original; }
  }
}

/* ==========================================================
   RERENDER
   ========================================================== */

function rerender() {
  if (!state.teacher) return;
  renderHero(state.teacher);
  renderPersonalInfo(state.teacher);
  renderTeachingInfo(state.teacher);
  renderDocuments(state.teacher);
  renderVerification(state.teacher);
  renderMeta(state.teacher);
}

/* ==========================================================
   LOAD TEACHER
   ========================================================== */

async function loadTeacher() {
  // FAST-FAIL: invalid UID
  if (!isValidUid(teacherUid)) {
    showError(
      "Missing or invalid teacher ID",
      "The link used to open this page does not include a valid teacher ID. Open a teacher from the Accounts list to start a review."
    );
    setHeroStatus("rejected", "fa-circle-exclamation");
    setText("heroName", "Teacher Not Found");
    setText("heroEmail", "No valid teacher ID was provided in the URL.");
    return;
  }

  state.loading = true;
  state.error = null;
  hideError();
  showProgress(true);
  renderSkeletons();

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/admin/teacher/${encodeURIComponent(teacherUid)}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const code = response.status;
      let title = "Teacher not found";
      let text = "We couldn't find this teacher. They may have been deleted or the link is incorrect.";
      if (code === 401 || code === 403) {
        title = "Not authorized";
        text = "Your admin session is no longer valid. Please sign in again.";
      } else if (code === 404) {
        title = "Teacher not found";
        text = `No teacher exists with the ID "${teacherUid.slice(0, 12)}${teacherUid.length > 12 ? "…" : ""}". Open the teacher from the Accounts list to retry.`;
      } else if (code >= 500) {
        title = "Server error";
        text = "The server returned an error while loading this teacher. Please try again in a moment.";
      } else if (data.message) {
        text = data.message;
      }

      showError(title, text);
      setHeroStatus("rejected", "fa-circle-exclamation");
      setText("heroName", "Teacher Not Found");
      setText("heroEmail", "Use the Accounts list to open a teacher application.");
      return;
    }

    if (!data.teacher || typeof data.teacher !== "object") {
      showError(
        "Invalid response",
        "The server returned an unexpected response. Please try again."
      );
      setHeroStatus("rejected", "fa-circle-exclamation");
      setText("heroName", "Teacher Not Found");
      setText("heroEmail", "The server response was malformed.");
      return;
    }

    state.teacher = data.teacher;
    rerender();
  } catch (error) {
    console.error("loadTeacher error:", error);
    if (error && error.name === "AbortError") {
      showError(
        "Request timed out",
        "The server took too long to respond. Please check your connection and try again."
      );
    } else {
      showError(
        "Network error",
        "Could not reach the server. Please check your connection and try again."
      );
    }
    setHeroStatus("rejected", "fa-circle-exclamation");
    setText("heroName", "Teacher Not Found");
    setText("heroEmail", "We were unable to reach the server to load this teacher.");
  } finally {
    state.loading = false;
    showProgress(false);
  }
}

/* ==========================================================
   EVENTS
   ========================================================== */

function bindEvents() {
  bindModalDismissers();

  const approveBtn = document.getElementById("approveBtn");
  if (approveBtn) approveBtn.addEventListener("click", openApproveModal);

  const confirmApproveBtn = document.getElementById("confirmApproveBtn");
  if (confirmApproveBtn) confirmApproveBtn.addEventListener("click", confirmApprove);

  const rejectBtn = document.getElementById("rejectBtn");
  if (rejectBtn) rejectBtn.addEventListener("click", openRejectModal);

  const confirmRejectBtn = document.getElementById("confirmRejectBtn");
  if (confirmRejectBtn) confirmRejectBtn.addEventListener("click", confirmReject);

  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", () => loadTeacher());
}

/* ==========================================================
   BOOT
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();

  const ok = await ValidateAdmin();
  if (!ok) return;

  await loadTeacher();
});
