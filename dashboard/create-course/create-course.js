
/* =========================
   STATE
========================= */

const API_BASE = "https://ai-impact-server.vercel.app";
const COUNTRIES_URL = `${API_BASE}/api/load-countries`;

let currentStep = 1;
const TOTAL_STEPS = 8;
let currentUser = null;
let uploadedFiles = {};
let selectedCategory = "";
let selectedCategoriesList = [];
let selectedCountries = [];
const countryData = [];
let selectedTimezone = "";

const CATEGORIES = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology",
  "Computer Science", "Programming", "Web Development", "Mobile Development",
  "Cybersecurity", "Data Science", "AI & Machine Learning",
  "Business", "Marketing", "Finance",
  "Graphic Design", "UI/UX Design",
  "Music", "Arts", "Agriculture",
  "Engineering", "Medicine", "Law", "Languages",
  "Exam Preparation", "Vocational Skills"
];

const TIMEZONE_GROUPS = [
  {
    region: "Africa",
    icon: "fa-solid fa-earth-africa",
    zones: [
      { value: "Africa/Lagos", label: "Lagos", code: "WAT" },
      { value: "Africa/Cairo", label: "Cairo", code: "EET" },
      { value: "Africa/Johannesburg", label: "Johannesburg", code: "SAST" },
      { value: "Africa/Nairobi", label: "Nairobi", code: "EAT" }
    ]
  },
  {
    region: "Europe",
    icon: "fa-solid fa-earth-europe",
    zones: [
      { value: "Europe/London", label: "London", code: "GMT/BST" },
      { value: "Europe/Paris", label: "Paris", code: "CET/CEST" },
      { value: "Europe/Berlin", label: "Berlin", code: "CET/CEST" }
    ]
  },
  {
    region: "America",
    icon: "fa-solid fa-earth-americas",
    zones: [
      { value: "America/New_York", label: "New York", code: "EST/EDT" },
      { value: "America/Chicago", label: "Chicago", code: "CST/CDT" },
      { value: "America/Denver", label: "Denver", code: "MST/MDT" },
      { value: "America/Los_Angeles", label: "Los Angeles", code: "PST/PDT" },
      { value: "America/Toronto", label: "Toronto", code: "EST/EDT" }
    ]
  },
  {
    region: "Asia",
    icon: "fa-solid fa-earth-asia",
    zones: [
      { value: "Asia/Dubai", label: "Dubai", code: "GST" },
      { value: "Asia/Tokyo", label: "Tokyo", code: "JST" },
      { value: "Asia/Shanghai", label: "Shanghai", code: "CST" },
      { value: "Asia/Kolkata", label: "Kolkata", code: "IST" },
      { value: "Asia/Singapore", label: "Singapore", code: "SGT" }
    ]
  },
  {
    region: "Other",
    icon: "fa-solid fa-clock",
    zones: [
      { value: "Australia/Sydney", label: "Sydney", code: "AEST/AEDT" },
      { value: "Pacific/Auckland", label: "Auckland", code: "NZST/NZDT" },
      { value: "UTC", label: "UTC", code: "UTC" }
    ]
  }
];



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
  stepEl.querySelectorAll("#countryTrigger.input-error, #categoryTrigger.input-error, #timezoneTrigger.input-error, #startTimeTrigger.input-error, #endTimeTrigger.input-error").forEach((el) => el.classList.remove("input-error"));
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
    const cat = selectedCategory;

    if (!title) {
      showFieldError("courseTitle", "Course title is required.");
      valid = false;
    }
    if (!desc) {
      showFieldError("courseDescription", "Course description is required.");
      valid = false;
    }
    if (!cat) {
      const sel = document.getElementById("categoryTrigger");
      if (sel) sel.classList.add("input-error");
      valid = false;
    }
  }

  if (step === 2) {
    const file = uploadedFiles.thumbnail;
    if (!file) {
      const card = document.getElementById("thumbnailUpload");
      if (card) card.classList.add("upload-error");
      valid = false;
      showStepBanner(2, "Please upload a course thumbnail before continuing.");
    } else {
      const errors = validateThumbnail(file);
      if (errors.length > 0) {
        valid = false;
        showThumbnailErrors(errors);
      }
    }
    // Validate video files if present
    ["promoVideo", "trailerVideo"].forEach(function(k) {
      const vf = uploadedFiles[k];
      if (vf) {
        const vErrors = validateVideo(vf);
        if (vErrors.length > 0) {
          valid = false;
          showVideoError(vErrors[0], k);
        }
      }
    });
  }

  if (step === 3) {
    if (tags.length === 0) {
      const wrap = document.getElementById("tagInputWrap");
      if (wrap) wrap.classList.add("tag-error");
      valid = false;
    }
    if (selectedCountries.length === 0) {
      const sel = document.getElementById("countryTrigger");
      if (sel) sel.classList.add("input-error");
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
      document.getElementById("startTimeTrigger")?.classList.add("input-error");
      valid = false;
    }

    if (!selectedTimezone) {
      document.getElementById("timezoneTrigger")?.classList.add("input-error");
      valid = false;
    }

    const endDate = document.getElementById("endDate").value;
    if (endDate && startDate && endDate < startDate) {
      showFieldError("endDate", "End date cannot be earlier than start date.");
      valid = false;
    }

    if (!valid) {
      showStepBanner(4, "Please fill in all required schedule fields.");
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

/* ── Auto-clear timezone/time trigger errors ── */
document.addEventListener("click", (e) => {
  const tzTrigger = e.target.closest("#timezoneTrigger");
  if (tzTrigger) tzTrigger.classList.remove("input-error");
  const stTrigger = e.target.closest("#startTimeTrigger");
  if (stTrigger) stTrigger.classList.remove("input-error");
  const etTrigger = e.target.closest("#endTimeTrigger");
  if (etTrigger) etTrigger.classList.remove("input-error");
});

/* =========================
   CATEGORY MODAL PICKER
========================= */

function initCategorySelector() {
  const trigger = document.getElementById("categoryTrigger");
  const modal = document.getElementById("categoryModal");
  const overlay = document.getElementById("categoryModalOverlay");
  const search = document.getElementById("categorySearch");
  const body = document.getElementById("categoryModalBody");
  const placeholder = document.getElementById("categoryPlaceholder");
  const countEl = document.getElementById("categoryCount");
  const chipsEl = document.getElementById("categoryChips");
  const hiddenInput = document.getElementById("courseCategory");
  const doneBtn = document.getElementById("categoryModalDone");
  const closeBtn = document.getElementById("categoryModalClose");

  function openModal() {
    overlay.classList.add("open");
    modal.classList.add("open");
    search.value = "";
    renderOptions("");
    search.focus();
  }

  function closeModal() {
    overlay.classList.remove("open");
    modal.classList.remove("open");
  }

  function renderOptions(filter) {
    const q = filter.toLowerCase();
    const filtered = CATEGORIES.filter((c) => c.toLowerCase().includes(q));
    body.innerHTML = "";
    if (filtered.length === 0) {
      const div = document.createElement("div");
      div.className = "category-grid-item no-results";
      div.textContent = "No categories found";
      body.appendChild(div);
      return;
    }
    const grid = document.createElement("div");
    grid.className = "category-grid";
    filtered.forEach((cat) => {
      const div = document.createElement("div");
      div.className = "category-grid-item";
      if (selectedCategoriesList.includes(cat)) div.classList.add("checked");
      const check = document.createElement("span");
      check.className = "picker-option-check";
      check.innerHTML = '<i class="fa-solid fa-check"></i>';
      const label = document.createElement("span");
      label.textContent = cat;
      div.appendChild(check);
      div.appendChild(label);
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = selectedCategoriesList.indexOf(cat);
        if (idx === -1) selectedCategoriesList.push(cat);
        else selectedCategoriesList.splice(idx, 1);
        div.classList.toggle("checked");
      });
      grid.appendChild(div);
    });
    body.appendChild(grid);
  }

  function applySelection() {
    selectedCategory = selectedCategoriesList.length > 0 ? selectedCategoriesList[0] : "";
    hiddenInput.value = selectedCategory;

    if (selectedCategoriesList.length > 0) {
      placeholder.style.display = "none";
      countEl.style.display = "inline-flex";
      countEl.textContent = selectedCategoriesList.length;
      chipsEl.innerHTML = selectedCategoriesList
        .map((c) => `<span class="picker-chip">${escapeHtml(c)} <i class="fa-solid fa-xmark" data-cat="${escapeHtml(c)}"></i></span>`)
        .join("");
      chipsEl.querySelectorAll("i").forEach((icon) => {
        icon.addEventListener("click", (e) => {
          e.stopPropagation();
          const cat = icon.dataset.cat;
          const idx = selectedCategoriesList.indexOf(cat);
          if (idx !== -1) selectedCategoriesList.splice(idx, 1);
          applySelection();
          if (selectedCategoriesList.length === 0) {
            selectedCategory = "";
            hiddenInput.value = "";
          }
        });
      });
    } else {
      placeholder.style.display = "";
      countEl.style.display = "none";
      chipsEl.innerHTML = "";
    }
    trigger.classList.remove("input-error");
    closeModal();
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal();
  });

  search.addEventListener("input", () => renderOptions(search.value));
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  doneBtn.addEventListener("click", applySelection);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);
}

/* =========================
   COUNTRY MODAL PICKER
========================= */

function initCountryPicker() {
  const trigger = document.getElementById("countryTrigger");
  const modal = document.getElementById("countryModal");
  const overlay = document.getElementById("countryModalOverlay");
  const search = document.getElementById("countrySearch");
  const body = document.getElementById("countryModalBody");
  const placeholder = document.getElementById("countryPlaceholder");
  const chipsEl = document.getElementById("countryChips");
  const countEl = document.getElementById("countryCount");
  const doneBtn = document.getElementById("countryModalDone");
  const closeBtn = document.getElementById("countryModalClose");
  const globalOpt = body.querySelector(".picker-global-option");

  function renderChips() {
    const globalIdx = selectedCountries.indexOf("Global");
    if (globalIdx !== -1) {
      chipsEl.innerHTML = `
        <span class="picker-chip global-chip">
          🌍 Global (Everyone)
          <i class="fa-solid fa-xmark" data-country="Global"></i>
        </span>`;
    } else if (selectedCountries.length > 0) {
      chipsEl.innerHTML = selectedCountries
        .filter((c) => c !== "Global")
        .map((c) => `<span class="picker-chip">${escapeHtml(c)} <i class="fa-solid fa-xmark" data-country="${escapeHtml(c)}"></i></span>`)
        .join("");
    } else {
      chipsEl.innerHTML = `<span class="picker-placeholder" id="countryPlaceholder">Select countries...</span>`;
    }
    placeholder.style.display = selectedCountries.length > 0 ? "none" : "";

    if (selectedCountries.length > 0) {
      countEl.style.display = "inline-flex";
      countEl.textContent = selectedCountries.length;
    } else {
      countEl.style.display = "none";
    }

    chipsEl.querySelectorAll("i").forEach((icon) => {
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        const country = icon.dataset.country;
        removeCountry(country);
      });
    });
  }

  function renderCountryOptions(filter) {
    const q = filter.toLowerCase();
    const existing = body.querySelectorAll(".picker-modal-option:not(.picker-global-option):not(.picker-modal-divider)");
    existing.forEach((el) => el.remove());
    const loadingEl = body.querySelector(".picker-loading");
    if (loadingEl) loadingEl.remove();

    const filtered = countryData.filter((c) => c.name.toLowerCase().includes(q));

    const noResults = body.querySelector(".picker-modal-option.no-results");
    if (noResults) noResults.remove();

    if (filtered.length === 0) {
      const div = document.createElement("div");
      div.className = "picker-modal-option no-results";
      div.textContent = "No countries found";
      body.appendChild(div);
      return;
    }

    filtered.forEach((c) => {
      const label = document.createElement("div");
      label.className = "picker-modal-option";
      if (selectedCountries.includes(c.name)) label.classList.add("checked");
      if (selectedCountries.includes("Global")) label.classList.add("disabled");
      label.dataset.value = c.name;

      const check = document.createElement("span");
      check.className = "picker-option-check";
      check.innerHTML = '<i class="fa-solid fa-check"></i>';

      const span = document.createElement("span");
      span.className = "picker-option-label";
      span.textContent = c.name;

      label.appendChild(check);
      label.appendChild(span);

      label.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCountry(c.name, label);
      });

      body.appendChild(label);
    });
  }

  function toggleCountry(name, labelEl) {
    if (name === "Global") {
      selectedCountries = ["Global"];
    } else {
      selectedCountries = selectedCountries.filter((c) => c !== "Global");
      const idx = selectedCountries.indexOf(name);
      if (idx === -1) selectedCountries.push(name);
      else selectedCountries.splice(idx, 1);
    }
    refreshCountryUI();
  }

  function removeCountry(name) {
    if (name === "Global") {
      selectedCountries = [];
    } else {
      selectedCountries = selectedCountries.filter((c) => c !== name);
    }
    trigger.classList.remove("input-error");
    renderChips();
  }

  function refreshCountryUI() {
    renderChips();
    renderCountryOptions(search.value);
    syncGlobalOption();

    const banner = document.querySelector('.form-step[data-step="3"] .step-error-banner');
    if (banner) banner.remove();
  }

  function openModal() {
    overlay.classList.add("open");
    modal.classList.add("open");
    search.value = "";
    renderCountryOptions("");
    syncGlobalOption();
    search.focus();
  }

  function syncGlobalOption() {
    if (!globalOpt) return;
    globalOpt.classList.toggle("checked", selectedCountries.includes("Global"));
    const anyCountry = selectedCountries.some((c) => c !== "Global");
    globalOpt.classList.toggle("disabled", anyCountry);
  }

  function closeModal() {
    overlay.classList.remove("open");
    modal.classList.remove("open");
  }

  function applySelection() {
    trigger.classList.remove("input-error");
    closeModal();
    renderChips();
  }

  globalOpt.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCountry("Global", globalOpt);
  });

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal();
  });

  search.addEventListener("input", () => renderCountryOptions(search.value));
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  doneBtn.addEventListener("click", applySelection);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);

  renderChips();
}

/* =========================
   TIMEZONE MODAL PICKER
========================= */

function initTimezonePicker() {
  const trigger = document.getElementById("timezoneTrigger");
  const modal = document.getElementById("timezoneModal");
  const overlay = document.getElementById("timezoneModalOverlay");
  const search = document.getElementById("timezoneSearch");
  const body = document.getElementById("timezoneModalBody");
  const placeholder = document.getElementById("timezonePlaceholder");
  const chipsEl = document.getElementById("timezoneChips");
  const doneBtn = document.getElementById("timezoneModalDone");
  const closeBtn = document.getElementById("timezoneModalClose");
  let selected = selectedTimezone;

  function openModal() {
    overlay.classList.add("open");
    modal.classList.add("open");
    selected = selectedTimezone;
    search.value = "";
    renderOptions("");
    search.focus();
  }

  function closeModal() {
    overlay.classList.remove("open");
    modal.classList.remove("open");
  }

  function renderOptions(filter) {
    const q = filter.toLowerCase();
    body.innerHTML = "";

    let hasVisible = false;

    TIMEZONE_GROUPS.forEach((group) => {
      const filteredZones = group.zones.filter((z) => {
        const val = z.value.toLowerCase();
        const lbl = z.label.toLowerCase();
        const code = z.code.toLowerCase();
        return val.includes(q) || lbl.includes(q) || code.includes(q) || group.region.toLowerCase().includes(q);
      });
      if (filteredZones.length === 0) return;
      hasVisible = true;

      const groupDiv = document.createElement("div");
      groupDiv.className = "tz-region-group";

      const header = document.createElement("div");
      header.className = "tz-region-header";
      header.innerHTML = `<i class="${group.icon}"></i> ${group.region}`;
      groupDiv.appendChild(header);

      filteredZones.forEach((z) => {
        const opt = document.createElement("div");
        opt.className = "tz-option";
        if (z.value === selected) opt.classList.add("checked");
        opt.dataset.value = z.value;

        const check = document.createElement("span");
        check.className = "picker-option-check";
        check.innerHTML = '<i class="fa-solid fa-check"></i>';

        const label = document.createElement("span");
        label.className = "picker-option-label";
        label.textContent = z.label;

        const code = document.createElement("span");
        code.className = "tz-code";
        code.textContent = z.code;

        opt.appendChild(check);
        opt.appendChild(label);
        opt.appendChild(code);

        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          body.querySelectorAll(".tz-option.checked").forEach((el) => el.classList.remove("checked"));
          opt.classList.add("checked");
          selected = z.value;
        });

        groupDiv.appendChild(opt);
      });

      body.appendChild(groupDiv);
    });

    if (!hasVisible) {
      const div = document.createElement("div");
      div.className = "picker-modal-option no-results";
      div.textContent = "No time zones found";
      body.appendChild(div);
    }
  }

  function applySelection() {
    selectedTimezone = selected;
    const hidden = document.getElementById("timezone");
    hidden.value = selectedTimezone;

    if (selectedTimezone) {
      placeholder.style.display = "none";
      const zone = TIMEZONE_GROUPS.flatMap((g) => g.zones).find((z) => z.value === selectedTimezone);
      chipsEl.innerHTML = `<span class="picker-chip">${escapeHtml(zone ? zone.label : selectedTimezone)} <i class="fa-solid fa-xmark" id="timezoneRemove"></i></span>`;
      document.getElementById("timezoneRemove")?.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedTimezone = "";
        hidden.value = "";
        placeholder.style.display = "";
        chipsEl.innerHTML = "";
        trigger.classList.remove("input-error");
      });
    }
    trigger.classList.remove("input-error");
    closeModal();
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal();
  });

  search.addEventListener("input", () => renderOptions(search.value));
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  doneBtn.addEventListener("click", applySelection);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);
}

/* =========================
   TIME PICKER MODAL
========================= */

let _timePickerTarget = null;

function initTimePicker() {
  const startTrigger = document.getElementById("startTimeTrigger");
  const endTrigger = document.getElementById("endTimeTrigger");
  const modal = document.getElementById("timePickerModal");
  const overlay = document.getElementById("timePickerOverlay");
  const title = document.getElementById("timePickerTitle");
  const preview = document.getElementById("timePickerPreview");
  const hoursList = document.getElementById("timePickerHours");
  const minutesList = document.getElementById("timePickerMinutes");
  const periodsList = document.getElementById("timePickerPeriods");
  const doneBtn = document.getElementById("timePickerDone");
  const closeBtn = document.getElementById("timePickerClose");

  let selHour = "08";
  let selMinute = "00";
  let selPeriod = "AM";

  function buildHours() {
    hoursList.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
      const val = String(i).padStart(2, "0");
      const div = document.createElement("div");
      div.className = "time-picker-item";
      if (val === selHour) div.classList.add("selected");
      div.textContent = val;
      div.addEventListener("click", () => {
        hoursList.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");
        selHour = val;
        updatePreview();
        div.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      hoursList.appendChild(div);
    }
    const selectedEl = hoursList.querySelector(".selected");
    if (selectedEl) setTimeout(() => selectedEl.scrollIntoView({ block: "center" }), 50);
  }

  function buildMinutes() {
    minutesList.innerHTML = "";
    for (let i = 0; i <= 59; i++) {
      const val = String(i).padStart(2, "0");
      const div = document.createElement("div");
      div.className = "time-picker-item";
      if (val === selMinute) div.classList.add("selected");
      div.textContent = val;
      div.addEventListener("click", () => {
        minutesList.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");
        selMinute = val;
        updatePreview();
        div.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      minutesList.appendChild(div);
    }
    const selectedEl = minutesList.querySelector(".selected");
    if (selectedEl) setTimeout(() => selectedEl.scrollIntoView({ block: "center" }), 50);
  }

  function buildPeriods() {
    periodsList.innerHTML = "";
    ["AM", "PM"].forEach((p) => {
      const div = document.createElement("div");
      div.className = "time-picker-period";
      if (p === selPeriod) div.classList.add("selected");
      div.textContent = p;
      div.addEventListener("click", () => {
        periodsList.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");
        selPeriod = p;
        updatePreview();
      });
      periodsList.appendChild(div);
    });
  }

  function updatePreview() {
    preview.textContent = `${selHour}:${selMinute} ${selPeriod}`;
  }

  function get24hTime() {
    let h = parseInt(selHour, 10);
    if (selPeriod === "PM" && h !== 12) h += 12;
    if (selPeriod === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${selMinute}`;
  }

  function openPicker(target) {
    _timePickerTarget = target;
    title.textContent = target === "start" ? "Select Start Time" : "Select End Time";

    const hidden = document.getElementById(target === "start" ? "startTime" : "endTime");
    const existing = hidden.value;
    if (existing) {
      const parts = existing.split(":");
      let h = parseInt(parts[0], 10);
      const m = parts[1] || "00";
      selPeriod = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      selHour = String(h).padStart(2, "0");
      selMinute = m;
    } else {
      selHour = "08";
      selMinute = "00";
      selPeriod = "AM";
    }

    overlay.classList.add("open");
    modal.classList.add("open");
    buildHours();
    buildMinutes();
    buildPeriods();
    updatePreview();
  }

  function closePicker() {
    overlay.classList.remove("open");
    modal.classList.remove("open");
    _timePickerTarget = null;
  }

  function applyTime() {
    const target = _timePickerTarget;
    if (!target) { closePicker(); return; }
    const hidden = document.getElementById(target === "start" ? "startTime" : "endTime");
    const value = get24hTime();
    hidden.value = value;

    const placeholder = document.getElementById(target === "start" ? "startTimePlaceholder" : "endTimePlaceholder");
    const valueEl = document.getElementById(target === "start" ? "startTimeValue" : "endTimeValue");
    const trigger = document.getElementById(target === "start" ? "startTimeTrigger" : "endTimeTrigger");

    placeholder.style.display = "none";
    valueEl.style.display = "";
    valueEl.textContent = `🕒 ${selHour}:${selMinute} ${selPeriod}`;
    trigger.classList.remove("input-error");

    closePicker();
  }

  startTrigger.addEventListener("click", () => openPicker("start"));
  endTrigger.addEventListener("click", () => openPicker("end"));
  doneBtn.addEventListener("click", applyTime);
  closeBtn.addEventListener("click", closePicker);
  overlay.addEventListener("click", closePicker);
}

/* =========================
   THUMBNAIL VALIDATION
========================= */

const THUMBNAIL_MAX_SIZE = 2 * 1024 * 1024;
const THUMBNAIL_MIN_WIDTH = 640;
const THUMBNAIL_MIN_HEIGHT = 360;
const THUMBNAIL_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const VIDEO_MAX_SIZE = 100 * 1024 * 1024;
const VIDEO_ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function validateThumbnail(file) {
  const errors = [];

  if (!THUMBNAIL_ALLOWED_TYPES.includes(file.type)) {
    errors.push("Unsupported image format. Use JPG, PNG, or WEBP.");
  }

  if (file.size > THUMBNAIL_MAX_SIZE) {
    errors.push("Thumbnail image is too large. Maximum size is 2MB.");
  }

  return errors;
}

function showThumbnailErrors(errors) {
  const existing = document.querySelector(".thumb-validation-error");
  if (existing) existing.remove();

  const container = document.getElementById("thumbnailUpload");
  if (!container) return;

  errors.forEach((msg) => {
    const div = document.createElement("div");
    div.className = "thumb-validation-error";
    div.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(msg)}`;
    container.parentElement.appendChild(div);
  });
}

function clearThumbnailErrors() {
  document.querySelectorAll(".thumb-validation-error").forEach((el) => el.remove());
}

function validateThumbnailDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < THUMBNAIL_MIN_WIDTH || img.height < THUMBNAIL_MIN_HEIGHT) {
        resolve([`Thumbnail does not meet the required dimensions. Minimum ${THUMBNAIL_MIN_WIDTH}x${THUMBNAIL_MIN_HEIGHT}px.`]);
      } else {
        resolve([]);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([]);
    };
    img.src = url;
  });
}

function validateVideo(file) {
  const errors = [];
  if (!VIDEO_ALLOWED_TYPES.includes(file.type)) {
    errors.push("Unsupported video format. Allowed: MP4, WebM, MOV.");
  }
  if (file.size > VIDEO_MAX_SIZE) {
    errors.push("Video exceeds maximum allowed size (100MB).");
  }
  return errors;
}

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

function fmtDuration(s) {
  if (!s || !isFinite(s)) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ":" + String(sec).padStart(2, "0");
}

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
    fileInput.accept = "video/mp4,video/webm,video/quicktime";
  }

  area.parentElement.appendChild(fileInput);

  const replaceId = fileKey === "promoVideo" ? "videoReplace" : "trailerReplace";
  const replaceBtn = document.getElementById(replaceId);
  const progressEl = fileKey === "promoVideo" ? "videoProgress" : "trailerProgress";
  const progressFill = fileKey === "promoVideo" ? "videoProgressFill" : "trailerProgressFill";
  const progressText = fileKey === "promoVideo" ? "videoProgressText" : "trailerProgressText";
  const overlayId = fileKey === "promoVideo" ? "videoPreviewOverlay" : "trailerPreviewOverlay";
  const playBtnId = fileKey === "promoVideo" ? "videoPlayBtn" : "trailerPlayBtn";
  const durationId = fileKey === "promoVideo" ? "videoPreviewDuration" : "trailerPreviewDuration";

  function clearVideo() {
    const prevUrl = uploadedFiles[`${fileKey}PreviewUrl`];
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    delete uploadedFiles[fileKey];
    delete uploadedFiles[`${fileKey}PreviewUrl`];
    fileInput.value = "";
  }

  function openFilePicker() { fileInput.click(); }

  function handleDropOrSelect(file) {
    if (!file) return;
    if (fileKey !== "thumbnail") {
      const vErrors = validateVideo(file);
      if (vErrors.length > 0) {
        showVideoError(vErrors[0], fileKey);
        return;
      }
    }
    if (fileKey === "thumbnail") {
      const tErrors = validateThumbnail(file);
      if (tErrors.length > 0) {
        showThumbnailErrors(tErrors);
        return;
      }
      validateThumbnailDimensions(file).then((dimErrors) => {
        if (dimErrors.length > 0) {
          showThumbnailErrors(dimErrors);
          return;
        }
        commitUpload(file);
      });
      return;
    }
    commitUpload(file);
  }

  function commitUpload(file) {
    clearVideo();
    uploadedFiles[fileKey] = file;
    const url = URL.createObjectURL(file);
    uploadedFiles[`${fileKey}PreviewUrl`] = url;
    area.style.display = "none";

    const pEl = document.getElementById(progressEl);
    const pf = document.getElementById(progressFill);
    const pt = document.getElementById(progressText);
    if (pEl) pEl.style.display = "";
    if (pf) pf.style.width = "0%";
    if (pt) pt.textContent = "Processing...";

    if (fileKey === "thumbnail") {
      const img = document.getElementById(imgId);
      if (img) img.src = url;
      preview.style.display = "block";
      const pEl = document.getElementById(progressEl);
      if (pEl) pEl.style.display = "none";
    } else {
      const video = document.getElementById(imgId);
      if (video) {
        video.src = url;
        video.load();
        video.onloadedmetadata = function() {
          const durEl = document.getElementById(durationId);
          if (durEl) durEl.textContent = fmtDuration(video.duration);
          video.onloadedmetadata = null;
        };
      }
      preview.style.display = "block";
      // Simulate progress completion
      if (pf) {
        let pct = 0;
        const iv = setInterval(() => {
          pct += Math.random() * 18 + 5;
          if (pct >= 95) { pct = 100; clearInterval(iv); }
          pf.style.width = Math.min(pct, 100) + "%";
        }, 180);
        setTimeout(() => {
          clearInterval(iv);
          pf.style.width = "100%";
          if (pt) pt.textContent = "Ready";
          setTimeout(() => {
            if (pEl) pEl.style.display = "none";
          }, 500);
        }, 1200);
      } else {
        if (pEl) pEl.style.display = "none";
      }
    }
  }

  // Click to browse on upload area
  area.addEventListener("click", openFilePicker);

  // Drag events on upload area
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
    if (e.dataTransfer.files.length) handleDropOrSelect(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleDropOrSelect(fileInput.files[0]);
  });

  // Remove button
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearVideo();
      preview.style.display = "none";
      area.style.display = "flex";
    });
  }

  // Replace button
  if (replaceBtn) {
    replaceBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openFilePicker();
    });
  }

  // Play/pause toggle on overlay
  const overlayEl = document.getElementById(overlayId);
  const playBtn = document.getElementById(playBtnId);
  if (overlayEl && playBtn) {
    function togglePlayback() {
      const video = document.getElementById(imgId);
      if (!video) return;
      if (video.paused) {
        video.play().catch(function() {});
      } else {
        video.pause();
      }
    }
    overlayEl.addEventListener("click", togglePlayback);
    playBtn.addEventListener("click", function(e) { e.stopPropagation(); togglePlayback(); });
    const video = document.getElementById(imgId);
    if (video) {
      video.addEventListener("play", function() {
        overlayEl.style.display = "none";
      });
      video.addEventListener("pause", function() {
        if (!video.ended) overlayEl.style.display = "flex";
      });
      video.addEventListener("ended", function() {
        overlayEl.style.display = "flex";
        var icon = playBtn.querySelector("i");
        if (icon) icon.className = "fa-solid fa-rotate-right";
      });
      video.addEventListener("playing", function() {
        overlayEl.style.display = "none";
        var icon = playBtn.querySelector("i");
        if (icon) icon.className = "fa-solid fa-pause";
      });
    }
  }
}

function showVideoError(msg, fileKey) {
  const cardId = fileKey === "promoVideo" ? "videoUpload" : "trailerUpload";
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.add("upload-error");
  const existing = card.querySelector(".upload-error-msg");
  if (existing) existing.remove();
  const err = document.createElement("div");
  err.className = "thumb-validation-error upload-error-msg";
  err.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + msg;
  card.appendChild(err);
  setTimeout(function() { card.classList.remove("upload-error"); if (err.parentNode) err.remove(); }, 4000);
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

function getSelectedRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function buildReview() {
  const title = getVal("courseTitle") || "Not provided";
  const subtitle = getVal("courseSubtitle") || "Not provided";
  const desc = getVal("courseDescription") || "Not provided";
  const category = selectedCategory || "Not selected";

  const thumbCard = document.getElementById("reviewThumbnailCard");
  const thumbUrl = uploadedFiles.thumbnailPreviewUrl;
  if (thumbUrl) {
    thumbCard.innerHTML = `
      <div class="review-thumbnail-wrap">
        <img src="${thumbUrl}" alt="Course thumbnail" class="review-thumbnail-img" />
        <span class="review-thumbnail-badge">Course Thumbnail</span>
      </div>`;
  } else {
    thumbCard.innerHTML = `<div class="review-thumbnail-placeholder"><i class="fa-solid fa-image"></i><p>No thumbnail uploaded</p></div>`;
  }

  // Review: Promo Video
  const promoUrl = uploadedFiles.promoVideoPreviewUrl;
  const promoCard = document.getElementById("reviewPromoVideoCard");
  const promoPlaceholder = document.getElementById("reviewPromoPlaceholder");
  const promoWrap = document.getElementById("reviewPromoWrap");
  const promoPlayer = document.getElementById("reviewPromoPlayer");
  const promoOverlay = document.getElementById("reviewPromoOverlay");
  if (promoUrl && promoCard) {
    if (promoPlaceholder) promoPlaceholder.style.display = "none";
    if (promoWrap) promoWrap.style.display = "";
    if (promoPlayer) { promoPlayer.src = promoUrl; promoPlayer.load(); }
    if (promoOverlay) {
      promoOverlay.style.display = "flex";
      promoOverlay.onclick = function() { if (promoPlayer) { if (promoPlayer.paused) promoPlayer.play(); else promoPlayer.pause(); } };
      const pb = promoOverlay.querySelector(".review-play-btn");
      if (pb) pb.onclick = function(e) { e.stopPropagation(); if (promoPlayer) { if (promoPlayer.paused) promoPlayer.play(); else promoPlayer.pause(); } };
    }
    if (promoPlayer) {
      promoPlayer.onplay = function() { if (promoOverlay) promoOverlay.style.display = "none"; };
      promoPlayer.onpause = function() { if (promoOverlay && !promoPlayer.ended) promoOverlay.style.display = "flex"; };
      promoPlayer.onended = function() { if (promoOverlay) { promoOverlay.style.display = "flex"; var i = promoOverlay.querySelector("i"); if (i) i.className = "fa-solid fa-rotate-right"; } };
      promoPlayer.onplaying = function() { if (promoOverlay) promoOverlay.style.display = "none"; };
    }
  }

  // Review: Trailer Video
  const trailerUrl = uploadedFiles.trailerVideoPreviewUrl;
  const trailerCard = document.getElementById("reviewTrailerVideoCard");
  const trailerPlaceholder = document.getElementById("reviewTrailerPlaceholder");
  const trailerWrap = document.getElementById("reviewTrailerWrap");
  const trailerPlayer = document.getElementById("reviewTrailerPlayer");
  const trailerOverlay = document.getElementById("reviewTrailerOverlay");
  if (trailerUrl && trailerCard) {
    if (trailerPlaceholder) trailerPlaceholder.style.display = "none";
    if (trailerWrap) trailerWrap.style.display = "";
    if (trailerPlayer) { trailerPlayer.src = trailerUrl; trailerPlayer.load(); }
    if (trailerOverlay) {
      trailerOverlay.style.display = "flex";
      trailerOverlay.onclick = function() { if (trailerPlayer) { if (trailerPlayer.paused) trailerPlayer.play(); else trailerPlayer.pause(); } };
      const pb = trailerOverlay.querySelector(".review-play-btn");
      if (pb) pb.onclick = function(e) { e.stopPropagation(); if (trailerPlayer) { if (trailerPlayer.paused) trailerPlayer.play(); else trailerPlayer.pause(); } };
    }
    if (trailerPlayer) {
      trailerPlayer.onplay = function() { if (trailerOverlay) trailerOverlay.style.display = "none"; };
      trailerPlayer.onpause = function() { if (trailerOverlay && !trailerPlayer.ended) trailerOverlay.style.display = "flex"; };
      trailerPlayer.onended = function() { if (trailerOverlay) { trailerOverlay.style.display = "flex"; var i = trailerOverlay.querySelector("i"); if (i) i.className = "fa-solid fa-rotate-right"; } };
      trailerPlayer.onplaying = function() { if (trailerOverlay) trailerOverlay.style.display = "none"; };
    }
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

  const countryVis = selectedCountries;
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
  const startTime = document.getElementById("startTime").value || "Not set";
  const endDate = getVal("endDate") || "Not set";
  const endTime = document.getElementById("endTime").value || "Not set";
  const tz = selectedTimezone || "Not selected";

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
      category: selectedCategory,
      tags,
      countryVisibility: selectedCountries,
      visibility: getSelectedRadio("visibility") || "public",
      ageGroup: getSelectedRadio("ageGroup") || "all",
      startDate: getVal("startDate"),
      startTime: document.getElementById("startTime").value,
      endDate: getVal("endDate"),
      endTime: document.getElementById("endTime").value,
      timezone: selectedTimezone,
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
  const loadingEl = document.getElementById("countryLoading");

  try {
    const res = await fetch(COUNTRIES_URL);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();

    if (!data.success || !Array.isArray(data.countries)) {
      throw new Error(data.message || "Invalid response");
    }

    countryData.length = 0;
    countryData.push(...data.countries);

    if (loadingEl) loadingEl.remove();

    const body = document.getElementById("countryModalBody");
    data.countries.forEach((c) => {
      const label = document.createElement("div");
      label.className = "picker-modal-option";
      label.dataset.value = c.name;

      const check = document.createElement("span");
      check.className = "picker-option-check";
      check.innerHTML = '<i class="fa-solid fa-check"></i>';

      const span = document.createElement("span");
      span.className = "picker-option-label";
      span.textContent = c.name;

      label.appendChild(check);
      label.appendChild(span);

      label.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!window._toggleCountry) return;
        window._toggleCountry(c.name, label);
      });

      body.appendChild(label);
    });

    if (typeof window._refreshCountryUI === "function") window._refreshCountryUI();

  } catch (err) {
    console.error("Load countries error:", err);

    if (loadingEl) {
      loadingEl.textContent = "Failed to load countries";
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
  initCategorySelector();
  initCountryPicker();
  initTimezonePicker();
  initTimePicker();
  loadCountries();
  goToStep(1);
});
