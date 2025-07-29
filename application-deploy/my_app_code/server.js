const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/config', (req, res) => {
  res.json({
    databaseUser: process.env.DB_USER || 'not-set',
    databasePass: process.env.DB_PASS || 'not-set',
    apiKey: process.env.API_KEY || 'not-set'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
