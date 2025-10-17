// ---------------------------
// LOGIN / CADASTRO DINÂMICO
// ---------------------------
const loginContainer = document.getElementById("loginContainer");
const registerContainer = document.getElementById("registerContainer");
const goToRegister = document.getElementById("goToRegister");
const goToLogin = document.getElementById("goToLogin");

// Alternar telas
goToRegister.addEventListener("click", e => {
  e.preventDefault();
  loginContainer.classList.add("hidden");
  registerContainer.classList.remove("hidden");
});

goToLogin.addEventListener("click", e => {
  e.preventDefault();
  registerContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
});

// ---------------------------
// CADASTRO
// ---------------------------
async function registerUser() {
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const avatar = document.getElementById("reg-avatar").files[0];
  const color = document.getElementById("reg-color").value;

  if (!username || !password) {
    alert("Preencha todos os campos!");
    return;
  }

  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  formData.append("avatar", avatar);
  formData.append("color", color);

  const res = await fetch("/register", { method: "POST", body: formData });
  const text = await res.text();

  if (text === "OK") {
    alert("Cadastro realizado! Faça login agora.");
    goToLogin.click();
  } else {
    alert(text);
  }
}

// ---------------------------
// LOGIN
// ---------------------------
async function loginUser() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    const data = await res.json();
    localStorage.setItem("user", JSON.stringify({ username: data.username }));
    showChat(data.username);
  } else {
    const text = await res.text();
    alert(text);
  }
}

// Event listeners para os formulários
document.getElementById("registerForm").addEventListener("submit", e => {
  e.preventDefault();
  registerUser();
});

document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  loginUser();
});

// ---------------------------
// CHAT SOCKET.IO
// ---------------------------
const socket = io();
const msgSound = document.getElementById("msgSound");
const chatContainer = document.getElementById("chatContainer");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const userSpan = document.getElementById("currentUser");
const logoutBtn = document.getElementById("logout");
const editProfileBtn = document.getElementById("editProfile");

let currentAvatar = '/uploads/default.png';

// Mostra o chat após login
function showChat(username) {
  loginContainer.classList.add("hidden");
  registerContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  userSpan.textContent = username;

  // Buscar avatar do usuário
  fetch(`/user/${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
      currentAvatar = data.avatar || '/uploads/default.png';
    });
}

// Enviar mensagem
chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  const userData = JSON.parse(localStorage.getItem("user") || '{}');
  const username = userData.username;
  if (msg && username) {
    socket.emit("sendMessage", { user: username, text: msg, avatar: currentAvatar });
    messageInput.value = "";
  }
});

// Receber mensagens (apenas 1 listener, sem duplicação)
socket.on("receiveMessage", data => {
  const div = document.createElement("div");
  div.classList.add("message");

  const userData = JSON.parse(localStorage.getItem("user") || '{}');
  if (data.user === userData.username) div.classList.add("self");

  div.innerHTML = `
    <img src="${data.avatar || '/uploads/default.png'}" alt="avatar">
    <div class="message-content"><strong>${data.user}:</strong> ${data.text}</div>
  `;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Forçar reflow para reiniciar animação se necessário
  void div.offsetWidth;
  msgSound.play();
});

// ---------------------------
// LOGOUT
// ---------------------------
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("user");
  chatContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
});

// ---------------------------
// EDITAR PERFIL
// ---------------------------
editProfileBtn.addEventListener("click", () => {
  chatContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
});
