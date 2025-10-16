const socket = io();
const msgSound = document.getElementById("msgSound");
const chatContainer = document.getElementById("chatContainer");
const loginContainer = document.getElementById("loginContainer");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const userSpan = document.getElementById("currentUser");

const logoutBtn = document.getElementById("logout");
const editProfileBtn = document.getElementById("editProfile");

let currentAvatar = '/uploads/default.png';

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("user");

if (username) {
  loginContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  userSpan.textContent = username;

  // Buscar avatar e cor do usuário
  fetch(`/user/${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
      currentAvatar = data.avatar || '/uploads/default.png';
    });
}

chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg) {
    socket.emit("sendMessage", { 
      user: username, 
      text: msg, 
      avatar: currentAvatar 
    });
    messageInput.value = "";
  }
});

socket.on("receiveMessage", data => {
  const div = document.createElement("div");
  div.classList.add("message");
  if (data.user === username) div.classList.add("self");

  div.innerHTML = `
    <img src="${data.avatar || '/uploads/default.png'}" alt="avatar">
    <div class="message-content"><strong>${data.user}:</strong> ${data.text}</div>
  `;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  msgSound.play();
});

// Botão sair
logoutBtn?.addEventListener("click", () => {
  window.location.href = "/";
});

// Botão editar perfil
editProfileBtn?.addEventListener("click", () => {
  loginContainer.classList.remove("hidden");
  chatContainer.classList.add("hidden");

  const colorInput = document.querySelector('input[name="color"]');
  if (colorInput) colorInput.value = '#007bff';
});
