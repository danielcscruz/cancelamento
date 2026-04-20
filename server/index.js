const express = require('express');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./middleware/auth');

const authRouter = require('./routes/auth');
const recordsRouter = require('./routes/records');
const generateRouter = require('./routes/generate');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/records', recordsRouter);
app.use('/api/generate', authMiddleware, generateRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
