require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT;
const cors = require('cors');

const http = require('http');
const {Server} = require('socket.io');
const server = http.createServer(app); 
const io = new Server(server); 

app.use(express.json());
app.use(express.static('public'));   
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

console.log('Judge0 API URL:', process.env.JUDGE0_API_URL);
app.post('/editor', async (req, res) => {
  const { source_code, language_id, stdin } = req.body;

  if (!source_code || !language_id) {
    return res.status(400).json({ error: 'source_code and language_id are required' });
  }

  try {
    const response = await axios.post(
      `${process.env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
      { source_code, language_id, stdin },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error communicating with Judge0 API:', error.message);
    res.status(500).json({ error: 'Failed to compile the code' });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('code-update', (data) => {
    const { roomId, content } = data;

    socket.to(roomId).emit('code-update', content);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
