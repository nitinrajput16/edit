require('dotenv').config();
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT;

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));
app.use(cors());

app.post('/save-code', (req, res) => {
  const { code, filename } = req.body;

  if (!code || !filename) {
    return res.status(400).json({ error: 'Code and filename are required' });
  }

  const filePath = path.join(__dirname, 'saved', filename);

  fs.writeFile(filePath, code, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      return res.status(500).json({ error: 'Failed to save the file' });
    }

    res.json({ message: 'File saved successfully', filePath });
  });
});

app.get('/load-code', (req, res) => {
  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const filePath = path.join(__dirname, 'saved', filename);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Failed to load the file' });
    }

    res.json({ code: data });
  });
});

app.get('/list-data', async (req, res) => {
  console.log('Request received:', req.url);
  const savedDir = path.join(__dirname, 'saved');

  try {
    await fs.promises.mkdir(savedDir, { recursive: true });
    const files = await fs.promises.readdir(savedDir);
    const fileList = [];

    for (const file of files) {
      const filePath = path.join(savedDir, file);
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile()) {
        fileList.push(file);
      }
    }

    res.json({ files: fileList });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to list files', details: err.message });
  }
});

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
