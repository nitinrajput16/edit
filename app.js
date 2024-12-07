const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3001;
const cors = require('cors');
// const io = new Server(server, { cors: { origin: "http://localhost:8080" }})

const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app); 
const io = socketIo(server); 

require('dotenv').config();


// app.use(express.json());
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

  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle code updates
  socket.on('code-update', (data) => {
    const { roomId, content } = data;

    // Broadcast to everyone else in the room
    socket.to(roomId).emit('code-update', content);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
