const tokenKey = "task-api-access-token";
const els = {
  form: document.getElementById("auth-form"),
  email: document.getElementById("auth-email"),
  password: document.getElementById("auth-password"),
  loginTab: document.getElementById("login-tab"),
  signupTab: document.getElementById("signup-tab"),
  submit: document.getElementById("submit-btn"),
  title: document.getElementById("form-title"),
  copy: document.getElementById("form-copy"),
  message: document.getElementById("auth-message"),
  togglePassword: document.getElementById("toggle-password"),
};

let mode = "login";

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function showMessage(message, type = "") {
  els.message.textContent = message;
  els.message.className = `auth-message ${type}`.trim();
}

function friendlyError(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("invalid login credentials")) return "That email and password do not match. Please try again.";
  if (text.includes("email rate limit")) return "Too many account attempts were made. Please wait a little while and try again.";
  if (text.includes("already registered")) return "An account with this email already exists. Try signing in instead.";
  if (text.includes("password") && (text.includes("short") || text.includes("least"))) return "Please choose a password with at least 6 characters.";
  if (text.includes("email") && text.includes("valid")) return "Please enter a valid email address.";
  return "Something went wrong. Please check your details and try again.";
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  els.loginTab.classList.toggle("active", !signingUp);
  els.signupTab.classList.toggle("active", signingUp);
  els.loginTab.setAttribute("aria-selected", String(!signingUp));
  els.signupTab.setAttribute("aria-selected", String(signingUp));
  els.title.textContent = signingUp ? "Let’s get you started." : "Welcome back.";
  els.copy.textContent = signingUp
    ? "Create an account to keep your tasks together."
    : "Sign in to continue to your task list.";
  els.submit.querySelector("span").textContent = signingUp ? "CREATE MY ACCOUNT" : "OPEN MY TASKS";
  els.password.autocomplete = signingUp ? "new-password" : "current-password";
  showMessage("");
}

async function submitAuth(event) {
  event.preventDefault();
  const email = els.email.value.trim();
  const password = els.password.value;
  if (!email || !password) return showMessage("Enter both your email and password.", "error");

  els.submit.disabled = true;
  els.submit.querySelector("span").textContent = mode === "signup" ? "CREATING…" : "SIGNING IN…";
  showMessage("");

  try {
    if (mode === "signup") {
      const user = await request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setMode("login");
      els.email.value = user.email || email;
      els.password.value = "";
      showMessage("Your account is ready. Sign in to open your tasks.", "success");
    } else {
      const session = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem(tokenKey, session.access_token);
      showMessage("You’re in! Opening your tasks…", "success");
      window.setTimeout(() => window.location.replace("/app"), 450);
    }
  } catch (error) {
    showMessage(friendlyError(error.message), "error");
  } finally {
    els.submit.disabled = false;
    els.submit.querySelector("span").textContent = mode === "signup" ? "CREATE MY ACCOUNT" : "OPEN MY TASKS";
  }
}

els.loginTab.addEventListener("click", () => setMode("login"));
els.signupTab.addEventListener("click", () => setMode("signup"));
els.form.addEventListener("submit", submitAuth);
els.togglePassword.addEventListener("click", () => {
  const showing = els.password.type === "text";
  els.password.type = showing ? "password" : "text";
  els.togglePassword.textContent = showing ? "SHOW" : "HIDE";
});

const existingToken = sessionStorage.getItem(tokenKey);
if (existingToken) {
  fetch("/protected/profile", { headers: { Authorization: `Bearer ${existingToken}` } })
    .then((response) => {
      if (response.ok) window.location.replace("/app");
      else sessionStorage.removeItem(tokenKey);
    })
    .catch(() => sessionStorage.removeItem(tokenKey));
}
