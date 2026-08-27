const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const submitButton = document.querySelector(".login-submit");

async function checkExistingSession() {
  try {
    const response = await fetch("/api/session");
    const data = await response.json();
    if (data.authenticated) {
      window.location.replace("/admin.html");
    }
  } catch {
    loginError.textContent = "请通过线上服务访问登录页。";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "登录中";

  const formData = new FormData(loginForm);

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "账号或密码错误");
    }

    window.location.replace("/admin.html");
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "登录控制台";
  }
});

checkExistingSession();
