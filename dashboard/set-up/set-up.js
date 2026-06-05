const BASE_URL = "https://backend.impactacademy.site";
const API_URL = `${BASE_URL}/api/teacher/setup`;
const VALIDATE_SESSION_URL = `${BASE_URL}/api/auth/validate-session`;

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
            headers: {
                "Content-Type": "application/json"
            }
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
   PAGE START
========================= */

document.addEventListener("DOMContentLoaded", async function () {
    const auth = await AuthenticateUser();

    if (!auth.success) {
        window.location.href = "../../../signin/";
        return;
    }

    console.log("Authenticated user:", auth.user);

    const userType = (auth.user?.accountType || "").toLowerCase().trim();
    if (userType !== "teacher") {
        window.location.href = "/404.html";
        return;
    }

    if (auth.user?.setup?.completed) {
        window.location.href = "../teacher";
        return;
    }

    initTeacherSetupPage(auth.user);
});

function initTeacherSetupPage(user) {
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
        return;
    }

    await submitTeacherSetup();
});

backBtn.addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        updateStep();
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

        if (redirectLoader) {
            redirectLoader.classList.add("active");
        }

        const formData = new FormData();
        formData.append("teacher", JSON.stringify(teacher));

        if (cvUpload?.files?.length) {
            formData.append("cv", cvUpload.files[0]);
        }
        if (teachingCertUpload?.files?.length) {
            formData.append("teachingCertificate", teachingCertUpload.files[0]);
        }
        if (degreeUpload?.files?.length) {
            formData.append("degree", degreeUpload.files[0]);
        }
        if (idCardUpload?.files?.length) {
            formData.append("idCard", idCardUpload.files[0]);
        }

        const response = await fetch(API_URL, {
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

        window.location.href = data.redirectUrl || "../teacher";

    } catch (error) {
        console.error("Save teacher setup error:", error);

        if (redirectLoader) redirectLoader.classList.remove("active");

        nextBtn.disabled = false;
        nextBtn.innerHTML = `Submit <i class="fa-solid fa-check"></i>`;

        showStepErrors(["Network error. Please check your connection and try again."]);
    }
}

/* =========================
   INIT
========================= */

updateStep();
