const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;


// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Ruta principal
app.get('/', (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
 console.log(`🚀 Servidor demo corriendo en http://quelora.localhost.ar:${PORT}/`);
});