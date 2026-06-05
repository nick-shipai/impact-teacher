const BASE_URL = "https://backend.impactacademy.site";
const API_URL = `${BASE_URL}/api/teacher-signup`;
const VALIDATE_SESSION_URL = `${BASE_URL}/api/auth/validate-session`;

const signupForm = document.getElementById("teacherSignupForm");
const formMessage = document.getElementById("formMessage");

const ROLE_DASHBOARD = {
    teacher:    "../dashboard/teacher",
    freelancer: "../dashboard/freelancer",
    client:     "../dashboard/iam-client",
    student:    "../dashboard/student"
};

function getDashboardForRole(role) {
    if (!role) return "../dashboard/va-student";
    const key = String(role).toLowerCase();
    return ROLE_DASHBOARD[key] || "../dashboard/va-student";
}

(async function checkExistingSession() {
    try {
        const res = await fetch(VALIDATE_SESSION_URL, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) return;

        const data = await res.json().catch(() => ({}));

        if (!data.success || !data.user) return;

        const accountType = String(data.user.accountType || "").toLowerCase();

        if (accountType === "teacher") {
            localStorage.setItem("impactech_user", JSON.stringify(data.user));

            const destination = data.redirectUrl || getDashboardForRole("teacher");

            showMessage("Already signed in. Redirecting...", "success");

            setTimeout(() => {
                window.location.href = destination;
            }, 400);
        }
    } catch (err) {
    }
})();

function showMessage(message, type = "error") {
    formMessage.style.display = "block";
    formMessage.textContent = message;

    formMessage.className = "form-message";

    if (type === "success") {
        formMessage.classList.add("success-message");
    } else {
        formMessage.classList.add("error-message");
    }
}

function hideMessage() {
    formMessage.style.display = "none";
    formMessage.textContent = "";
}

function setFieldError(id, message) {
    const errorEl = document.getElementById(id);
    if (errorEl) errorEl.textContent = message;
}

function clearErrors() {
    hideMessage();

    setFieldError("fullnameError", "");
    setFieldError("emailError", "");
    setFieldError("passwordError", "");
    setFieldError("confirmPasswordError", "");
    setFieldError("termsError", "");

    document.querySelectorAll(".input-box").forEach((box) => {
        box.classList.remove("error");
    });
}

function setInputError(inputId) {
    const input = document.getElementById(inputId);
    const box = input?.closest(".input-box");

    if (box) {
        box.classList.add("error");
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const termsAccepted = document.getElementById("termsAccepted").checked;

    const signupBtn = document.querySelector(".signup-btn");
    const originalBtnText = signupBtn.innerHTML;

    let hasError = false;

    if (!fullname) {
        setFieldError("fullnameError", "Full name is required.");
        setInputError("fullname");
        hasError = true;
    }

    if (!email) {
        setFieldError("emailError", "Email address is required.");
        setInputError("email");
        hasError = true;
    } else if (!isValidEmail(email)) {
        setFieldError("emailError", "Please enter a valid email address.");
        setInputError("email");
        hasError = true;
    }

    if (!password) {
        setFieldError("passwordError", "Password is required.");
        setInputError("password");
        hasError = true;
    } else if (password.length < 6) {
        setFieldError("passwordError", "Password must be at least 6 characters.");
        setInputError("password");
        hasError = true;
    }

    if (!confirmPassword) {
        setFieldError("confirmPasswordError", "Please confirm your password.");
        setInputError("confirmPassword");
        hasError = true;
    } else if (password !== confirmPassword) {
        setFieldError("confirmPasswordError", "Passwords do not match.");
        setInputError("confirmPassword");
        hasError = true;
    }

    if (!termsAccepted) {
        setFieldError("termsError", "You must accept the terms and privacy policy.");
        hasError = true;
    }

    if (hasError) {
        showMessage("Please fix the errors below and try again.", "error");
        return;
    }

    const nameParts = fullname.split(" ");
    const firstname = nameParts[0] || "";
    const lastname = nameParts.slice(1).join(" ") || "";

    const signupData = {
        fullname,
        firstname,
        lastname,
        email,
        password,
        confirmPassword,
        termsAccepted,
        url: window.location.origin,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString()
    };

    try {
        signupBtn.disabled = true;
        signupBtn.innerHTML = "Creating Account...";

        showMessage("Creating your teacher account, please wait...", "success");

        const response = await fetch(API_URL, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(signupData)
        });

        let data = {};

        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error("Server returned an invalid response.");
        }

        if (!response.ok || !data.success) {
            if (response.status === 400) {
                throw new Error(data.message || "Invalid signup details.");
            }

            if (response.status === 401) {
                throw new Error(data.message || "Unauthorized request.");
            }

            if (response.status === 403) {
                throw new Error(data.message || "This website origin is not allowed.");
            }

            if (response.status === 409) {
                throw new Error(data.message || "An account with this email already exists.");
            }

            if (response.status === 429) {
                throw new Error(data.message || "Too many attempts. Please try again later.");
            }

            if (response.status >= 500) {
                throw new Error(data.message || "Server error. Please try again later.");
            }

            throw new Error(data.message || "Signup failed. Please try again.");
        }

        if (data.user) {
            localStorage.setItem("impactech_user", JSON.stringify(data.user));
        }

        if (data.token) {
            localStorage.setItem("impactech_token", data.token);
        }

        showVerifyModal(email);
        signupForm.reset();
        hideMessage();

    } catch (error) {
        console.error("Teacher signup error:", error);

        if (!navigator.onLine) {
            showMessage("You are offline. Please check your internet connection.", "error");
        } else if (error.name === "TypeError") {
            showMessage("Network or CORS error. Please check your server CORS settings.", "error");
        } else {
            showMessage(error.message || "Something went wrong. Please try again.", "error");
        }

    } finally {
        signupBtn.disabled = false;
        signupBtn.innerHTML = originalBtnText;
    }
});

function showVerifyModal(email) {
    const verifyModal = document.getElementById("verifyModal");
    const verifyEmailText = document.getElementById("verifyEmailText");

    if (verifyEmailText) {
        verifyEmailText.textContent = email;
    }

    if (verifyModal) {
        verifyModal.classList.add("active");
    }
}

const closeVerifyModal = document.getElementById("closeVerifyModal");

if (closeVerifyModal) {
    closeVerifyModal.addEventListener("click", function () {
        const verifyModal = document.getElementById("verifyModal");

        if (verifyModal) {
            verifyModal.classList.remove("active");
        }

        window.location.href = "./signin";
    });
}
