const express = require('express');
const http = require('http'); // ✅
const socketIO = require('socket.io'); // ✅

const app = express();
const server = http.createServer(app); // ✅ tạo server HTTP
const io = socketIO(server, {
  cors: {
    origin: '*',
  }
});

const cors = require('cors');
require('dotenv').config();
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const { setupSocket } = require('./socket'); // ✅ tạo file mới
const messageRoutes = require('./routes/message.routes');


app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/auth.html'));
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

setupSocket(io); // ✅ gọi hàm setup

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
