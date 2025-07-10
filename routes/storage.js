const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_FILE = path.join(__dirname, '../data/mindmap-data.json');

// Ensure the data directory exists
const ensureDataDirectory = () => {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Save data to JSON file
router.post('/save', express.json(), (req, res) => {
    const data = req.body;

    try {
        ensureDataDirectory();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.status(200).json({ message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Load data from JSON file
router.get('/load', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return res.status(404).json({ error: 'No saved data found' });
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        res.status(200).json(JSON.parse(data));
    } catch (error) {
        console.error('Error loading data:', error);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

module.exports = router;
