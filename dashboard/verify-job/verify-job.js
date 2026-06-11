const API_URL = "https://ai-impact-server.vercel.app";

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
            console.log("Admin validated:", data.admin);
        }

        return { success: true, admin: data.admin };

    } catch (error) {
        console.error("ValidateAdmin error:", error);
        localStorage.removeItem("impact_admin");
        window.location.href = "https://nx7-vault-core.impactacademy.site";
        return { success: false, admin: null };
    }
}

function getJobIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("jobId");
}

async function LoadJobDetails() {
    const jobId = getJobIdFromURL();

    if (!jobId) {
        showJobError("No job ID found in URL");
        return;
    }

    try {
        setJobLoading();

        const response = await fetch(`${API_URL}/api/admin/job/${encodeURIComponent(jobId)}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            showJobError(data.message || "Failed to load job");
            return;
        }

        renderJobDetails(data.job);

    } catch (error) {
        console.error("LoadJobDetails error:", error);
        showJobError("Server error while loading job");
    }
}

function setJobLoading() {
    setText("jobTitle", "Loading job title...");
    setText("jobCategory", "Loading category...");
    setText("jobBudget", "Loading budget...");
    setText("jobDescription", "Loading job description...");
    setText("jobReviewStatus", "Loading...");
}

function renderJobDetails(job) {
    setText("jobTitle", job.title || "Untitled Job");
    setText("jobIdText", `Job ID: ${job.jobId || "Unknown"}`);
    setText("jobCategory", job.category || "No category");
    setText("jobType", job.jobType || "Not provided");
    setText("jobBudget", `${job.currency || "USD"} ${Number(job.budgetAmount || 0).toLocaleString()}`);
    setText("jobBudgetType", job.budgetType || "Not provided");
    setText("jobTimeline", job.timeline || "Not provided");
    setText("jobPaymentStatus", job.paymentStatus || "Not provided");
    setText("jobExperience", job.experienceLevel || "Not provided");
    setText("jobLocation", job.locationPreference || "Not provided");
    setText("jobCommunication", job.communication || "Not provided");
    setText("jobPostedAt", formatDate(job.postedAt));
    setText("jobDescription", job.description || "No description provided");
    setText("jobDeliverables", job.deliverables || "No deliverables provided");

    const status = document.getElementById("jobReviewStatus");
    if (status) {
        status.textContent = job.reviewStatus || "Pending Review";
        status.className = "status-badge";
    }

    const skillsBox = document.getElementById("jobSkills");
    const skills = Array.isArray(job.skills) ? job.skills : [];

    if (skillsBox) {
        skillsBox.innerHTML = skills.length
            ? skills.map(skill => `<span>${escapeHTML(skill)}</span>`).join("")
            : `<span>No skills added</span>`;
    }
}

function showJobError(message) {
    setText("jobTitle", "Unable to load job");
    setText("jobCategory", "Error");
    setText("jobBudget", "$0.00");
    setText("jobDescription", message);

    const status = document.getElementById("jobReviewStatus");
    if (status) {
        status.textContent = "Load Failed";
        status.className = "status-badge danger";
    }

    const skillsBox = document.getElementById("jobSkills");
    if (skillsBox) {
        skillsBox.innerHTML = `<span>No skills loaded</span>`;
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
async function ReviewJobWithAI() {
    const jobId = getJobIdFromURL();
    const btn = document.getElementById("verifyAiBtn");
    const resultBox = document.getElementById("aiReviewResult");

    if (!jobId) {
        renderAIReviewError("No job ID found in URL");
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                Reviewing...
                <i class="fa-solid fa-spinner fa-spin"></i>
            `;
        }

        if (resultBox) {
            resultBox.innerHTML = `
                <div class="ai-loading-review">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h4>AI is reviewing this job...</h4>
                    <p>Please wait while Impactech AI checks the job details.</p>
                </div>
            `;
        }

        const response = await fetch(`${API_URL}/api/admin/review-job-ai/${encodeURIComponent(jobId)}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            renderAIReviewError(data.message || "AI review failed");
            return;
        }

        renderAIReviewResult(data.review);

    } catch (error) {
        console.error("ReviewJobWithAI error:", error);
        renderAIReviewError("Server error while running AI review");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                Verify Using AI
            `;
        }
    }
}

function renderAIReviewResult(review = {}) {
    const resultBox = document.getElementById("aiReviewResult");
    if (!resultBox) return;

    const status = String(review.reviewStatus || "needs_manual_review").toLowerCase();
    const score = Number(review.score || 0);
    const isLowScore = score < 50;

    const decisionClass = isLowScore ? "danger-review" : "safe-review";
    const mainMessage = isLowScore
        ? "AI strongly suggests this job should be rejected."
        : "AI suggests this job may be safe to approve.";

    resultBox.innerHTML = `
        <div class="ai-result-card ${escapeHTML(status)} ${decisionClass}">
            <div class="ai-score-banner">
                <div>
                    <span>AI Review Result</span>
                    <h4>${escapeHTML(status.replaceAll("_", " "))}</h4>
                    <p>${escapeHTML(mainMessage)}</p>
                </div>

                <strong class="${isLowScore ? "score-bad" : "score-good"}">
                    ${score}/100
                </strong>
            </div>

            <p class="ai-summary">${escapeHTML(review.summary || "No summary returned.")}</p>

            <div class="ai-mini-grid">
                <div>
                    <small>Risk Level</small>
                    <b>${escapeHTML(review.riskLevel || "unknown")}</b>
                </div>

                <div>
                    <small>Human Action</small>
                    <b>${escapeHTML(review.humanAction || "manual_review")}</b>
                </div>
            </div>

            ${renderAIList("Good Points", review.goodPoints, "good")}
            ${renderAIList("Bad Reasons", review.badReasons, "bad")}
            ${renderAIList("Missing Fields", review.missingFields, "warn")}
            ${renderAIList("Warnings", review.warnings, "warn")}

            <div class="ai-admin-note">
                <small>Admin Note</small>
                <p>${escapeHTML(review.adminNote || "No admin note returned.")}</p>
            </div>

            ${renderHumanDecisionButtons(score)}
        </div>
    `;
}

function renderHumanDecisionButtons(score) {
    const isLowScore = Number(score || 0) < 50;

    return `
        <div class="human-decision-box ${isLowScore ? "low-score" : "good-score"}">
            <div class="decision-warning">
                <i class="fa-solid ${isLowScore ? "fa-triangle-exclamation" : "fa-circle-check"}"></i>
                <div>
                    <h4>${isLowScore ? "Low AI score detected" : "Good AI score detected"}</h4>
                    <p>
                        ${isLowScore
            ? "This job looks risky. Reject is recommended, but admin can still manually approve."
            : "This job looks acceptable. Approve is recommended, but admin can still reject."
        }
                    </p>
                </div>
            </div>

            <div class="decision-actions">
                <button class="reject-job-btn" onclick="HandleHumanJobDecision('reject')">
                    <i class="fa-solid fa-xmark"></i>
                    Reject Job
                </button>

                <button class="approve-job-btn" onclick="HandleHumanJobDecision('approve')">
                    <i class="fa-solid fa-check"></i>
                    Approve Job
                </button>
            </div>
        </div>
    `;
}

async function HandleHumanJobDecision(action) {
    const jobId = getJobIdFromURL();

    if (!jobId) {
        ShowDecisionModal("error", "Missing Job ID", "No job ID was found in the URL.");
        return;
    }

    const currentStatus = document.getElementById("jobReviewStatus")?.textContent
        ?.toLowerCase()
        ?.trim();

    if (
        currentStatus === "approved" ||
        currentStatus === "rejected" ||
        currentStatus === "ai_approved" ||
        currentStatus === "ai_rejected"
    ) {
        ShowDecisionModal(
            currentStatus.includes("approve") ? "approved" : "rejected",
            `Job Already ${currentStatus.includes("approve") ? "Approved" : "Rejected"}`,
            `This job has already been ${currentStatus.replaceAll("_", " ")}. You cannot make another decision on it.`
        );
        return;
    }

    const rejectBtn = document.querySelector(".reject-job-btn");
    const approveBtn = document.querySelector(".approve-job-btn");
    const resultBox = document.getElementById("aiReviewResult");

    const isApprove = action === "approve";

    try {
        if (rejectBtn) rejectBtn.disabled = true;
        if (approveBtn) approveBtn.disabled = true;

        if (isApprove && approveBtn) {
            approveBtn.innerHTML = `Approving... <i class="fa-solid fa-spinner fa-spin"></i>`;
        }

        if (!isApprove && rejectBtn) {
            rejectBtn.innerHTML = `Rejecting... <i class="fa-solid fa-spinner fa-spin"></i>`;
        }

        const response = await fetch(`${API_URL}/api/admin/check-and-give-decision/${encodeURIComponent(jobId)}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            const msg = String(data.message || "").toLowerCase();

            if (msg.includes("already approved") || msg.includes("already rejected") || msg.includes("already")) {
                ShowDecisionModal("warning", "Job Already Decided", data.message);
                return;
            }

            throw new Error(data.message || "Failed to update job decision");
        }

        const finalDecision = data.decision || (isApprove ? "approved" : "rejected");

        ShowDecisionModal(
            finalDecision === "approved" ? "approved" : "rejected",
            finalDecision === "approved" ? "Job Approved Successfully" : "Job Rejected Successfully",
            data.message || "Job decision completed."
        );

        if (resultBox) {
            resultBox.insertAdjacentHTML("beforeend", `
                <div class="final-decision-card ${escapeHTML(finalDecision)}">
                    <i class="fa-solid ${finalDecision === "approved" ? "fa-circle-check" : "fa-circle-xmark"}"></i>
                    <div>
                        <h4>${escapeHTML(finalDecision)}</h4>
                        <p>${escapeHTML(data.message || "Job decision completed.")}</p>
                    </div>
                </div>
            `);
        }

        await LoadJobDetails();

    } catch (error) {
        console.error("HandleHumanJobDecision error:", error);
        ShowDecisionModal("error", "Decision Failed", error.message || "Failed to update job decision.");
    } finally {
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Reject Job`;
        }

        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Approve Job`;
        }
    }
}

function ShowDecisionModal(type, title, message) {
    const modal = document.getElementById("decisionModal");
    const icon = document.getElementById("decisionModalIcon");
    const titleEl = document.getElementById("decisionModalTitle");
    const textEl = document.getElementById("decisionModalText");
    const tagEl = document.getElementById("decisionModalTag");

    if (!modal) return;

    modal.className = `decision-modal show ${type}`;

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = message;
    if (tagEl) tagEl.textContent = type === "approved" ? "ALREADY APPROVED" : type === "rejected" ? "ALREADY REJECTED" : "JOB DECISION";

    if (icon) {
        icon.innerHTML =
            type === "approved"
                ? `<i class="fa-solid fa-circle-check"></i>`
                : type === "rejected"
                    ? `<i class="fa-solid fa-circle-xmark"></i>`
                    : type === "warning"
                        ? `<i class="fa-solid fa-triangle-exclamation"></i>`
                        : `<i class="fa-solid fa-circle-exclamation"></i>`;
    }
}

function CloseDecisionModal() {
    const modal = document.getElementById("decisionModal");
    if (modal) modal.className = "decision-modal";
}

function renderAIList(title, items, type) {
    const list = Array.isArray(items) ? items : [];

    if (!list.length) return "";

    return `
        <div class="ai-list ${type}">
            <h5>${escapeHTML(title)}</h5>
            ${list.map(item => `
                <p>
                    <i class="fa-solid fa-circle"></i>
                    ${escapeHTML(item)}
                </p>
            `).join("")}
        </div>
    `;
}

function renderAIReviewError(message) {
    const resultBox = document.getElementById("aiReviewResult");
    if (!resultBox) return;

    resultBox.innerHTML = `
        <div class="ai-result-card bad">
            <div class="ai-result-head">
                <div>
                    <span>AI Review Failed</span>
                    <h4>Error</h4>
                </div>
                <strong>!</strong>
            </div>

            <p class="ai-summary">${escapeHTML(message)}</p>
        </div>
    `;
}

function setupAIReviewButton() {
    const btn = document.getElementById("verifyAiBtn");
    if (!btn) return;

    btn.addEventListener("click", ReviewJobWithAI);
}
document.addEventListener("DOMContentLoaded", async () => {
    const auth = await ValidateAdmin();
    if (!auth.success) return;

    setupAIReviewButton();
    await LoadJobDetails();
});