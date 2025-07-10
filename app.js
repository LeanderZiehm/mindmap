const express = require('express');
const path = require('path');
const storageRoutes = require('./routes/storage');

const app = express();
app.use(express.static(path.join(__dirname, 'src/public')));

const PORT = process.env.PORT || 3001;

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api/storage', storageRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});