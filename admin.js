const API_URL = "https://ai-impact-server.vercel.app";

const form = document.getElementById("adminLoginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("errorMessage");
const loginBtn = document.querySelector(".login-btn");

function showMessage(message, type = "error") {
  errorMessage.textContent = message;
  errorMessage.style.color = type === "success" ? "#22e58f" : "#ff5f7a";
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;

  if (isLoading) {
    loginBtn.innerHTML = `Signing in... <span>⏳</span>`;
    loginBtn.style.opacity = "0.7";
    loginBtn.style.cursor = "not-allowed";
  } else {
    loginBtn.innerHTML = `Login To Admin Panel <span>→</span>`;
    loginBtn.style.opacity = "1";
    loginBtn.style.cursor = "pointer";
  }
}

function validateInputs(username, password) {
  if (!username || !password) {
    return "Username and password are required.";
  }

  if (username.length < 3) {
    return "Username is too short.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (/[<>{}"'`;]/.test(username)) {
    return "Username contains invalid characters.";
  }

  return null;
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  showMessage("");

  const validationError = validateInputs(username, password);

  if (validationError) {
    showMessage(validationError);
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/admin/signin`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      showMessage(data.message || "Admin login failed.");
      setLoading(false);
      return;
    }

    showMessage("Admin login successful. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);

  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    showMessage("Network error. Please check your connection.");
    setLoading(false);
  }
});