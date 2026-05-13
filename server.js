const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// Initialize DB file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf-8');
}

// Helper functions for DB
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');

// ===== API ROUTES =====

// Get all dropdowns
app.get('/api/dropdowns', (req, res) => {
    try {
        const dropdowns = readDB();
        res.json(dropdowns);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Create a new dropdown
app.post('/api/dropdowns', (req, res) => {
    const { name, options } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const dropdowns = readDB();
    const COLORS = ['amber', 'teal', 'rose', 'violet', 'sky'];
    
    const newDropdown = {
        id: Date.now(),
        name,
        options: options || [],
        color: COLORS[dropdowns.length % COLORS.length]
    };

    dropdowns.push(newDropdown);
    writeDB(dropdowns);
    res.status(201).json(newDropdown);
});

// Delete a dropdown
app.delete('/api/dropdowns/:id', (req, res) => {
    let dropdowns = readDB();
    const id = parseInt(req.params.id);
    
    const initialLength = dropdowns.length;
    dropdowns = dropdowns.filter(d => d.id !== id);
    
    if (dropdowns.length === initialLength) {
        return res.status(404).json({ error: 'Dropdown not found' });
    }

    writeDB(dropdowns);
    res.json({ message: 'Dropdown deleted' });
});

// Add option to a specific dropdown
app.put('/api/dropdowns/:id/addOption', (req, res) => {
    const dropdowns = readDB();
    const id = parseInt(req.params.id);
    const { value } = req.body;

    const dd = dropdowns.find(d => d.id === id);
    if (!dd) return res.status(404).json({ error: 'Dropdown not found' });
    if (!value) return res.status(400).json({ error: 'Value is required' });
    if (dd.options.includes(value)) return res.status(400).json({ error: 'Option already exists' });

    dd.options.push(value);
    writeDB(dropdowns);
    res.json(dd);
});

// Remove option from a specific dropdown
app.put('/api/dropdowns/:id/removeOption', (req, res) => {
    const dropdowns = readDB();
    const id = parseInt(req.params.id);
    const { index } = req.body;

    const dd = dropdowns.find(d => d.id === id);
    if (!dd) return res.status(404).json({ error: 'Dropdown not found' });

    dd.options.splice(index, 1);
    writeDB(dropdowns);
    res.json(dd);
});

// Bulk add to a specific dropdown
app.put('/api/dropdowns/:id/bulkAdd', (req, res) => {
    const dropdowns = readDB();
    const id = parseInt(req.params.id);
    const { items } = req.body;

    const dd = dropdowns.find(d => d.id === id);
    if (!dd) return res.status(404).json({ error: 'Dropdown not found' });

    let count = 0;
    items.forEach(item => {
        if (!dd.options.includes(item)) {
            dd.options.push(item);
            count++;
        }
    });

    writeDB(dropdowns);
    res.json({ dropdown: dd, addedCount: count });
});

// Bulk add to ALL dropdowns
app.post('/api/dropdowns/bulkAddToAll', (req, res) => {
    const dropdowns = readDB();
    const { items } = req.body;

    if (dropdowns.length === 0) return res.status(400).json({ error: 'No dropdowns exist' });

    let total = 0;
    dropdowns.forEach(dd => {
        items.forEach(item => {
            if (!dd.options.includes(item)) {
                dd.options.push(item);
                total++;
            }
        });
    });

    writeDB(dropdowns);
    res.json({ totalAdded: total });
});

// Clear all dropdowns
app.delete('/api/dropdowns/clearAll', (req, res) => {
    writeDB([]);
    res.json({ message: 'All dropdowns cleared' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});