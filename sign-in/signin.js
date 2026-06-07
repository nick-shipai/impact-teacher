const API_BASE = "https://ai-impact-server.vercel.app";
const SIGNIN_API_URL = `${API_BASE}/api/teacher/signin`;
const VALIDATE_SESSION_URL = `${API_BASE}/api/auth/validate-session`;

const signinForm = document.getElementById("teacherSigninForm");
const formMessage = document.getElementById("formMessage");
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

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

            showMessage("Already signed in. Redirecting...", "success");

            setTimeout(() => {
                window.location.href = determineRedirect(data.user);
            }, 400);
        }
    } catch (err) {
    }
})();

function determineRedirect(user) {
    if (!user) return "../dashboard/set-up";

    const appStatus = String(user.applicationStatus || "").toLowerCase();
    const setupCompleted = user.setupCompleted === true;
    const accountVerified = user.teacherAccountStatus === true;

    // Case 4: Application rejected
    if (appStatus === "rejected") return "../dashboard/set-up?status=rejected";

    // Case 1: Setup completed + Account verified → Dashboard
    if (setupCompleted && accountVerified) return "../dashboard/";

    // Case 2: Setup completed + Not verified → Pending screen
    if (setupCompleted && !accountVerified) return "../dashboard/set-up?status=pending";

    // Case 3: Setup not completed → Continue onboarding
    return "../dashboard/set-up";
}

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

    setFieldError("emailError", "");
    setFieldError("passwordError", "");

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

function getFormData() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;
    return { email, password, rememberMe };
}

function validateForm({ email, password }) {
    let hasError = false;

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
    }

    return !hasError;
}

signinForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    const { email, password, rememberMe } = getFormData();

    const signinBtn = document.querySelector(".signin-btn");
    const originalBtnText = signinBtn.innerHTML;

    if (!validateForm({ email, password })) {
        showMessage("Please fix the errors below and try again.", "error");
        return;
    }

    try {
        signinBtn.disabled = true;
        signinBtn.innerHTML = "Signing In...";

        showMessage("Signing in, please wait...", "success");

        const response = await fetch(SIGNIN_API_URL, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, rememberMe })
        });

        let data = {};

        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error("Server returned an invalid response.");
        }

        if (!response.ok || !data.success) {
            if (response.status === 400) {
                throw new Error(data.message || "Invalid sign-in details.");
            }
            if (response.status === 401) {
                throw new Error(data.message || "Invalid email or password.");
            }
            if (response.status === 403) {
                if (data.code === "EMAIL_NOT_VERIFIED") {
                    throw new Error("Please verify your email before signing in. Check your inbox.");
                }
                if (data.code === "NOT_TEACHER") {
                    throw new Error("This account is not a teacher account.");
                }
                throw new Error(data.message || "Account not verified. Please check your email.");
            }
            if (response.status === 429) {
                throw new Error(data.message || "Too many attempts. Please try again later.");
            }
            if (response.status >= 500) {
                throw new Error(data.message || "Server error. Please try again later.");
            }
            throw new Error(data.message || "Sign in failed. Please try again.");
        }

        if (data.user) {
            localStorage.setItem("impactech_user", JSON.stringify(data.user));
        }

        showMessage("Sign in successful! Redirecting...", "success");

        const destination = data.redirectUrl || determineRedirect(data.user);

        setTimeout(() => {
            window.location.href = destination;
        }, 500);

    } catch (error) {
        console.error("Teacher signin error:", error);

        if (!navigator.onLine) {
            showMessage("You are offline. Please check your internet connection.", "error");
        } else if (error.name === "TypeError") {
            showMessage("Network or CORS error. Please check your server CORS settings.", "error");
        } else {
            showMessage(error.message || "Something went wrong. Please try again.", "error");
        }

    } finally {
        signinBtn.disabled = false;
        signinBtn.innerHTML = originalBtnText;
    }
});

/* SHOW / HIDE PASSWORD */
togglePasswordBtn.addEventListener("click", function () {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    this.innerHTML = isPassword
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';
    this.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
});
