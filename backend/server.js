require('dotenv').config();
const express = require('express');
const app = express();
// const path = require('path');
const connectDB = require('./models/db');
const errorMiddleware = require('./middlewares/error-middleware');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', require('./routes/auth-route'));
app.use('/api/incidents', require('./routes/incident-route'));
app.use('/api/incidents', require('./routes/incident-comment-route'));
app.use('/api/incidents', require('./routes/vote-route'));
app.use('/api/incidents', require('./routes/false-report-route'));
app.use('/api/comment', require('./routes/comment-route'));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('<h1><b>Hello, World!</b></h1>');
});

app.use(errorMiddleware);
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to the database:', err);
  process.exit(0);
});