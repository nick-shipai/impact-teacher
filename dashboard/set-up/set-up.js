const BASE_URL = "https://backend.impactacademy.site";
const SETUP_API_URL = `${BASE_URL}/api/teacher/setup`;
const VALIDATE_SESSION_URL = `${BASE_URL}/api/auth/validate-session`;
const APP_STATUS_URL = "https://ai-impact-server.vercel.app/api/teacher/application-status";
const TEACHER_DASHBOARD_URL = "../";
const LS_KEY = "impactech_teacher_setup_draft";
const STATUS_KEY = "impactech_teacher_application_status";

const steps = document.querySelectorAll(".form-step");
const stepTitle = document.getElementById("stepTitle");
const stepDescription = document.getElementById("stepDescription");
const currentStepText = document.getElementById("currentStepText");
const totalStepText = document.getElementById("totalStepText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const teacherSetupForm = document.getElementById("teacherSetupForm");
const reviewGrid = document.getElementById("reviewGrid");
const redirectLoader = document.getElementById("redirectLoader");

const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");

const cvUpload = document.getElementById("cvUpload");
const cvFileName = document.getElementById("cvFileName");
const teachingCertUpload = document.getElementById("teachingCertUpload");
const teachingCertFileName = document.getElementById("teachingCertFileName");
const degreeUpload = document.getElementById("degreeUpload");
const degreeFileName = document.getElementById("degreeFileName");
const idCardUpload = document.getElementById("idCardUpload");
const idCardFileName = document.getElementById("idCardFileName");

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
   APPLICATION STATUS
========================= */

function saveStatusLocally(statusObj) {
    try {
        localStorage.setItem(STATUS_KEY, JSON.stringify(statusObj));
    } catch (e) {
    }
}

function getLocalStatus() {
    try {
        const raw = localStorage.getItem(STATUS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

async function getApplicationStatus() {
    const local = getLocalStatus();
    try {
        const response = await fetch(APP_STATUS_URL, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            if (response.status === 401 && local) {
                return local;
            }
            return local || { applicationStatus: "pending", setupCompleted: true };
        }
        saveStatusLocally(data);
        return data;
    } catch (error) {
        console.error("getApplicationStatus error:", error);
        return local || { applicationStatus: "pending", setupCompleted: true };
    }
}

/* =========================
   LOCAL STORAGE SAVE / RESTORE
========================= */

function getFormData() {
    const data = {
        dob: getValue('input[name="dob"]'),
        gender: getValue('select[name="gender"]'),
        nationality: getValue('input[name="nationality"]'),
        country: getValue('input[name="country"]'),
        city: getValue('input[name="city"]'),
        address: getValue('input[name="address"]'),
        phone: getValue('input[name="phone"]'),
        state: getValue('input[name="state"]'),
        postalCode: getValue('input[name="postalCode"]'),
        highestQualification: getValue('select[name="highestQualification"]'),
        majorSubject: getValue('input[name="majorSubject"]'),
        currentSchool: getValue('input[name="currentSchool"]'),
        graduationYear: getValue('input[name="graduationYear"]'),
        yearsOfExperience: getValue('input[name="yearsOfExperience"]'),
        teachingLevel: getValue('select[name="teachingLevel"]'),
        position: getValue('input[name="position"]'),
        bio: getValue('textarea[name="bio"]'),
        categories: getCheckedValues("categories"),
        currentStep: currentStep,
        fileName_cv: cvFileName.textContent,
        fileName_teachingCert: teachingCertFileName.textContent,
        fileName_degree: degreeFileName.textContent,
        fileName_idCard: idCardFileName.textContent,
        savedAt: Date.now()
    };
    return data;
}

function saveToLocalStorage() {
    try {
        const data = getFormData();
        localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
    }
}

function restoreFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function clearDraft() {
    try {
        localStorage.removeItem(LS_KEY);
    } catch (e) {
    }
}

function applyRestoredData(data) {
    if (!data) return;
    setValue('input[name="dob"]', data.dob || "");
    setValue('select[name="gender"]', data.gender || "");
    setValue('input[name="nationality"]', data.nationality || "");
    setValue('input[name="country"]', data.country || "");
    setValue('input[name="city"]', data.city || "");
    setValue('input[name="address"]', data.address || "");
    setValue('input[name="phone"]', data.phone || "");
    setValue('input[name="state"]', data.state || "");
    setValue('input[name="postalCode"]', data.postalCode || "");
    setValue('select[name="highestQualification"]', data.highestQualification || "");
    setValue('input[name="majorSubject"]', data.majorSubject || "");
    setValue('input[name="currentSchool"]', data.currentSchool || "");
    setValue('input[name="graduationYear"]', data.graduationYear || "");
    setValue('input[name="yearsOfExperience"]', data.yearsOfExperience || "");
    setValue('select[name="teachingLevel"]', data.teachingLevel || "");
    setValue('input[name="position"]', data.position || "");
    setValue('textarea[name="bio"]', data.bio || "");

    if (Array.isArray(data.categories)) {
        document.querySelectorAll('input[name="categories"]').forEach(cb => {
            cb.checked = data.categories.includes(cb.value);
        });
    }

    if (data.fileName_cv && data.fileName_cv !== "No file selected") {
        cvFileName.textContent = data.fileName_cv;
    }
    if (data.fileName_teachingCert && data.fileName_teachingCert !== "No file selected") {
        teachingCertFileName.textContent = data.fileName_teachingCert;
    }
    if (data.fileName_degree && data.fileName_degree !== "No file selected") {
        degreeFileName.textContent = data.fileName_degree;
    }
    if (data.fileName_idCard && data.fileName_idCard !== "No file selected") {
        idCardFileName.textContent = data.fileName_idCard;
    }

    if (typeof data.currentStep === "number" && data.currentStep >= 0 && data.currentStep < steps.length) {
        currentStep = data.currentStep;
    }
}

function setValue(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.value = value;
}

/* =========================
   AUTO-SAVE EVENT BINDING
========================= */

function bindAutoSave() {
    const form = document.getElementById("teacherSetupForm");
    if (!form) return;

    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach(input => {
        input.addEventListener("input", saveToLocalStorage);
        input.addEventListener("change", saveToLocalStorage);
    });

    document.querySelectorAll('input[name="categories"]').forEach(cb => {
        cb.addEventListener("change", saveToLocalStorage);
    });
}

/* =========================
   STATUS SCREENS
========================= */

function showStatusScreen(type, data) {
    const setupCard = document.querySelector(".setup-card");
    if (!setupCard) return;

    const form = document.getElementById("teacherSetupForm");
    if (form) form.style.display = "none";

    document.querySelector(".setup-header")?.remove();
    document.querySelector(".progress-wrap")?.remove();
    document.querySelector(".form-actions")?.remove();

    if (type === "pending") {
        setupCard.innerHTML = `
            <div class="status-screen">
                <div class="status-icon pending-icon">
                    <i class="fa-solid fa-hourglass-half"></i>
                </div>
                <span class="status-badge">APPLICATION SUBMITTED</span>
                <h2>Awaiting Approval</h2>
                <p class="status-desc">
                    Your teacher application has been submitted successfully. Our verification team is
                    currently reviewing your documents and credentials.
                </p>
                <div class="status-steps">
                    <div class="status-step">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <div>
                            <strong>Review in Progress</strong>
                            <span>Your profile and documents are being checked.</span>
                        </div>
                    </div>
                    <div class="status-step">
                        <i class="fa-solid fa-envelope"></i>
                        <div>
                            <strong>Notification via Email</strong>
                            <span>You will receive an email once your account is approved.</span>
                        </div>
                    </div>
                    <div class="status-step">
                        <i class="fa-solid fa-chalkboard-user"></i>
                        <div>
                            <strong>Start Teaching</strong>
                            <span>Once approved, you can access your teacher dashboard.</span>
                        </div>
                    </div>
                </div>
                <div class="status-pulse">
                    <div class="pulse-dot"></div>
                    <span>Your application is under review</span>
                </div>
            </div>
        `;
    } else if (type === "rejected") {
        const reason = data?.rejectionReason || "Your application did not meet the current requirements.";
        setupCard.innerHTML = `
            <div class="status-screen">
                <div class="status-icon rejected-icon">
                    <i class="fa-solid fa-circle-xmark"></i>
                </div>
                <span class="status-badge status-badge-rejected">APPLICATION NOT APPROVED</span>
                <h2>Application Status Update</h2>
                <p class="status-desc">
                    Thank you for your interest in teaching on Impact Academy. After careful review,
                    we are unable to approve your application at this time.
                </p>
                <div class="status-reason-box">
                    <i class="fa-solid fa-pen"></i>
                    <div>
                        <strong>Reason</strong>
                        <p>${escapeHtml(reason)}</p>
                    </div>
                </div>
                <p class="status-hint">
                    You may update your application and resubmit in the future. If you have questions,
                    please contact our support team.
                </p>
                <div class="status-actions">
                    <a href="mailto:support@impactacademy.site" class="status-btn secondary">
                        <i class="fa-solid fa-envelope"></i> Contact Support
                    </a>
                </div>
            </div>
        `;
    }
}

/* =========================
   PAGE START
========================= */

document.addEventListener("DOMContentLoaded", async function () {
    const auth = await AuthenticateUser();
    if (!auth.success) {
        window.location.href = "../../../signin/";
        return;
    }

    const user = auth.user;
    const userType = (user?.accountType || "").toLowerCase().trim();
    if (userType !== "teacher") {
        window.location.href = "/404.html";
        return;
    }

    /* ── Resolve status from auth user data ── */
    const setupCompleted = user?.setup?.completed === true || user?.setupCompleted === true;
    const teacherAccountStatus = user?.teacherAccountStatus;
    const rejectionReason = user?.rejectionReason || user?.teacherRejectionReason || "";
    let applicationStatus = user?.applicationStatus || "";

    if (!applicationStatus || applicationStatus === "none") {
        if (teacherAccountStatus === true) {
            applicationStatus = "approved";
        } else if (teacherAccountStatus === false && rejectionReason) {
            applicationStatus = "rejected";
        } else if (setupCompleted) {
            applicationStatus = "pending";
        }
    }

    /* ── Fallback to API if still unclear ── */
    if (!applicationStatus || applicationStatus === "none") {
        const statusData = await getApplicationStatus();
        if (statusData && statusData.applicationStatus) {
            applicationStatus = statusData.applicationStatus;
        }
    }

    /* ── PRIORITY 1: Rejected — always wins ── */
    if (applicationStatus === "rejected") {
        showStatusScreen("rejected", { rejectionReason });
        return;
    }

    /* ── PRIORITY 2: Approved → Dashboard ── */
    if (applicationStatus === "approved") {
        window.location.href = TEACHER_DASHBOARD_URL;
        return;
    }

    /* ── PRIORITY 3: Setup completed → Pending ── */
    if (setupCompleted) {
        showStatusScreen("pending", { applicationStatus: "pending" });
        return;
    }

    /* ── PRIORITY 4: Setup incomplete → Continue wizard ── */
    const draft = restoreFromLocalStorage();
    initTeacherSetupPage(user, draft);
    applyRestoredData(draft);
    bindAutoSave();
    updateStep();
});

function initTeacherSetupPage(user, draft) {
    const fullNameInput = document.querySelector('input[name="fullName"]');
    const emailInput = document.querySelector('input[name="email"]');

    if (fullNameInput) {
        fullNameInput.value = user.fullname || user.name || "";
        fullNameInput.readOnly = true;
    }
    if (emailInput) {
        emailInput.value = user.email || "";
        emailInput.readOnly = true;
    }
}

/* =========================
   STEP NAVIGATION
========================= */

let currentStep = 0;
totalStepText.textContent = steps.length;

function updateStep() {
    steps.forEach((step, index) => {
        step.classList.toggle("active", index === currentStep);
    });

    const activeStep = steps[currentStep];
    stepTitle.textContent = activeStep.dataset.title;
    stepDescription.textContent = activeStep.dataset.description;
    currentStepText.textContent = currentStep + 1;

    const percent = Math.round(((currentStep + 1) / steps.length) * 100);
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;

    backBtn.disabled = currentStep === 0;

    if (currentStep === steps.length - 1) {
        buildReview();
    }

    nextBtn.innerHTML =
        currentStep === steps.length - 1
            ? `Submit <i class="fa-solid fa-check"></i>`
            : `Next <i class="fa-solid fa-arrow-right"></i>`;
}

nextBtn.addEventListener("click", async () => {
    if (!validateCurrentStep()) return;

    if (currentStep < steps.length - 1) {
        currentStep++;
        updateStep();
        saveToLocalStorage();
        return;
    }

    await submitTeacherSetup();
});

backBtn.addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        updateStep();
        saveToLocalStorage();
    }
});

/* =========================
   FILE NAME DISPLAY
========================= */

function bindFileInput(input, displayEl) {
    if (!input || !displayEl) return;
    input.addEventListener("change", () => {
        displayEl.textContent =
            input.files.length > 0 ? input.files[0].name : "No file selected";
        saveToLocalStorage();
    });
}

bindFileInput(cvUpload, cvFileName);
bindFileInput(teachingCertUpload, teachingCertFileName);
bindFileInput(degreeUpload, degreeFileName);
bindFileInput(idCardUpload, idCardFileName);

/* =========================
   FORM DATA HELPERS
========================= */

function getValue(selector) {
    const el = document.querySelector(selector);
    return el ? el.value.trim() : "";
}

function getCheckedValues(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
        .map(input => input.value.trim())
        .filter(Boolean);
}

function getTeacherSetupPayload() {
    return {
        fullName: getValue('input[name="fullName"]'),
        dateOfBirth: getValue('input[name="dob"]'),
        gender: getValue('select[name="gender"]'),
        nationality: getValue('input[name="nationality"]'),
        country: getValue('input[name="country"]'),
        city: getValue('input[name="city"]'),
        address: getValue('input[name="address"]'),
        phone: getValue('input[name="phone"]'),
        email: getValue('input[name="email"]'),
        highestQualification: getValue('select[name="highestQualification"]'),
        majorSubject: getValue('input[name="majorSubject"]'),
        institution: getValue('input[name="currentSchool"]'),
        graduationYear: getValue('input[name="graduationYear"]'),
        teachingExperience: getValue('input[name="yearsOfExperience"]'),
        teachingLevel: getValue('select[name="teachingLevel"]'),
        position: getValue('input[name="position"]'),
        state: getValue('input[name="state"]'),
        postalCode: getValue('input[name="postalCode"]'),
        bio: getValue('textarea[name="bio"]'),
        categories: getCheckedValues("categories")
    };
}

/* =========================
   VALIDATION
========================= */

function clearValidationErrors() {
    document.querySelectorAll(".field-error").forEach((el) => el.remove());
    document.querySelectorAll(".input-error").forEach((el) => {
        el.classList.remove("input-error");
    });
    document.querySelectorAll(".step-error-box").forEach((el) => el.remove());
}

function showFieldError(selector, message) {
    const input = document.querySelector(selector);
    if (!input) return false;
    input.classList.add("input-error");
    const old = input.parentElement.querySelector(".field-error");
    if (old) old.remove();
    const error = document.createElement("div");
    error.className = "field-error";
    error.textContent = message;
    input.parentElement.appendChild(error);
    return true;
}

function validateCurrentStep() {
    clearValidationErrors();
    let valid = true;

    if (currentStep === 0) {
        if (!getValue('input[name="dob"]')) {
            showFieldError('input[name="dob"]', "Date of birth is required");
            valid = false;
        }
        if (!getValue('select[name="gender"]')) {
            showFieldError('select[name="gender"]', "Gender is required");
            valid = false;
        }
        if (!getValue('input[name="nationality"]')) {
            showFieldError('input[name="nationality"]', "Nationality is required");
            valid = false;
        }
        if (!getValue('input[name="country"]')) {
            showFieldError('input[name="country"]', "Country is required");
            valid = false;
        }
        if (!getValue('input[name="phone"]')) {
            showFieldError('input[name="phone"]', "Phone number is required");
            valid = false;
        }
        if (!getValue('input[name="address"]')) {
            showFieldError('input[name="address"]', "Address is required");
            valid = false;
        }
        if (!getValue('input[name="city"]')) {
            showFieldError('input[name="city"]', "City is required");
            valid = false;
        }
    }

    if (currentStep === 1) {
        if (!getValue('select[name="highestQualification"]')) {
            showFieldError('select[name="highestQualification"]', "Highest qualification is required");
            valid = false;
        }
        if (!getValue('input[name="majorSubject"]')) {
            showFieldError('input[name="majorSubject"]', "Major subject is required");
            valid = false;
        }
        if (!getValue('input[name="currentSchool"]')) {
            showFieldError('input[name="currentSchool"]', "Institution is required");
            valid = false;
        }
        if (!getValue('input[name="graduationYear"]')) {
            showFieldError('input[name="graduationYear"]', "Graduation year is required");
            valid = false;
        }
        if (!getValue('input[name="yearsOfExperience"]')) {
            showFieldError('input[name="yearsOfExperience"]', "Years of teaching experience is required");
            valid = false;
        }
    }

    if (currentStep === 2) {
        if (!getCheckedValues("categories").length) {
            const box = document.querySelector(".option-grid");
            if (box) {
                box.insertAdjacentHTML(
                    "afterend",
                    `<div class="field-error">Select at least one teaching category</div>`
                );
            }
            valid = false;
        }
    }

    if (currentStep === 3) {
        if (!cvUpload?.files?.length) {
            showFieldError('#cvUpload', "Upload your CV first");
            valid = false;
        }
    }

    return valid;
}

function validateFullPayload(data) {
    const errors = [];
    if (!data.fullName) errors.push("Full name is missing");
    if (!data.dateOfBirth) errors.push("Date of birth is missing");
    if (!data.gender) errors.push("Gender is missing");
    if (!data.nationality) errors.push("Nationality is missing");
    if (!data.country) errors.push("Country is missing");
    if (!data.city) errors.push("City is missing");
    if (!data.address) errors.push("Address is missing");
    if (!data.phone) errors.push("Phone number is missing");
    if (!data.email) errors.push("Email is missing");
    if (!data.highestQualification) errors.push("Highest qualification is missing");
    if (!data.majorSubject) errors.push("Major subject is missing");
    if (!data.institution) errors.push("Institution is missing");
    if (!data.graduationYear) errors.push("Graduation year is missing");
    if (!data.teachingExperience) errors.push("Teaching experience is missing");
    if (!Array.isArray(data.categories) || data.categories.length < 1) {
        errors.push("At least one teaching category is required");
    }
    if (!cvUpload?.files?.length) {
        errors.push("CV file is required");
    }
    return errors;
}

function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}

function showStepErrors(errors) {
    const activeStep = steps[currentStep];
    let oldBox = activeStep.querySelector(".step-error-box");
    if (oldBox) oldBox.remove();
    const box = document.createElement("div");
    box.className = "step-error-box";
    box.innerHTML = `
        <div class="step-error-head">
            <i class="fa-solid fa-circle-exclamation"></i>
            <div>
                <h3>Some details are missing</h3>
                <p>Please fix these before submitting your teacher profile.</p>
            </div>
        </div>
        <ul>
            ${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}
        </ul>
    `;
    activeStep.prepend(box);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================
   REVIEW SCREEN
========================= */

function buildReview() {
    const data = getTeacherSetupPayload();
    reviewGrid.innerHTML = `
        ${reviewSection("Personal Details", 0, [
            ["Full Name", data.fullName],
            ["Email", data.email],
            ["Date Of Birth", data.dateOfBirth],
            ["Gender", data.gender],
            ["Nationality", data.nationality],
            ["Country", data.country],
            ["Phone", data.phone],
            ["Address", data.address],
            ["City", data.city],
            ["State", data.state],
            ["Postal Code", data.postalCode]
        ])}
        ${reviewSection("Teaching Profile", 1, [
            ["Highest Qualification", data.highestQualification],
            ["Major Subject", data.majorSubject],
            ["Institution", data.institution],
            ["Graduation Year", data.graduationYear],
            ["Teaching Experience", data.teachingExperience + " years"],
            ["Teaching Level", data.teachingLevel],
            ["Position", data.position]
        ])}
        ${reviewSection("Bio", 1, [
            ["Short Bio", data.bio]
        ], true)}
        ${reviewSection("Teaching Categories", 2, [
            ["Categories", data.categories.join(", ")]
        ])}
        ${reviewSection("Documents", 3, [
            ["CV / Resume", cvUpload?.files?.[0]?.name || "No CV uploaded"],
            ["Teaching Certificate", teachingCertUpload?.files?.[0]?.name || "Not uploaded"],
            ["Degree Certificate", degreeUpload?.files?.[0]?.name || "Not uploaded"],
            ["Identity Card", idCardUpload?.files?.[0]?.name || "Not uploaded"]
        ])}
    `;
}

function reviewSection(title, step, items, full = false) {
    return `
        <div class="review-section">
            <div class="review-section-head">
                <h3>${title}</h3>
                <button type="button" class="review-edit" data-step="${step}">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="review-items">
                ${items.map(([label, value]) => `
                    <div class="review-item ${full ? "full" : ""}">
                        <small>${label}</small>
                        <strong>${escapeHtml(value || "Not added")}</strong>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

document.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".review-edit");
    if (!editBtn) return;
    const step = Number(editBtn.dataset.step || 0);
    if (step >= 0 && step < steps.length) {
        currentStep = step;
        updateStep();
        saveToLocalStorage();
    }
});

/* =========================
   SUBMIT SETUP
========================= */

async function submitTeacherSetup() {
    clearValidationErrors();
    const teacher = getTeacherSetupPayload();
    const errors = validateFullPayload(teacher);
    if (errors.length > 0) {
        showStepErrors(errors);
        return;
    }
    if (!isValidEmail(teacher.email)) {
        showStepErrors(["Please enter a valid email address."]);
        showFieldError('input[name="email"]', "Enter a valid email");
        return;
    }

    try {
        nextBtn.disabled = true;
        nextBtn.innerHTML = `Submitting... <i class="fa-solid fa-spinner fa-spin"></i>`;
        if (redirectLoader) redirectLoader.classList.add("active");

        const formData = new FormData();
        formData.append("teacher", JSON.stringify(teacher));
        if (cvUpload?.files?.length) formData.append("cv", cvUpload.files[0]);
        if (teachingCertUpload?.files?.length) formData.append("teachingCertificate", teachingCertUpload.files[0]);
        if (degreeUpload?.files?.length) formData.append("degree", degreeUpload.files[0]);
        if (idCardUpload?.files?.length) formData.append("idCard", idCardUpload.files[0]);

        const response = await fetch(SETUP_API_URL, {
            method: "POST",
            credentials: "include",
            body: formData
        });
        const data = await response.json().catch(() => ({}));
        console.log("SAVE TEACHER SETUP RESPONSE:", data);

        if (!response.ok || !data.success) {
            if (redirectLoader) redirectLoader.classList.remove("active");
            nextBtn.disabled = false;
            nextBtn.innerHTML = `Submit <i class="fa-solid fa-check"></i>`;
            const serverErrors = Array.isArray(data.errors)
                ? data.errors
                : [data.message || "Failed to save teacher setup"];
            showStepErrors(serverErrors);
            return;
        }

        clearDraft();
        saveStatusLocally({ applicationStatus: "pending", setupCompleted: true });
        if (redirectLoader) redirectLoader.classList.remove("active");
        window.location.href = TEACHER_DASHBOARD_URL;

    } catch (error) {
        console.error("Save teacher setup error:", error);
        if (redirectLoader) redirectLoader.classList.remove("active");
        nextBtn.disabled = false;
        nextBtn.innerHTML = `Submit <i class="fa-solid fa-check"></i>`;
        showStepErrors(["Network error. Please check your connection and try again."]);
    }
}

updateStep();
