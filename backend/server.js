require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./models/db');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', require('./routes/auth-route'));

app.get('/', (req, res) => {
  res.send('<h1><b>Hello, World!</b></h1>');
});

 
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to the database:', err);
  process.exit(0);
});