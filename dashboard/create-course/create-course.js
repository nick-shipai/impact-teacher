
/* =========================
   STATE
========================= */

const API_BASE = "https://ai-impact-server.vercel.app";
const COUNTRIES_URL = `${API_BASE}/api/load-countries`;

let currentStep = 1;
const TOTAL_STEPS = 8;
let currentUser = null;
let uploadedFiles = {};

/* =========================
   AUTHENTICATE USER
========================= */

async function AuthenticateUser() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/validate-session`, {
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
   STEP NAMES
========================= */

const stepNames = [
  "",
  "Course Basics",
  "Course Media",
  "Tags & Visibility",
  "Schedule",
  "Access",
  "Requirements",
  "Outcomes",
  "Review & Publish"
];

/* =========================
   DOM REFS
========================= */

const formSteps = document.querySelectorAll(".form-step");
const progressFill = document.getElementById("progressFill");
const stepLabel = document.getElementById("stepLabel");
const progressPercent = document.getElementById("progressPercent");
const pSteps = document.querySelectorAll(".p-step");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const formNav = document.getElementById("formNav");

/* =========================
   STEP NAVIGATION
========================= */

function goToStep(step) {
  currentStep = Math.max(1, Math.min(step, TOTAL_STEPS));

  formSteps.forEach((s) => s.classList.remove("active"));
  const activeStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  if (activeStep) activeStep.classList.add("active");

  const pct = Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);
  progressFill.style.width = `${pct}%`;
  progressPercent.textContent = `${pct}%`;
  stepLabel.textContent = stepNames[currentStep];

  pSteps.forEach((ps) => {
    const s = parseInt(ps.dataset.step, 10);
    ps.classList.toggle("active", s === currentStep);
    ps.classList.toggle("done", s < currentStep);
  });

  backBtn.disabled = currentStep === 1;

  const isLastStep = currentStep === TOTAL_STEPS;

  if (saveDraftBtn) {
    saveDraftBtn.style.display = isLastStep ? "inline-flex" : "none";
  }

  if (isLastStep) {
    buildReview();
    nextBtn.innerHTML = `<i class="fa-solid fa-check"></i> Publish Course`;
    nextBtn.className = "nav-btn nav-publish";
  } else {
    nextBtn.innerHTML = `Next <i class="fa-solid fa-arrow-right"></i>`;
    nextBtn.className = "nav-btn nav-next";
  }
}

function nextStep() {
  if (currentStep < TOTAL_STEPS) {
    goToStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    goToStep(currentStep - 1);
  }
}

backBtn.addEventListener("click", prevStep);
nextBtn.addEventListener("click", async function (e) {
  if (!validateStep(currentStep)) {
    e.preventDefault();
    return;
  }
  if (currentStep === TOTAL_STEPS) {
    await submitCourse();
    return;
  }
  nextStep();
});

/* =========================
   VALIDATION
========================= */

function clearStepErrors(step) {
  const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
  if (!stepEl) return;
  stepEl.querySelectorAll(".field-error").forEach((el) => el.remove());
  stepEl.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));
  stepEl.querySelectorAll(".tag-error").forEach((el) => el.classList.remove("tag-error"));
  stepEl.querySelectorAll(".list-error").forEach((el) => el.classList.remove("list-error"));
  stepEl.querySelectorAll(".upload-error").forEach((el) => el.classList.remove("upload-error"));
  stepEl.querySelectorAll(".toggle-error").forEach((el) => el.classList.remove("toggle-error"));
  const banner = stepEl.querySelector(".step-error-banner");
  if (banner) banner.remove();
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add("input-error");
  const existing = input.parentElement.querySelector(".field-error");
  if (existing) existing.remove();
  const err = document.createElement("div");
  err.className = "field-error";
  err.textContent = message;
  input.parentElement.appendChild(err);
}

function scrollToFirstError(step) {
  const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
  if (!stepEl) return;
  const firstErr = stepEl.querySelector(".input-error, .tag-error, .list-error, .upload-error");
  if (firstErr) {
    firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function showStepBanner(step, message) {
  const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
  if (!stepEl) return;
  const existing = stepEl.querySelector(".step-error-banner");
  if (existing) existing.remove();
  const banner = document.createElement("div");
  banner.className = "step-error-banner";
  banner.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
  stepEl.querySelector(".step-body").prepend(banner);
}

function validateStep(step) {
  clearStepErrors(step);
  let valid = true;

  if (step === 1) {
    const title = document.getElementById("courseTitle").value.trim();
    const desc = document.getElementById("courseDescription").value.trim();
    const cat = document.getElementById("courseCategory").value;

    if (!title) {
      showFieldError("courseTitle", "Course title is required.");
      valid = false;
    }
    if (!desc) {
      showFieldError("courseDescription", "Course description is required.");
      valid = false;
    }
    if (!cat) {
      showFieldError("courseCategory", "Please select a course category.");
      valid = false;
    }
  }

  if (step === 2) {
    const thumbPreview = document.getElementById("thumbnailPreview");
    const isUploaded = thumbPreview && thumbPreview.style.display === "block";
    if (!isUploaded) {
      const card = document.getElementById("thumbnailUpload");
      if (card) card.classList.add("upload-error");
      valid = false;
      showStepBanner(2, "Please upload a course thumbnail before continuing.");
    }
  }

  if (step === 3) {
    if (tags.length === 0) {
      const wrap = document.getElementById("tagInputWrap");
      if (wrap) wrap.classList.add("tag-error");
      valid = false;
    }
    const countrySelect = document.getElementById("countryVisibility");
    const selectedOptions = [...countrySelect.selectedOptions];
    const hasGlobal = selectedOptions.some((o) => o.value === "Global");
    const hasCountries = selectedOptions.some((o) => o.value !== "Global");
    if (!hasGlobal && !hasCountries) {
      countrySelect.classList.add("input-error");
      valid = false;
    }
    if (!valid) {
      showStepBanner(3, "Please add at least one tag and select a country.");
    }
  }

  if (step === 4) {
    const startDate = document.getElementById("startDate").value;
    const startTime = document.getElementById("startTime").value;

    if (!startDate) {
      showFieldError("startDate", "Start date is required.");
      valid = false;
    }
    if (!startTime) {
      showFieldError("startTime", "Start time is required.");
      valid = false;
    }

    const endDate = document.getElementById("endDate").value;
    if (endDate && startDate && endDate < startDate) {
      showFieldError("endDate", "End date cannot be earlier than start date.");
      valid = false;
    }
  }

  if (step === 5) {
    const checked = document.querySelector('input[name="pricingType"]:checked');
    if (!checked) {
      const toggle = document.querySelector(".pricing-toggle");
      if (toggle) toggle.classList.add("toggle-error");
      valid = false;
      showStepBanner(5, "Please select a course access type.");
    }
  }

  if (step === 6) {
    if (requirements.length === 0) {
      const wrap = document.getElementById("requirementsWrap");
      if (wrap) wrap.classList.add("list-error");
      valid = false;
      showStepBanner(6, "Please add at least one course requirement.");
    }
  }

  if (step === 7) {
    if (outcomes.length === 0) {
      const wrap = document.getElementById("outcomesWrap");
      if (wrap) wrap.classList.add("list-error");
      valid = false;
      showStepBanner(7, "Please add at least one learning outcome.");
    }
  }

  if (!valid) {
    scrollToFirstError(step);
  }

  return valid;
}

/* ── Auto-clear field errors on input ── */
document.addEventListener("input", (e) => {
  const input = e.target.closest("input, select, textarea");
  if (!input) return;
  input.classList.remove("input-error");
  const err = input.parentElement.querySelector(".field-error");
  if (err) err.remove();
});

/* ── Auto-clear upload error on file selection ── */
function clearUploadError() {
  const card = document.getElementById("thumbnailUpload");
  if (card) card.classList.remove("upload-error");
  const banner = document.querySelector('.form-step[data-step="2"] .step-error-banner');
  if (banner) banner.remove();
}

/* ── Auto-clear tag error on tag add/remove ── */
function clearTagError() {
  const wrap = document.getElementById("tagInputWrap");
  if (wrap) wrap.classList.remove("tag-error");
  const banner = document.querySelector('.form-step[data-step="3"] .step-error-banner');
  if (banner) banner.remove();
}

/* ── Auto-clear list errors on item add/remove ── */
function clearListError(step) {
  const wrapId = step === 6 ? "requirementsWrap" : "outcomesWrap";
  const wrap = document.getElementById(wrapId);
  if (wrap) wrap.classList.remove("list-error");
  const banner = document.querySelector(`.form-step[data-step="${step}"] .step-error-banner`);
  if (banner) banner.remove();
}

/* ── Country visibility: Global overrides everything ── */
document.getElementById("countryVisibility").addEventListener("change", function () {
  const select = this;
  const options = [...select.options];
  const globalOpt = options.find((o) => o.value === "Global");
  const countryOpts = options.filter((o) => o.value !== "Global");
  const selectedVals = [...select.selectedOptions].map((o) => o.value);

  const globalSelected = selectedVals.includes("Global");
  const anyCountrySelected = countryOpts.some((o) => o.selected);

  if (globalSelected) {
    countryOpts.forEach((o) => { o.selected = false; o.disabled = true; });
    if (globalOpt) globalOpt.disabled = false;
  } else if (anyCountrySelected) {
    countryOpts.forEach((o) => o.disabled = false);
    if (globalOpt) globalOpt.disabled = true;
  } else {
    options.forEach((o) => o.disabled = false);
  }

  select.classList.remove("input-error");
  const banner = document.querySelector('.form-step[data-step="3"] .step-error-banner');
  if (banner) banner.remove();
});

/* ── Clear toggle error on radio change ── */
document.querySelectorAll('input[name="pricingType"]').forEach((r) => {
  r.addEventListener("change", () => {
    const toggle = document.querySelector(".pricing-toggle");
    if (toggle) toggle.classList.remove("toggle-error");
    const banner = document.querySelector('.form-step[data-step="5"] .step-error-banner');
    if (banner) banner.remove();
  });
});

/* =========================
   TAG INPUT
========================= */

const tagInput = document.getElementById("tagInput");
const tagList = document.getElementById("tagList");
const suggestionTags = document.querySelectorAll(".suggestion-tag");

const tags = [];

function renderTags() {
  tagList.innerHTML = "";
  tags.forEach((t, i) => {
    const el = document.createElement("span");
    el.className = "tag";
    el.innerHTML = `${escapeHtml(t)} <i class="fa-solid fa-xmark" data-index="${i}"></i>`;
    tagList.appendChild(el);
  });
}

function addTag(text) {
  const cleaned = text.trim().replace(/,/g, "");
  if (!cleaned || tags.includes(cleaned)) return;
  tags.push(cleaned);
  renderTags();
}

tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag(tagInput.value);
    tagInput.value = "";
  }
});

tagList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("i");
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.index, 10);
  if (!isNaN(idx)) {
    tags.splice(idx, 1);
    renderTags();
  }
});

suggestionTags.forEach((btn) => {
  btn.addEventListener("click", () => {
    addTag(btn.dataset.tag);
  });
});

/* =========================
   REQUIREMENTS LIST
========================= */

const requirementInput = document.getElementById("requirementInput");
const addRequirementBtn = document.getElementById("addRequirementBtn");
const requirementsList = document.getElementById("requirementsList");
const requirements = [];

function renderRequirements() {
  requirementsList.innerHTML = "";
  requirements.forEach((r, i) => {
    const el = document.createElement("div");
    el.className = "list-item";
    el.innerHTML = `${escapeHtml(r)} <i class="fa-solid fa-xmark" data-req="${i}"></i>`;
    requirementsList.appendChild(el);
  });
}

function addRequirement() {
  const text = requirementInput.value.trim();
  if (!text) return;
  requirements.push(text);
  renderRequirements();
  requirementInput.value = "";
}

addRequirementBtn.addEventListener("click", addRequirement);
requirementInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addRequirement(); }
});

requirementsList.addEventListener("click", (e) => {
  const btn = e.target.closest("i");
  if (!btn) return;
  const idx = parseInt(btn.dataset.req, 10);
  if (!isNaN(idx)) { requirements.splice(idx, 1); renderRequirements(); }
});

/* =========================
   OUTCOMES LIST
========================= */

const outcomeInput = document.getElementById("outcomeInput");
const addOutcomeBtn = document.getElementById("addOutcomeBtn");
const outcomesList = document.getElementById("outcomesList");
const outcomes = [];

function renderOutcomes() {
  outcomesList.innerHTML = "";
  outcomes.forEach((o, i) => {
    const el = document.createElement("div");
    el.className = "list-item";
    el.innerHTML = `${escapeHtml(o)} <i class="fa-solid fa-xmark" data-out="${i}"></i>`;
    outcomesList.appendChild(el);
  });
}

function addOutcome() {
  const text = outcomeInput.value.trim();
  if (!text) return;
  outcomes.push(text);
  renderOutcomes();
  outcomeInput.value = "";
}

addOutcomeBtn.addEventListener("click", addOutcome);
outcomeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addOutcome(); }
});

outcomesList.addEventListener("click", (e) => {
  const btn = e.target.closest("i");
  if (!btn) return;
  const idx = parseInt(btn.dataset.out, 10);
  if (!isNaN(idx)) { outcomes.splice(idx, 1); renderOutcomes(); }
});

/* =========================
   UPLOAD PLACEHOLDERS
========================= */

function setupUpload(areaId, inputId, previewId, imgId, removeId, fileKey) {
  const area = document.getElementById(areaId);
  const preview = document.getElementById(previewId);
  const removeBtn = document.getElementById(removeId);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.style.display = "none";

  if (fileKey === "thumbnail") {
    fileInput.accept = "image/*";
  } else {
    fileInput.accept = "video/*";
  }

  area.parentElement.appendChild(fileInput);

  area.addEventListener("click", () => fileInput.click());

  area.addEventListener("dragover", (e) => {
    e.preventDefault();
    area.parentElement.style.borderColor = "var(--primary)";
    area.parentElement.style.boxShadow = "0 0 0 4px rgba(37,99,235,0.08)";
  });

  area.addEventListener("dragleave", () => {
    area.parentElement.style.borderColor = "";
    area.parentElement.style.boxShadow = "";
  });

  area.addEventListener("drop", (e) => {
    e.preventDefault();
    area.parentElement.style.borderColor = "";
    area.parentElement.style.boxShadow = "";
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0], preview, imgId, area, fileKey);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0], preview, imgId, area, fileKey);
    }
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    preview.style.display = "none";
    area.style.display = "flex";
    fileInput.value = "";
    const prevUrl = uploadedFiles[`${fileKey}PreviewUrl`];
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    delete uploadedFiles[fileKey];
    delete uploadedFiles[`${fileKey}PreviewUrl`];
  });
}

function handleFile(file, preview, imgId, area, fileKey) {
  uploadedFiles[fileKey] = file;
  const url = URL.createObjectURL(file);
  uploadedFiles[`${fileKey}PreviewUrl`] = url;
  const isImage = file.type.startsWith("image/");
  area.style.display = "none";

  if (isImage) {
    const img = preview.querySelector("img") || preview.querySelector("#thumbnailImg");
    if (img) img.src = url;
  } else {
    const video = preview.querySelector("video");
    if (video) video.src = url;
  }
  preview.style.display = "block";
}

setupUpload("thumbnailArea", "thumbnailUpload", "thumbnailPreview", "thumbnailImg", "thumbnailRemove", "thumbnail");
setupUpload("videoArea", "videoUpload", "videoPreview", "videoPreviewPlayer", "videoRemove", "promoVideo");
setupUpload("trailerArea", "trailerUpload", "trailerPreview", "trailerPreviewPlayer", "trailerRemove", "trailerVideo");

/* =========================
   BUILD REVIEW
========================= */

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function getSelectedText(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return el.options[el.selectedIndex]?.text || "";
}

function getSelectedRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function getMultiSelect(id) {
  const el = document.getElementById(id);
  if (!el) return [];
  return [...el.selectedOptions].map((o) => o.value);
}

function buildReview() {
  const title = getVal("courseTitle") || "Not provided";
  const subtitle = getVal("courseSubtitle") || "Not provided";
  const desc = getVal("courseDescription") || "Not provided";
  const category = getSelectedText("courseCategory") || "Not selected";

  const thumbCard = document.getElementById("reviewThumbnailCard");
  const thumbUrl = uploadedFiles.thumbnailPreviewUrl;
  if (thumbUrl) {
    thumbCard.innerHTML = `<img src="${thumbUrl}" alt="Course thumbnail" class="review-thumbnail-img" />`;
  } else {
    thumbCard.innerHTML = `<div class="review-thumbnail-placeholder"><i class="fa-solid fa-image"></i><p>No thumbnail uploaded</p></div>`;
  }

  document.getElementById("reviewInfo").innerHTML = `
    <div class="review-item"><small>Title</small><strong>${escapeHtml(title)}</strong></div>
    <div class="review-item"><small>Subtitle</small><strong>${escapeHtml(subtitle)}</strong></div>
    <div class="review-item"><small>Category</small><strong>${escapeHtml(category)}</strong></div>
    <div class="review-item" style="flex-direction:column;gap:4px">
      <small>Description</small>
      <strong style="text-align:left;font-weight:500;font-size:13px;line-height:1.6">
        ${escapeHtml(desc)}
      </strong>
    </div>
  `;

  const countryVis = getMultiSelect("countryVisibility");
  const countryStr = countryVis.length ? countryVis.join(", ") : "Worldwide";
  const visibility = getSelectedRadio("visibility") || "public";
  const ageGroup = getSelectedRadio("ageGroup") || "all";

  const tagStr = tags.length ? tags.join(", ") : "None added";

  document.getElementById("reviewTags").innerHTML = `
    <div class="review-item"><small>Tags</small>
      <div class="review-tags">${tags.length ? tags.map((t) => `<span class="review-tag">${escapeHtml(t)}</span>`).join("") : "<strong style='color:var(--muted)'>None added</strong>"}</div>
    </div>
    <div class="review-item"><small>Countries</small><strong>${escapeHtml(countryStr)}</strong></div>
    <div class="review-item"><small>Visibility</small><strong style="text-transform:capitalize">${visibility}</strong></div>
    <div class="review-item"><small>Age Group</small><strong style="text-transform:capitalize">${ageGroup.replace("-", " ")}</strong></div>
  `;

  const startDate = getVal("startDate") || "Not set";
  const startTime = getVal("startTime") || "Not set";
  const endDate = getVal("endDate") || "Not set";
  const endTime = getVal("endTime") || "Not set";
  const tz = getSelectedText("timezone") || "Not selected";

  document.getElementById("reviewSchedule").innerHTML = `
    <div class="review-item"><small>Start Date</small><strong>${escapeHtml(startDate)}</strong></div>
    <div class="review-item"><small>Start Time</small><strong>${escapeHtml(startTime)}</strong></div>
    <div class="review-item"><small>End Date</small><strong>${escapeHtml(endDate)}</strong></div>
    <div class="review-item"><small>End Time</small><strong>${escapeHtml(endTime)}</strong></div>
    <div class="review-item"><small>Time Zone</small><strong>${escapeHtml(tz)}</strong></div>
  `;

  const pricingType = getSelectedRadio("pricingType") || "free";

  document.getElementById("reviewPricing").innerHTML = `
    <div class="review-item"><small>Access</small><strong style="text-transform:capitalize">${pricingType}</strong></div>
  `;

  const reqStr = requirements.length
    ? requirements.map((r) => `<div class="review-list-item"><i class="fa-solid fa-circle-check"></i>${escapeHtml(r)}</div>`).join("")
    : "<strong style='color:var(--muted);font-size:13px'>No requirements listed</strong>";

  document.getElementById("reviewRequirements").innerHTML = reqStr;

  const outStr = outcomes.length
    ? outcomes.map((o) => `<div class="review-list-item"><i class="fa-solid fa-star"></i>${escapeHtml(o)}</div>`).join("")
    : "<strong style='color:var(--muted);font-size:13px'>No outcomes listed</strong>";

  document.getElementById("reviewOutcomes").innerHTML = outStr;
}

/* =========================
   SUBMIT COURSE
========================= */

async function submitCourse() {
  const btn = nextBtn;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

  try {
    const formData = new FormData();

    const courseData = {
      title: getVal("courseTitle"),
      subtitle: getVal("courseSubtitle"),
      description: getVal("courseDescription"),
      category: getSelectedText("courseCategory"),
      tags,
      countryVisibility: getMultiSelect("countryVisibility"),
      visibility: getSelectedRadio("visibility") || "public",
      ageGroup: getSelectedRadio("ageGroup") || "all",
      startDate: getVal("startDate"),
      startTime: getVal("startTime"),
      endDate: getVal("endDate"),
      endTime: getVal("endTime"),
      timezone: getSelectedText("timezone"),
      accessType: getSelectedRadio("pricingType") || "free",
      requirements,
      outcomes
    };

    formData.append("course", JSON.stringify(courseData));

    if (uploadedFiles.thumbnail) formData.append("thumbnail", uploadedFiles.thumbnail);
    if (uploadedFiles.promoVideo) formData.append("promoVideo", uploadedFiles.promoVideo);
    if (uploadedFiles.trailerVideo) formData.append("trailerVideo", uploadedFiles.trailerVideo);

    const res = await fetch(`${API_BASE}/api/teacher/save-course`, {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to save course");
    }

    showSuccessModal(data.courseTitle || courseData.title);

  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Publish Course';
  }
}

/* =========================
   SUCCESS MODAL
========================= */

function showSuccessModal(courseTitle) {
  document.getElementById("successCourseTitle").textContent = courseTitle || "your course";
  document.getElementById("successModal").classList.add("open");
}

document.getElementById("successModalClose").addEventListener("click", () => {
  window.location.href = "../index.html";
});

document.getElementById("successModalOverlay").addEventListener("click", () => {
  window.location.href = "../index.html";
});

/* =========================
   MOBILE MENU
========================= */

document.getElementById("mobileMenuBtn").addEventListener("click", () => {
  document.getElementById("teacherSidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("open");
});

document.getElementById("sidebarOverlay").addEventListener("click", () => {
  document.getElementById("teacherSidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
});

/* =========================
   LOGOUT
========================= */

document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await fetch("https://ai-impact-server.vercel.app/api/auth/logout", {
      method: "POST", credentials: "include"
    });
  } catch (err) {}
  localStorage.removeItem("impactech_user");
  localStorage.removeItem("impactech_token");
  window.location.href = "../../sign-in/";
});

/* =========================
   LOAD COUNTRIES
========================= */

async function loadCountries() {
  const select = document.getElementById("countryVisibility");
  const loadingOption = document.getElementById("countryLoadingOption");

  try {
    const res = await fetch(COUNTRIES_URL);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();

    if (!data.success || !Array.isArray(data.countries)) {
      throw new Error(data.message || "Invalid response");
    }

    if (loadingOption) loadingOption.remove();

    data.countries.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error("Load countries error:", err);

    if (loadingOption) {
      loadingOption.textContent = "Failed to load countries";
      loadingOption.disabled = true;
    }
  }
}

/* =========================
   HELPERS
========================= */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", async function () {
  const auth = await AuthenticateUser();
  if (!auth.success) {
    window.location.href = "../../sign-in/";
    return;
  }
  currentUser = auth.user;
  const accountType = String(auth.user?.accountType || "").toLowerCase().trim();
  if (accountType !== "teacher") {
    window.location.href = "../../sign-in/";
    return;
  }
  document.body.style.display = "";
  loadCountries();
  goToStep(1);
});
