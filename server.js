const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const PORT = 8080;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Pasta de uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PNG, JPG, JPEG ou GIF são permitidos.'));
    }
  }
});

// Cadastro
app.post('/register', upload.single('avatar'), (req, res) => {
  console.log('Arquivo enviado:', req.file); // DEBUG
  const { username, password, color } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.png';

  if (!username || !password) return res.status(400).send('Usuário e senha obrigatórios');

  const userLine = `${username};${password};${color};${avatar}\n`;
  fs.appendFileSync('users.txt', userLine);
  res.redirect('/');
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!fs.existsSync('users.txt')) return res.status(401).send('Sem usuários cadastrados.');

  const users = fs.readFileSync('users.txt', 'utf8').split('\n');
  const user = users.find(line => {
    const [u, p] = line.split(';');
    return u === username && p === password;
  });

  if (user) res.redirect(`/?user=${encodeURIComponent(username)}`);
  else res.status(401).send('Usuário ou senha incorretos.');
});

// Retornar dados do usuário
app.get('/user/:username', (req, res) => {
  const username = req.params.username;
  if (!fs.existsSync('users.txt')) return res.json({ avatar: '/uploads/default.png', color: '#007BFF' });

  const users = fs.readFileSync('users.txt', 'utf8').split('\n');
  const user = users.find(line => line.startsWith(username + ';'));

  if (user) {
    const [, , color, avatar] = user.split(';');
    res.json({ avatar: avatar || '/uploads/default.png', color });
  } else {
    res.json({ avatar: '/uploads/default.png', color: '#007BFF' });
  }
});

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// WebSocket
io.on('connection', socket => {
  socket.on('sendMessage', data => {
    io.emit('receiveMessage', data);
  });
});

http.listen(PORT, () => {
  console.log(`💬 Servidor rodando em http://191.223.250.194:${PORT}`);
});
