const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PORT = 8080;

// ---------------------------
// BANCO DE DADOS
// ---------------------------
const db = new sqlite3.Database('./chat.db', err => {
  if (err) console.error('❌ Erro ao abrir o banco:', err);
  else console.log('✅ Banco de dados aberto com sucesso.');
});

// Tabela de usuários
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  color TEXT,
  avatar TEXT
)`, err => {
  if (err) console.error('❌ Erro ao criar tabela:', err);
  else console.log('✅ Tabela users pronta.');
});

// ---------------------------
// MIDDLEWARES
// ---------------------------
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(__dirname, 'uploads');

app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ---------------------------
// MULTER PARA AVATAR
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas PNG, JPG, JPEG ou GIF são permitidos.'));
  }
});

// ---------------------------
// ROTAS DE CADASTRO E LOGIN
// ---------------------------
app.post('/register', upload.single('avatar'), (req, res) => {
  const { username, password, color } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.png';

  if (!username || !password) return res.status(400).send('Usuário e senha obrigatórios');

  const stmt = db.prepare(`INSERT INTO users (username, password, color, avatar) VALUES (?, ?, ?, ?)`);
  stmt.run(username, password, color, avatar, function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).send('Usuário já existe.');
      return res.status(500).send('Erro ao cadastrar usuário.');
    }
    console.log(`✅ Usuário cadastrado: ${username}`);
    res.send('OK');
  });
  stmt.finalize();
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) return res.status(500).send('Erro no login');
    if (!row) return res.status(401).send('Usuário ou senha incorretos');

    console.log(`🔓 Usuário logado: ${username}`);
    res.json({ success: true, username: row.username });
  });
});

app.get('/user/:username', (req, res) => {
  const username = req.params.username;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err || !row) return res.json({ avatar: '/uploads/default.png', color: '#007BFF' });
    res.json({ avatar: row.avatar || '/uploads/default.png', color: row.color || '#007BFF' });
  });
});

app.use('/uploads', express.static(uploadDir));

// ---------------------------
// SOCKET.IO COM LOGS
// ---------------------------
io.on('connection', socket => {
  console.log(`🟢 Novo cliente conectado: ${socket.id}`);

  socket.on('sendMessage', data => {
    console.log(`💬 Mensagem de ${data.user}: ${data.text}`);
    io.emit('receiveMessage', data); // retransmitir para todos
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Cliente desconectado: ${socket.id}`);
  });
});

// ---------------------------
// INICIAR SERVIDOR
// ---------------------------
http.listen(PORT, () => {
  console.log(`💬 Servidor rodando em http://localhost:${PORT}`);
}).on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`❌ Porta ${PORT} já está em uso.`);
  else console.error(err);
});
