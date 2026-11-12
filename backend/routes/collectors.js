const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const COLLECTORS_FILE = path.join(__dirname, '../data/collectors.json');

function readCollectors() {
  try { return JSON.parse(fs.readFileSync(COLLECTORS_FILE, 'utf8')); }
  catch { return []; }
}

// GET /api/collectors
router.get('/', (req, res) => {
  let cols = readCollectors();
  const { location, type, pickup, search } = req.query;
  if (location && location !== 'all') cols = cols.filter(c => c.location === location);
  if (type && type !== 'all') cols = cols.filter(c => c.type === type);
  if (pickup === 'true') cols = cols.filter(c => c.pickupAvailable);
  if (search) {
    const q = search.toLowerCase();
    cols = cols.filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }
  res.json(cols);
});

// GET /api/collectors/:id
router.get('/:id', (req, res) => {
  const col = readCollectors().find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ error: 'Collector not found' });
  res.json(col);
});

module.exports = router;
